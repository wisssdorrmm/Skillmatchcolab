# SkillMatch Hub

React + TypeScript + Vite + Tailwind v4 + Supabase.

## Setup
```
npm install --legacy-peer-deps
npm run dev
```

`.env` is already populated with your Supabase URL + anon key (gitignored).

## Status — Full MVP built
All 12 screens are functional and wired to Supabase:

- **Login / Signup / Forgot Password** — Supabase Auth, session persistence
- **Profile Setup** — name, role, bio, goal, skills picker (writes to user_skills)
- **Home / Discover** — search-as-you-type, project cards with owner + roles
- **Create Project** — title, description, status, dynamic role tags → projects + project_roles_needed
- **Project Details** — apply / withdraw / view status; owner sees "Manage Applicants"; shows current team
- **My Projects** — Created by me / Joined tabs
- **Manage Applications** — accept (promotes to project_members) / decline, pending vs decided sections
- **Chats** — list of project threads with last-message preview
- **Team Chat** — realtime messages via Supabase Realtime, auto-scroll
- **Profile** — view + inline edit (name, role, bio, goal, skills), sign out

## Architecture
- `src/services/` — one file per table, all Supabase calls live here
- `src/context/AuthContext.tsx` — session + profile state
- `src/components/ProtectedRoute.tsx` / `RequireProfile.tsx` — route guards
- `src/types/database.ts` — schema types

## Known simplifications (v2 candidates)
- Avatar upload not wired to the `avatars` storage bucket yet — profile avatar shows an initial instead of a photo
- Skills-to-role matching is free-text (`project_roles_needed.role_name`), not FK'd to `skills` — matches your existing schema, noted in Phase 1 analysis
- Chat thread list fetches last message per-project sequentially — fine at current scale, worth a view/RPC if project count grows large
