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

## Update: Home redesign + Explore screen

**Files added:**
- `src/services/matching.service.ts` — deterministic relevance scoring (primary-role match = 100pts, exact skill→role match = 40pts, partial match = 15pts, recency as tie-breaker only)
- `src/services/activity.service.ts` — real activity feed from `applications` + `project_members`, no fake data
- `src/pages/Explore.tsx` — full ranked project list, search, status filter chips

**Files changed:**
- `src/pages/Home.tsx` — redesigned: header (logo/notifications/avatar), greeting, Create Project, search, "Recommended for You" (top 3 ranked), "Your Activity" (real applications + memberships)
- `src/layouts/AppLayout.tsx` — added Explore to bottom nav (5 items now: Home, Explore, My Projects, Chats, Profile — kept My Projects since it's existing working functionality, not part of the redesign brief)
- `App.tsx` — added `/explore` route

**Not touched:** auth, Supabase client, project creation, project details, applications, chat, profile — all untouched, all still working exactly as before.

**Data freshness:** Home and Explore both re-fetch from Supabase on mount, on debounced search, and on browser tab focus — nothing is cached client-side, so new projects and profile/skill changes always show up immediately.

**Note:** No UI reference image was actually attached to that request — this was built from the detailed text spec, which was thorough enough to build from directly (matches the existing dark navy/blue theme already in the app). If you have the actual reference image, send it and I'll adjust the visual details to match exactly.

## Update: Matched to actual UI reference image

**Nav change:** Bottom nav is now exactly 4 items (Home, Explore, Chat, Profile), matching the reference. **My Projects** was removed from the bar and moved into a menu link on the Profile screen instead — still fully reachable, just relocated, since the reference didn't show a 5th nav icon.

**Visual additions:**
- `src/utils/projectVisual.ts` — deterministic per-project icon + color (hashed from project id). There's no `category`/`icon` column on `projects`, so this is a consistent visual assignment, not stored or fake data — same project always gets the same icon/color.
- `src/utils/timeAgo.ts` — relative timestamps ("2h ago", "1d ago") matching the reference.
- Bookmark icons on project cards — **session-only** (React state), not persisted. There's no `saved_projects` table, so this resets on page reload. Say the word if you want it persisted — needs one small additive table + 2 RLS policies.
- "X open positions" — real count of `project_roles_needed` rows per project (not fabricated).
- Explore's "Most Active" tab sorts by real `project_members` count (team size) — added a lightweight count to `listProjects()`.
- Explore's "Recommended" tab filters to only projects with a real match score > 0; "All Projects" stays relevance-ranked but includes everything, same as before.

**Left out (would require a fake data or schema change to do honestly):** the reference's "New message in project chat / Unread" activity type isn't included — there's no `last_read_at` tracking in the schema, so making that dot accurate would mean either fabricating it or adding a small migration. Applications + memberships in Your Activity are 100% real.
