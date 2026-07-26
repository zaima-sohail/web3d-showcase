# Khizex Web3D Model Showcase

An interactive Web3D product/model showcase — a public photo + 3D gallery on the front end, and an admin panel with a live upload/processing dashboard on the back end. Built for the Khizex Full-Stack Internship Week 3 assignment.
<img width="1918" height="995" alt="image" src="https://github.com/user-attachments/assets/60f83349-1bd4-4ab5-9fef-0acc9f2e14e8" />

<img width="1914" height="989" alt="image" src="https://github.com/user-attachments/assets/001a17a3-c9d6-4b09-a886-c277626a2220" />





## 1. Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) — frontend + backend API routes in one codebase |
| Database | MongoDB via Mongoose |
| Auth | JWT (httpOnly cookie, with `Authorization: Bearer` fallback for API clients), bcrypt password hashing |
| Validation | Zod (all request bodies/query params) |
| Real-time | Socket.IO, attached to a custom Node HTTP server |
| Image processing | `sharp` (responsive WebP thumbnails) |
| File-content validation | `file-type` (images) + manual glTF-Binary header check (`.glb` models) |
| Language | Strict TypeScript throughout (`"strict": true`, no `any`) |
|cloudinary| 



## 2. Setup


```bash
npm install
```

Create a `.env.local` in the project root (never commit this file):

```env
MONGODB_URI=
JWT_SECRET=
CORS_ORIGIN=http://localhost:3000
PORT=3000
MAX_IMAGE_SIZE_MB=15
MAX_MODEL_SIZE_MB=80
```

Run the dev server:

```bash
npm run dev
```

This starts a **custom server** (`server.ts`) that boots Next.js and attaches a Socket.IO server to the same HTTP server. Plain `next dev` cannot host a persistent WebSocket connection on its own, since App Router route handlers are stateless request/response functions — the live admin dashboard needs a long-lived connection, hence the custom server.

## 3. Architecture Overview

```
app/                    → Next.js App Router pages + API route handlers
  api/
    auth/{register,login,logout,me}/route.ts
    categories/route.ts
    items/route.ts, items/[slug]/route.ts
    items/[itemId]/photos/route.ts   → bulk photo upload
    items/[itemId]/model/route.ts    → .glb model upload
    photos/[photoId]/route.ts        → delete photo
    models/[modelId]/route.ts        → delete model
src/
  lib/
    mongodb.ts          → DB connection singleton
    jwt.ts               → sign/verify JWT
    hash.ts              → bcrypt helpers
    authGuard.ts          → getAuthUser / requireAuth / requireRole (RBAC gate)
    apiError.ts           → maps thrown errors to consistent JSON responses
    fileValidation.ts     → real file-content checks (never trusts extension/MIME alone)
    storage.ts             → local-disk storage paths (swap for S3/R2 in production)
    socket.ts               → emitJobProgress / emitActivity — broadcasts to the live dashboard
    validations/            → Zod schemas per resource
  models/                    → Mongoose schemas: User, Category, Item, Photo, Model3D, UploadJob
  services/                   → business logic: photoUpload.service.ts, modelUpload.service.ts
server.ts                      → custom Next.js + Socket.IO entry point (replaces `next dev`)
```

Every route handler follows the same shape: `requireAuth(req)` / `requireRole(...)` where the endpoint is protected → validate the body with Zod → touch the database → optionally `emitActivity()` / `emitJobProgress()` → return a consistent `{ success, ... }` JSON response. Errors are never left as bare 500s — `handleApiError` maps `AuthError` → 401/403, `ZodError` → 400 with field-level detail, anything else → 500 with a generic client message and a server-side logged stack trace.

## 4. Role-Based Authorization

Every write endpoint calls `requireAuth(req)` — which verifies the JWT from the httpOnly cookie or an `Authorization: Bearer` header — followed by `requireRole(user, ...allowedRoles)`. No route ever trusts a client-supplied `userId` or `role`; both are re-derived server-side from the verified token on every request, and `/api/auth/me` re-reads the role from the database (not just the token) so a demoted or deleted account loses access immediately.

| Endpoint | Method | Auth | Allowed roles |
|---|---|---|---|
| `/api/auth/register` | POST | No | — |
| `/api/auth/login` | POST | No | — |
| `/api/auth/logout` | POST | No | — |
| `/api/auth/me` | GET | Yes | any logged-in user |
| `/api/categories` | GET | No | — (public) |
| `/api/categories` | POST | Yes | `admin`, `editor` |
| `/api/items` | GET | No | — (public, only `status: published`, paginated) |
| `/api/items` | POST | Yes | `admin`, `editor` |
| `/api/items/[slug]` | GET | No | — (public, only published; increments view count) |
| `/api/items/[slug]` | PATCH | Yes | `admin`, `editor` |
| `/api/items/[slug]` | DELETE | Yes | `admin` only |
| `/api/items/[itemId]/photos` | POST | Yes | `admin`, `editor` |
| `/api/photos/[photoId]` | DELETE | Yes | `admin`, `editor` |
| `/api/items/[itemId]/model` | POST | Yes | `admin`, `editor` |
| `/api/models/[modelId]` | DELETE | Yes | `admin`, `editor` |

