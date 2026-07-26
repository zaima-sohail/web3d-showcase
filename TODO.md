# Task: Fix Role Assignment ✅ COMPLETED

## Steps

- [x] **Step 1**: Fix register route — removed hardcoded `role: "admin"`, model default `"viewer"` applies
- [x] **Step 2**: Created seed-admin CLI script (`src/scripts/seed-admin.ts`)
- [x] **Step 3**: Created Users API route (`app/api/users/route.ts`) — GET list + PATCH role (admin-only)
- [x] **Step 4**: Updated Sidebar — added "👥 Users" link
- [x] **Step 5**: Created Admin Users page (`app/admin/users/page.tsx`) — table with role change modal
- [x] **Step 6**: Users API protected with `requireRole(auth, "admin")`

