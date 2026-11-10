# Daybreak

The application is deployed on Cloudflare Pages. The live link is included in the assessment submission document.

A calm, responsive Kanban workspace built with React, TypeScript, Vite, dnd-kit, and Supabase. It includes four board columns, guest authentication, task creation/editing/deletion, drag-and-drop status changes, title/description search, priority/category filters, due dates, overdue indicators, sorting, and board statistics.

## Run locally

Prerequisites: Node.js 22.12+ (tested on 24.19) and npm.

```bash
npm ci
cp .env.example .env
npm run dev
```

Open the printed local URL, normally http://127.0.0.1:5173. When both Supabase values are blank, the app explicitly runs in **local demo mode** with sample tasks. Demo changes persist in this browser's localStorage. This mode is for previewing and is not the required cloud-backed submission. Connected Supabase boards start empty; demo tasks are never silently copied to the cloud.

## Connect Supabase

1. Create a free Supabase project.
2. Run `supabase/migrations/001_tasks.sql` once in the project's SQL Editor. The migration creates the table, constraints, index, timestamp trigger, grants, and four ownership policies in one transaction.
3. Enable anonymous sign-ins in the project's Auth settings.
4. Copy the project URL and **publishable key** (or legacy public anon key) into `.env`. The existing variable name accepts either public key format:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_YOUR_PUBLIC_KEY
```

5. Restart the dev server. The header should show **Saved to cloud**, and you should see an empty board.
6. Create a task, move it, and reload to check persistence. Open an incognito window to confirm a separate guest sees a separate board.

Anonymous sign-in creates a real authenticated guest with its own user UUID. Existing sessions are reused. RLS, not a frontend filter, enforces task ownership. Policies use `auth.uid() = user_id` for reads, inserts, updates, and deletes; update grants also prevent clients from changing task IDs, ownership, or creation timestamps. The frontend only sends editable fields on updates. A configured cloud connection failure shows an error; it never falls back to demo storage.

Frontend `VITE_*` variables are embedded in the browser bundle. The publishable/public anon key is intended for this use and relies on RLS for access control. **Never put a service role key, secret key, database password, or connection string in these values or the repository.** `.env` files are ignored by Git.

Guest sessions are tied to browser storage. Clearing that storage or switching browsers creates a new workspace; there is no recovery/login flow in this version. Anonymous users are not collaborative team members.

## Development checks

```bash
npm test
npm run build
npm run preview
```

All 15 automated tests pass. The tests cover validation, immutable field stripping, combined filters, overdue logic, demo persistence, storage failures, task creation/editing/deletion, and visible save errors. The production build runs TypeScript checks.

After connecting a dedicated assessment Supabase project, run:

```bash
npm run test:cloud
```

This integration check creates two disposable guests and tasks, verifies cross-user read/update/delete restrictions, ownership spoofing prevention, unauthenticated access restrictions, and session persistence. It deletes its test tasks afterward. **Two guest authentication records remain** because deleting auth users requires administrator access; no service role key is requested. This check passed against the connected Supabase project on November 10, 2026, including guest persistence and cross-user isolation.

## Deploy

The app is a static Vite build. Use your own free Vercel, Netlify, or Cloudflare Pages account:

- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Add both Supabase environment variables in the hosting dashboard **before building**.
- Redeploy after changing environment values.

There are no client-side routes requiring rewrite rules. Set the Supabase Site URL to your final hosted URL. No separate API server, local PostgreSQL, Docker, or Supabase CLI is required for the hosted-database workflow.

## Architecture

- `src/App.tsx`: board state, actions, filters, summary, and connection/error handling.
- `src/components/`: board columns, draggable cards, native modal task editor.
- `src/lib/model.ts`: task types, editable-field validation, filtering, date logic.
- `src/lib/repository.ts`: common persistence interface with explicit demo/cloud implementations; single guest initialization.
- `src/lib/seed.ts`: demo-only sample tasks.
- `supabase/migrations/001_tasks.sql`: complete database definition.
- `scripts/check-rls.mjs`: optional live isolation verification.
- `docs/PROJECT_NOTES.md`: design rationale, limitations, and submission checklist.

## Interaction details

Drag with the grip handle. On touch screens, hold the handle briefly before moving. Open a card to edit its status using the dropdown as an alternative. Drag-and-drop moves appear immediately in the destination while storage saves them; failed moves return to their previous column and show an error. The overlay return animation is disabled so successful drops do not animate back to the source. Other edits appear after storage confirms success. Only one mutation runs at a time. Failed saves preserve the form. The task editor traps focus using a native modal dialog, returns focus on close, and asks before discarding unsaved changes. Deletion requires an explicit second action in the editor.

Filtering does not change task data; a task moved to a different status retains its priority, category, and due date. Cards are sorted within their columns; custom ordering within a column is not implemented. The desktop board shows four columns. Smaller screens scroll the board horizontally while keeping page controls accessible.

## References

- [Supabase anonymous authentication](https://supabase.com/docs/guides/auth/auth-anonymous)
- [Supabase row level security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Vite](https://vite.dev/guide/)
- [dnd-kit](https://docs.dndkit.com/)
