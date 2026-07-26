/**
 * seed-admin.ts
 *
 * CLI script to create or promote a user to admin role.
 *
 * Usage:
 *   npx tsx src/scripts/seed-admin.ts --email admin@example.com --password securePass123 --name "Admin User"
 *
 * If the email already exists, it upgrades that user's role to "admin".
 * If not, it creates a brand-new admin user.
 *
 * Flags:
 *   --email     (required) Email of the admin user
 *   --password  (required if creating a new user; optional if updating existing)
 *   --name      (optional) Display name (default: "Admin")
 */

import mongoose from "mongoose";
import { hashPassword } from "../lib/hash";
import { readFileSync } from "fs";
import { resolve } from "path";

// ── Load .env.local manually ──────────────────────────
function loadEnv() {
  try {
    const envPath = resolve(__dirname, "../../.env.local");
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // .env.local is optional if env vars are already set
  }
}
loadEnv();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is not set in .env.local");
  process.exit(1);
}

// ── Inline User schema (avoid importing full app models) ──
const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "editor", "viewer"],
      default: "viewer",
    },
  },
  { timestamps: true }
);

const User =
  mongoose.models.User || mongoose.model("User", UserSchema);

// ── Parse CLI args ────────────────────────────────────
function parseArgs(): {
  email: string;
  password: string | null;
  name: string;
} {
  const args = process.argv.slice(2);
  const get = (flag: string): string | undefined => {
    const idx = args.indexOf(flag);
    return idx >= 0 ? args[idx + 1] : undefined;
  };

  const email = get("--email");
  const password = get("--password") ?? null;
  const name = get("--name") ?? "Admin";

  if (!email) {
    console.error("");
    console.error("❌ Missing required flag: --email");
    console.error("");
    console.error("Usage:");
    console.error("  npx tsx src/scripts/seed-admin.ts --email <email> [--password <pass>] [--name <name>]");
    console.error("");
    process.exit(1);
    // TypeScript needs unreachable return
    return { email: "", password: null, name: "" };
  }

  return { email, password, name };
}

// ── Main ──────────────────────────────────────────────
async function main() {
  const { email, password, name } = parseArgs();

  // Connect to MongoDB
  console.log(`🔌 Connecting to MongoDB...`);
  await mongoose.connect(MONGODB_URI!, { dbName: "web3dshowcase" });
  console.log(`✅ Connected to MongoDB\n`);

  const existing = await User.findOne({ email });

  if (existing) {
    // ── Upgrade existing user ──────────────────────────
    if (existing.role === "admin") {
      console.log(`ℹ️  User "${email}" is already an admin — nothing to do.`);
    } else {
      existing.role = "admin";
      await existing.save();
      console.log(
        `✅ User "${email}" (${existing.name}) has been **promoted** to admin.`
      );
    }
  } else {
    // ── Create new admin user ──────────────────────────
    if (!password) {
      console.error(
        "❌ --password is required when creating a new user."
      );
      process.exit(1);
    }

    const hashedPassword = await hashPassword(password);

    await User.create({
      name,
      email,
      password: hashedPassword,
      role: "admin",
    });

    console.log(`✅ Admin user created:`);
    console.log(`   Name:  ${name}`);
    console.log(`   Email: ${email}`);
    console.log(`   Role:  admin`);
  }

  await mongoose.disconnect();
  console.log(`\n🔌 Disconnected. Done.`);
}

main().catch((err) => {
  console.error("❌ Seed script failed:", err);
  process.exit(1);
});

