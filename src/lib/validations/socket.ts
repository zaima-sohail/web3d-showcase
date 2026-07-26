import type { Server as SocketIOServer } from "socket.io";

export interface JobProgressPayload {
  jobId: string;
  fileName: string;
  type: "IMAGE_PROCESSING" | "MODEL_OPTIMIZATION";
  status: "QUEUED" | "PROCESSING" | "DONE" | "FAILED";
  progress: number;
  errorMsg?: string;
}

export interface ActivityPayload {
  kind: "PUBLISHED" | "VIEWED" | "ITEM_CREATED" | "ITEM_DELETED";
  itemId: string;
  itemName: string;
  at: string;
}

function getIO(): SocketIOServer | undefined {
  return (globalThis as unknown as { __io?: SocketIOServer }).__io;
}

/** Broadcasts an upload/processing job's live progress to the admin dashboard room. */
export function emitJobProgress(payload: JobProgressPayload): void {
  const io = getIO();
  if (!io) {
    console.warn("[socket] emitJobProgress called but Socket.IO server is not initialized yet");
    return;
  }
  io.to("admin-dashboard").emit("job:progress", payload);
}

/** Broadcasts a recently-published or recently-viewed item to the admin activity pulse. */
export function emitActivity(payload: ActivityPayload): void {
  const io = getIO();
  if (!io) {
    console.warn("[socket] emitActivity called but Socket.IO server is not initialized yet");
    return;
  }
  io.to("admin-dashboard").emit("activity:new", payload);
}
