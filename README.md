# Cobuild

**Build together. Ship faster.** Builders find teammates, post a project with a roadmap, tick off steps to fill their progress bar, contribute to open source, chat in a community, and apply for funding.

React 19 + TypeScript + Vite + Tailwind v4 + Supabase (Postgres, Auth, Realtime, Storage).

## Run it locally

```bash
npm install
npm run dev        # http://localhost:5173
```

`.env` needs your Supabase project:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

## Set up the database (one file)

Open Supabase → **SQL Editor**, paste all of [`sql/full_setup.sql`](sql/full_setup.sql) and press **Run**.

- Works on the existing SkillMatch database and on a brand-new Supabase project.
- Safe to run again later — it only adds what's missing and refreshes the GitHub projects.
- On its **first** run it deletes all old projects (and their applications/chats), then imports 272 real open-source projects that are asking for contributors. A marker row (`cb_migrations`) stops that reset from ever running twice.
- `wisdomudoudo24@gmail.com` becomes an admin — right away if that account exists, otherwise the moment it signs up. Add more admin emails to `admin_bootstrap_emails`, or add admins from **Admin → Admins** in the app.

## What's inside

| Area | What it does |
| --- | --- |
| Onboarding | 6 quick steps: name + username, role, experience, skills, goals, country/availability/referral. Answers feed Admin → Insights. |
| Projects | Create with a roadmap whose steps must add up to exactly 100%. Owners and teammates tick steps; the progress bar moves (live). Apply, accept, team chat, hype, save, share. |
| Open source | Imported GitHub repos with good-first-issue / help-wanted labels, linking straight to their contribute page. Admins can import more from **Admin → Import projects**. |
| Community | Rooms (#introductions, #show-your-build, #find-a-team…), likes, replies, admin-only #announcements, people directory, direct messages. |
| Stickiness | XP + levels, daily streaks, achievements, top-builders leaderboard (week/month/all), "Just shipped" feed, notifications for hypes, replies, shipped steps, applications and funding. |
| Funding | Apply in-app (tracked statuses + reviewer notes) and browse external grant / credit programs. |
| Admin | Overview (members, online now, DAU/WAU/MAU, growth + activity charts), live activity, members with emails and onboarding answers, add/remove admins, insights, projects (feature/delete), GitHub importer, funding review + programs, community moderation, broadcast to everyone. |

Layout: fixed left menu on desktop with a right-hand highlights column; on phones a bottom tab bar (Community in the middle) and a floating **+** button to create a project.

## How the rules are enforced

Everything important is checked in the database, not just the UI:

- Roadmap weights are validated server-side (`create_project` / `update_project`) and can never exceed 100%.
- `projects.progress` is recalculated by a trigger from finished steps; owners can't edit it directly.
- Only the owner, teammates or an admin can tick steps (`set_milestone_done`).
- Admin functions all start with an admin check; admin status lives in `app_admins`, which users can't write to.
- Funding applications always start as "submitted" — applicants can't approve themselves.
- XP and streaks are computed from real activity (`get_leaderboard`, `get_user_stats`).

## Project structure

```
src/
  config/brand.ts        product name + tagline (change once, updates everywhere)
  components/            ui kit, layout (sidebar, mobile nav, right rail), chat, project, admin charts
  context/               auth (+ admin flag), live unread counts
  hooks/                 data loading, presence heartbeat, saved projects
  lib/                   formatting, constants, roadmap helpers, error messages
  pages/                 app screens; pages/admin/ for the admin panel
  services/              all Supabase calls, one file per area
sql/full_setup.sql       the whole database in one script
api/validate-email-domain.ts   Vercel function: rejects email domains with no mail server
```

## Deploy

Push to the GitHub repo connected to Vercel. `vercel.json` handles SPA routing, security headers and the CSP (Supabase + GitHub API allowed). Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel → Project → Environment Variables.

Before a public launch: replace the placeholder Terms/Privacy text, and consider enabling CAPTCHA and leaked-password protection in Supabase → Auth.
