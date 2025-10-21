## Quick orientation — RouteIQ (Next.js + Composio stubs)

This repository is a Next.js app (app router) that demonstrates a lead-to-revenue UI powered by a Composio tool router. The UI is in `src/app/*`; light API logic and demo data live under `src/app/api` and `src/lib`.

Be pragmatic: most server-side code is demo/stubbed to simplify local dev. When making changes, preserve the existing stubs and callsites so reviewers can map to real integrations.

Key places to look
- UI / routing: `src/app/layout.tsx`, `src/app/page.tsx`, and `src/app/*` pages (e.g. `leads`, `activity`, `chat`).
- Demo API / state: `src/app/api/_store.ts` (in-memory store used by API routes).
- Composio integration points / stubs: `src/lib/composio.ts` (stubbed client) and `src/lib/composioClient.ts` (real client wiring placeholder).
- Types: `src/lib/types.ts` (data shapes for Lead, Activity, Email).

Big-picture architecture
- Next.js (app router) serves the React UI and exports small API route modules that interact with an in-memory store for demo purposes.
- Business logic expects a Composio-style SDK (tool router) to provide CRM, email, slack, and billing toolkits. The `Composio` object in `src/lib/composio.ts` contains the app-facing helpers; real implementations are provided via `getRealComposio()` in `src/lib/composioClient.ts`.

Common tasks & developer workflows
- Start dev server: `npm run dev` (root `package.json` uses `next dev`).
- Build: `npm run build` then `npm start` for production-like server.
- Lint: `npm run lint` (uses `eslint`).
- The API uses an in-memory store that resets on server restart — persistence changes must update `src/app/api/_store.ts` and any API routes that assume in-memory behavior.

Project-specific patterns & conventions
- Stubbing first: many server-side functions intentionally throw when a real Composio toolkit isn't configured. See `src/lib/composio.ts` — prefer keeping the shape of the returned `Activity` objects consistent (id, type, leadId, message, timestamp, status, meta).
- Prefer using the `Composio` wrapper exported in `src/lib/composio.ts` from API routes and UI server components. This keeps production wiring isolated to `composioClient.ts` and `getComposio()`.
- Cookie-driven role switching: `src/app/layout.tsx` reads a `role` cookie and passes it into `RoleSwitcher` (`src/components/RoleSwitcher.tsx`) — follow this when adding role-aware UI.

Integration points & external dependencies
- Composio SDK: `@composio/core` is listed in `package.json` and referenced in `src/lib/composio.ts` and `src/lib/composioClient.ts`. Local dev will run without a COMPOSIO_API_KEY but production features rely on that env var.
- Replace in-memory store with DB: API routes expect synchronous store functions exported from `_store.ts` — keep that module as the single source of truth when migrating persistence.

Examples (what to change for a small feature)
- To implement “resend follow-up” using a real email provider:
  - Add provider wiring in `src/lib/composioClient.ts` to return an object with `email.sendIntro` / `email.resend`.
  - Update `src/lib/composio.ts` to call the real provider (it already attempts to call `real.email.sendIntro`).
  - Ensure the API route that triggers resend (look under `src/app/api/*`) returns the same `Activity` shape produced by the stub.

What NOT to change
- Do not remove the `src/lib/composio.ts` wrapper or change the `Activity`/`Lead` shape without updating `src/lib/types.ts` and all API routes.
- Don’t replace the in-memory store with an async DB without updating API consumers — the app assumes immediate synchronous returns for demo flows.

Quick references
- Start dev: `npm run dev`
- Important files: `src/app/api/_store.ts`, `src/lib/composio.ts`, `src/lib/composioClient.ts`, `src/lib/types.ts`, `src/app/layout.tsx`.

If anything here is unclear or you want more automation (tests, CI, or a migration path from the in-memory store to a DB), tell me which area to expand and I’ll update this document.
