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

## Set up the database

Open Supabase → **SQL Editor** and run these files in order (paste each whole file, press **Run**):

1. [`sql/full_setup.sql`](sql/full_setup.sql) — every table, rule and function, plus 272 open-source projects.
2. [`sql/002_more_projects.sql`](sql/002_more_projects.sql) — adds non-developer roles and the first 350 extra projects.
3. [`sql/003_more_projects_part2.sql`](sql/003_more_projects_part2.sql) — the other 350.

- Works on the existing SkillMatch database and on a brand-new Supabase project.
- Safe to run again later — it only adds what's missing, refreshes imported projects and never removes roles.
- On its **first** run `full_setup.sql` deletes all old projects (and their applications/chats). A marker row (`cb_migrations`) stops that reset from ever running twice.
- `wisdomudoudo24@gmail.com` becomes an admin — right away if that account exists, otherwise the moment it signs up. Add more admin emails to `admin_bootstrap_emails`, or add admins from **Admin → Admins** in the app.

### Where the imported projects come from

About 920 real projects that are publicly asking for help, in every field — not just code:

- **GitHub task labels** — open, beginner-friendly tasks labelled for design/UX, docs, writing, translation, marketing, community, QA/testing, user research, accessibility and data. Ambiguous labels (plain "design", "testing", "video") were left out so roles stay accurate. Each project links straight to those open tasks.
- **[Up For Grabs](https://up-for-grabs.net)** — a curated list of projects with tasks set aside for newcomers (active, 15+ stars).
- **[Open Source Design jobs](https://opensourcedesign.net/jobs/)** — design requests (logos, branding, UX) that were still open in 2026.
- **GitHub repo search** — popular active repos with good-first-issue and help-wanted tasks (the original 272).

Admins can pull more any time from **Admin → Import projects** — pick a field (designers, writers, translators, marketing, testers…) or a language and import with one click.

## What's inside

| Area | What it does |
| --- | --- |
| Onboarding | 6 quick steps: name + username, role (developers, designers, marketers, writers, translators, testers, researchers, founders…), experience, skills, goals, country/availability/referral. Answers feed Admin → Insights. |
| Projects | Create with a roadmap whose steps must add up to exactly 100%. Owners and teammates tick steps; the progress bar moves (live). Apply, accept, team chat, hype, save, share. |
| Open source & open calls | ~920 real projects asking for developers, designers, writers, translators, marketers, testers and researchers, each linking straight to its open tasks. Explore has a **Looking for** filter by field. |
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
sql/                     full_setup.sql (database) + 002/003 (more projects across every field)
api/validate-email-domain.ts   Vercel function: rejects email domains with no mail server
```

## Deploy

Push to the GitHub repo connected to Vercel. `vercel.json` handles SPA routing, security headers and the CSP (Supabase + GitHub API allowed). Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel → Project → Environment Variables.

Before a public launch: replace the placeholder Terms/Privacy text, and consider enabling CAPTCHA and leaked-password protection in Supabase → Auth.