## 5. Asset Upload Pipeline

**Photos** (`/api/items/[itemId]/photos`, multipart form field `photos`, multiple files):
1. Real file-content validation via `file-type` (magic bytes) — a renamed `.exe` claiming to be a `.jpg` is rejected, regardless of what extension/MIME the client sends.
2. `sharp` generates three responsive WebP sizes (320 / 800 / 1600px) so the public gallery never ships an oversized original to a phone.
3. Each upload is tracked as an `UploadJob` document, keyed by a client-generated **idempotency key** (`${itemId}:${fileName}:${fileSize}`) — a retried/duplicated request updates the existing job instead of creating a duplicate `Photo`.
4. Progress is broadcast at each thumbnail step via `emitJobProgress` (Socket.IO event `job:progress`) so the admin dashboard updates live without polling.
5. Deleting a photo removes the Mongo document **and** every stored size variant from disk — no orphaned files.

**3D models** (`/api/items/[itemId]/model`, multipart field `model`):
1. Structural validation reads the raw GLB header bytes (magic number `glTF`, binary format version, declared length vs. actual file size) — this catches a corrupt or fake `.glb` that a naive extension check would miss.
2. Same idempotency-key + `UploadJob` + live-progress pattern as photos.
3. Stored under `/public/uploads/models`, served directly by Next.js. **Not yet Draco/Meshopt-compressed** — see tradeoffs below.

**Storage note:** files are currently written to local disk under `public/uploads/` for demo simplicity (Next.js serves them directly, no extra static route needed). In a production deployment this should be swapped for signed direct-to-S3/R2 uploads, with the returned CDN URL stored on the `Photo`/`Model3D` document instead of a local path — the service functions in `src/services/` are structured so only the "write bytes" step needs to change.

## 6. Live Admin Dashboard (Socket.IO)

Client connects with the current JWT as the handshake auth token:

```typescript
import { io } from "socket.io-client";

const socket = io({ path: "/ws", auth: { token: accessToken } });
socket.on("activity:new", (payload) => { /* update activity feed */ });
socket.on("job:progress", (payload) => { /* update upload progress bar */ });




The server (`server.ts`) rejects the connection unless the token is valid and the role is `admin` or `editor` — enforced in `io.use()` middleware, not left to the client.

| Event | Fired when | Payload |
|---|---|---|
| `activity:new` | Item created / published / viewed / deleted | `{ kind, itemId, itemName, at }` |
| `job:progress` | Photo or model upload progresses through validation → processing → done/failed | `{ jobId, fileName, type, status, progress, errorMsg? }` |

## 7. Data Model Summary

- **User** — `name, email, password (bcrypt-hashed), role (admin/editor/viewer)`
- **Category** — `name, slug`
- **Item** — `name, slug, description, status (draft/published/archived), category (ref), tags[], viewCount, coverPhoto (ref)`; indexed on `{status, createdAt}` and text-indexed on `name` for search
- **Photo** — `item (ref), storageKey, url, thumbUrl, width, height, order, isCover`
- **Model3D** — `item (ref), storageKey, url, sizeBytes, compressed`
- **UploadJob** — `item (ref), type, status, progress, fileName, errorMsg, idempotencyKey (unique)` — this collection is what makes the live dashboard and idempotency guarantee possible

## 8. Tradeoffs & What I'd Improve With More Time

- Model compression (Draco/Meshopt geometry, KTX2 textures) is designed for but not wired into the upload pipeline yet — models are stored as-uploaded.
- Local-disk storage under `public/uploads/` is fine for this assignment's scope but should move to S3/R2 with signed upload URLs before any real production use.
- No persisted job history pruning yet — `UploadJob` documents accumulate; a TTL index or periodic cleanup would be the next addition.
- The public gallery/lightbox UI and the admin dashboard's live-feed UI are the next layer to build on top of these APIs and socket events.
- Refresh-token rotation and rate limiting on `/api/auth/login` and the upload endpoints are designed in principle but not all enforced yet at every route.

```<img width="1915" height="1002" alt="image" src="https://github.com/user-attachments/assets/2f46833c-d590-4308-b42b-30e5c0eaef0c" />

<img width="1917" height="1047" alt="image" src="https://github.com/user-attachments/assets/ae839d0e-718c-4124-8e36-daf61ee7a1a0" />
## 9. Deployment
- Repository: https://github.com/zaima-sohail/web3d-showcase
