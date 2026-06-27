# Dr. Token System

Hospital token system with 3 entities: **hospitals** (`clinics`), **staff** (`profiles`), **patients** (`queue`).

## Stack

- **Next.js 16** (`app/`) — App Router, TypeScript, Tailwind CSS v4
- **UI** — [COSS](https://coss.com/ui) components via `npx shadcn@latest add @coss/<component>`
- **Backend** — Supabase project `gzkuhkwlooostlqcndpj` (ap-southeast-1)
- **Design** — `../DESIGN.md` (Vercel-inspired tokens, reference for colors/typography/spacing)

## Commands (all in `app/`)

| Command | What |
|---|---|
| `npm run dev` | Dev server (http://localhost:3000) |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm test` | Run all tests |

## Conventions

- **Commits**: Conventional Commits (`feat:`, `fix:`, `chore:`, `test:`, etc.). Commit after every passing test.
- **Testing**: At least 10 tests per feature, 9 must pass before proceeding. Unit + app tests. Install Vitest or Playwright as needed.
- **Supabase MCP**: Before schema changes, `nuke existing data` via Supabase MCP tools. Use `subtabase execute_sql` for data resets.
- **COSS UI**: Install via `npx shadcn@latest add @coss/<component>` (e.g., `@coss/button`, `@coss/dialog`, `@coss/form`). Bootstrap with `npx shadcn@latest add @coss/ui` or `@coss/style`.
- **Path alias**: `@/*` maps to `src/*`
- **Design**: Use tokens from `../DESIGN.md` (colors prefixed `--color-*`, fonts `--font-sans`/`--font-mono`)

## Supabase Schema

- `clinics` — hospitals (id, name, address, phone, is_active, is_opd_open, created_at)
- `profiles` — staff (id -> auth.users, clinic_id, role: admin|clinic_user, created_at)
- `queue` — patients/tokens (id, clinic_id, token_number, patient_name, phone, status: waiting|serving|completed|skipped, created_at, called_at, completed_at)

### Queue notes
- Token numbers auto-increment per clinic per day (reset to 1 daily)
- No unique constraint on `(clinic_id, token_number)` — tokens reset daily
- Old queue entries remain in the DB for reference
- Realtime enabled via `supabase_realtime` publication on `queue` + `clinics` tables
- Frontend uses `supabase.channel()` subscriptions instead of polling

### Key frontend features
- **Real-time updates**: Supabase Realtime channel subscription (no polling)
- **Global search**: Filters by patient name, phone, token number
- **Status filters**: All / Waiting / Serving / Completed / Skipped pill toggles
- **Sort controls**: By token number, time, or name — toggle asc/desc
- **Row limit**: Shows 10 entries by default with "Show all" expand


