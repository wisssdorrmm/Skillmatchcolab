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

## Update: Persisted bookmarks + Explore role filter

**Run this SQL first (Supabase → SQL Editor)** — required for bookmarks to work, safe/additive:
See `sql/002_saved_projects.sql` in this zip. Creates a `saved_projects` table with RLS policies. Doesn't touch anything existing.

**Changes:**
- `src/services/saved.service.ts` — new service for the above table
- Bookmark icons on Home + Explore now persist for real (previously session-only)
- Explore's **Filter** button now opens a real role-filter panel — select one or more roles, list narrows to matching projects, badge shows active filter count, "Clear" resets it

## Update: Fixed profile creation bug (foreign key error on signup)

`updateProfile()` in `src/services/profiles.service.ts` now uses `upsert` instead of `update`. Previously, if no database trigger existed to auto-create a `profiles` row on signup, Profile Setup would silently fail to create the profile, then error with `insert or update on table "user_skills" violates foreign key constraint "user_skills_user_id_fkey"` when trying to save skills. Upsert guarantees the row exists either way.

## Update: Decluttered card design + more padding

Feedback was the cards felt busy and the page had too little side padding. Changes:
- Outer page padding increased (px-5 → px-6)
- Card padding increased (p-4 → p-5), sharper corner radius (rounded-2xl)
- Removed the "Unknown" owner placeholder — now shows the owner's real name if available, or just the timestamp if not (rather than a meaningless label)
- Combined owner name + timestamp into one quieter line instead of two competing rows
- Reduced role chips shown on Home cards from visual noise (border-only, lighter weight)
- More breathing room between cards (gap-3 → gap-4) and inside them

## Update: Direct messaging, notifications, unread tracking, avatar policy fix

**Run `sql/003_messaging_notifications_reads.sql` in Supabase SQL Editor first** — additive only, adds:
- `direct_messages` table + RLS (either owner or applicant can start a thread, scoped per project+applicant pair)
- `notifications` table + 3 triggers (new application → owner notified; status change → applicant notified; new direct message → other party notified)
- `chat_reads` table (tracks last-read timestamp per user per project, powers unread badges)
- Avatar storage bucket + policies (run this section even if you think the bucket exists — it's safe to re-run, `on conflict do nothing`)

**New files:**
- `src/services/directMessages.service.ts`, `src/services/notifications.service.ts`, `src/services/chatReads.service.ts`
- `src/pages/ApplicantChat.tsx` — pre-acceptance 1:1 thread, either side can message first
- `src/components/NotificationBell.tsx` — real dropdown panel, live unread count, realtime updates, click-to-mark-read

**Changed:**
- `ManageApplications.tsx` — every applicant card now has a "Message" button
- `ProjectDetails.tsx` — once you've applied, a "Message" link appears next to your application status
- `Chats.tsx` — now shows unread dot on team chats (via chat_reads) + a new "Direct Messages" section listing DM threads
- `TeamChat.tsx` — marks itself read on open and on every new incoming message while you're viewing it
- `Home.tsx` / `Explore.tsx` — bell icon is now functional, not decorative

**Not done:** "new project matches your skills" notifications — would need a trigger comparing every new project against every user's skills, which doesn't scale well as triggers and is better as a scheduled job. Flagging rather than building something that'll fall over with more users.

## Update: Nav stability, Profile cleanup, legal pages, deactivation

**Fixed:**
- Bottom nav "disappearing" — was using `h-screen` (100vh, doesn't track mobile browser chrome collapsing/expanding). Switched to `h-dvh` (dynamic viewport height), which tracks the actual visible area. Also made the nav `shrink-0` so it can't get squeezed by content.
- Project Details' Apply/Withdraw bar was `fixed` and overlapping the bottom nav (both fighting for the same screen position). Changed to `sticky` so it naturally stacks in the scroll flow instead.
- Removed "Profile" from the bottom nav — reachable via the avatar in the Home/Explore header instead, per your request. **Heads up:** pages without that header (Chats, My Projects, Team Chat, etc.) currently have no direct profile shortcut — you'd navigate back to Home first. Flag it if that's annoying in practice.
- Profile page: removed the redundant inline project list (it was pulling every created+joined project into a messy stacked list). "My Projects" button is now the only project entry point.

**New — Profile Settings section:**
- Terms of Service (`/terms`) and Privacy Policy (`/privacy`) — public pages, placeholder legal text (not reviewed by a lawyer — replace before real launch)
- Deactivate Account (`/deactivate-account`) — two-step confirm (type "DELETE"), submits a request to `account_deletion_requests`, then signs out. **This does not actually delete the Supabase auth user** — that requires a service-role key, which can't run from the browser. This creates an auditable request; actual deletion needs to happen from your Supabase dashboard or a backend job.

**Migration additions** (in `sql/003_...sql`, same file as before — just run it again, it's all `if not exists`): `account_deletion_requests` table + RLS.

**Not fixed yet — needs your input:** the "applied but owner didn't see it" bug. I added `sql/diagnose_missing_applications.sql` — run those 3 queries and send me the results. My leading theory: the project was created under a different account than the one you're checking with (easy to happen while testing with multiple signups), but I don't want to guess further without seeing the actual data.

## Update: Realtime fix, "matches your skills" notifications, code splitting, profile shortcuts

**Run `sql/004_realtime_and_role_match_notifications.sql`** — this is almost certainly the actual fix for chat needing a manual refresh:

Supabase doesn't automatically stream every table's changes — each table has to be explicitly added to the `supabase_realtime` publication (usually done via Database → Replication toggle in the dashboard, easy to miss when creating tables through SQL). `messages`, `direct_messages`, and `notifications` were never added, so `postgres_changes` subscriptions in the code were correctly written but had nothing to listen to. This migration adds them.

**Also in that file:** the "notify me when a new project matches my skills" trigger you asked about — turns out this doesn't need a scheduled job after all (I was wrong earlier). It fires on `project_roles_needed` insert (which happens right after project creation), does one set-based query matching against `primary_role` and `user_skills`, and guards against duplicate notifications per project. Scales fine.

**Code splitting:** converted all routes except Login/Signup to `React.lazy()`. Bundle warning is gone — main chunk dropped from 524kb to 400kb, and every other page (Home, Explore, Chats, etc.) now loads as its own small chunk on demand instead of all being bundled upfront.

**Profile shortcuts restored:** added a small `PageHeader` component with the profile avatar to Chats and My Projects, so those pages aren't a dead end now that Profile isn't in the bottom nav.
