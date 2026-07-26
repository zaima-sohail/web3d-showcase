import mongoose, { Mongoose } from "mongoose";
import { exec } from "child_process";
import { promisify } from "util";

// Eagerly register all Mongoose models to prevent MissingSchemaError on populate
import "@/src/models/index";

const execAsync = promisify(exec);

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("Please define MONGODB_URI in .env.local");
}

interface MongooseCache {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

const cached: MongooseCache = globalThis.mongoose ?? { conn: null, promise: null };

globalThis.mongoose = cached;

interface SrvRecord {
  name: string;
  port: number;
}

/**
 * Build a standard `mongodb://` URI from a `mongodb+srv://` URI
 * using resolved shard host:port pairs. Avoids duplicate query params.
 */
function buildStandardUri(srvUri: string, hostPorts: string[]): string {
  const url = new URL(srvUri.replace("mongodb+srv://", "http://"));
  const base = `mongodb://${url.username}:${url.password}@${hostPorts.join(",")}${url.pathname}`;
  const existingQs = url.searchParams;

  if (!existingQs.has("ssl")) existingQs.set("ssl", "true");
  if (!existingQs.has("authSource")) existingQs.set("authSource", "admin");
  if (!existingQs.has("retryWrites")) existingQs.set("retryWrites", "true");
  if (!existingQs.has("w")) existingQs.set("w", "majority");

  return `${base}?${existingQs.toString()}`;
}

/**
 * Resolve SRV records via shell nslookup (Windows) or dig (Unix).
 * This bypasses Node.js DNS restrictions in restrictive networks.
 */
async function resolveSrvShell(hostname: string): Promise<SrvRecord[]> {
  const isWin = process.platform === "win32";

  if (isWin) {
    const { stdout } = await execAsync(
      `nslookup -type=SRV _mongodb._tcp.${hostname} 8.8.8.8`
    );
    const records: SrvRecord[] = [];
    const lines = stdout.split("\n");
    let currentName = "";

    for (const line of lines) {
      const nameMatch = line.match(/svr hostname\s*=\s*(.+)/);
      if (nameMatch) currentName = nameMatch[1].trim().toLowerCase();

      const portMatch = line.match(/port\s*=\s*(\d+)/);
      if (portMatch && currentName) {
        records.push({ name: currentName, port: parseInt(portMatch[1], 10) });
        currentName = "";
      }
    }

    if (records.length === 0) throw new Error("No SRV records found from nslookup");
    return records;
  } else {
    const { stdout } = await execAsync(
      `dig +short SRV _mongodb._tcp.${hostname} @8.8.8.8`
    );
    const lines = stdout.trim().split("\n").filter(Boolean);
    const records: SrvRecord[] = lines.map((line) => {
      const parts = line.trim().split(/\s+/);
      return {
        name: (parts[3] ?? "").replace(/\.$/, "").toLowerCase(),
        port: parseInt(parts[2], 10),
      };
    });

    if (records.length === 0) throw new Error("No SRV records found from dig");
    return records;
  }
}

export async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    // ⚡ Set promise synchronously BEFORE any await to prevent race conditions
    // where concurrent requests both enter this block and call mongoose.connect()
    // with different URIs (SRV resolution can produce different host orderings).
    cached.promise = (async (): Promise<Mongoose> => {
      let uri: string;

      if (MONGODB_URI!.startsWith("mongodb+srv://")) {
        // Extract hostname from the connection string
        const hostname = MONGODB_URI!.split("@")[1]?.split("/")[0]?.split("?")[0] ?? "";

        try {
          // Strategy 1: Node.js built-in DNS module
          const { promises: dns } = await import("dns");
          const records = await dns.resolveSrv(`_mongodb._tcp.${hostname}`);
          const hosts = records.map((r) => `${r.name}:${r.port}`);
          uri = buildStandardUri(MONGODB_URI!, hosts);
          console.log("🔍 SRV resolved via Node.js DNS module");
        } catch {
          try {
            // Strategy 2: Shell out to nslookup / dig
            console.warn("⚠️ Node.js DNS failed, trying shell fallback...");
            const records = await resolveSrvShell(hostname);
            const hosts = records.map((r) => `${r.name}:${r.port}`);
            uri = buildStandardUri(MONGODB_URI!, hosts);
            console.log("🔍 SRV resolved via shell fallback");
          } catch {
            // Strategy 3: Last resort — direct TCP connect to base hostname
            console.warn("⚠️ All SRV methods failed, using direct connect fallback...");
            const url = new URL(MONGODB_URI!.replace("mongodb+srv://", "http://"));
            uri = `mongodb://${url.username}:${url.password}@${hostname}:27017${url.pathname}`;
            const qs = url.searchParams;
            if (!qs.has("ssl")) qs.set("ssl", "true");
            if (!qs.has("authSource")) qs.set("authSource", "admin");
            if (!qs.has("retryWrites")) qs.set("retryWrites", "true");
            if (!qs.has("w")) qs.set("w", "majority");
            uri += "?" + qs.toString();
            console.log("🔍 Using direct connect fallback");
          }
        }
      } else {
        uri = MONGODB_URI!;
      }

      return mongoose.connect(uri, {
        dbName: "web3dshowcase",
        serverSelectionTimeoutMS: 15000,
      });
    })();
  }

  cached.conn = await cached.promise;
  console.log("✅ MongoDB Connected");
  return cached.conn;
}

