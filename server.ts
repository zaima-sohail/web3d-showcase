import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT ?? 3000);

const app = next({ dev });
const handle = app.getRequestHandler();

interface TokenPayload {
  userId: string;
  role: string;
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url ?? "", true);
    handle(req, res, parsedUrl);
  });

  const io = new SocketIOServer(httpServer, {
    path: "/ws",
    cors: {
      origin: process.env.CORS_ORIGIN ?? `http://localhost:${port}`,
      credentials: true,
    },
  });

  // Only logged-in admin/editor accounts may join the live dashboard feed.
  // Verified server-side against the same JWT_SECRET used everywhere else —
  // never trust a client-claimed role.
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return next(new Error("Unauthorized"));

      const payload = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
      if (payload.role !== "admin" && payload.role !== "editor") {
        return next(new Error("Forbidden"));
      }
      socket.data.user = payload;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.join("admin-dashboard");
    console.log(`[socket] admin dashboard client connected: ${socket.id}`);

    socket.on("disconnect", () => {
      console.log(`[socket] client disconnected: ${socket.id}`);
    });
  });

  // Expose the io instance so API route handlers running in this same
  // process can emit events (see src/lib/socket.ts).
  (globalThis as unknown as { __io?: SocketIOServer }).__io = io;

  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
    console.log(`> Socket.IO live dashboard listening on path /ws`);
  });
});
