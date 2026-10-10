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
4. [`sql/004_privacy_lockdown.sql`](sql/004_privacy_lockdown.sql) — removes old "anyone can read" rules so profiles and projects are members-only.
5. [`sql/005_verified_and_cobuild.sql`](sql/005_verified_and_cobuild.sql) — verified badges (admins give them in **Admin → Members**) and the Cobuild project itself.
6. [`sql/006_official_account.sql`](sql/006_official_account.sql) — the official **Cobuild** account welcomes every new member in #general (tagging them), and @mentions notify people.
7. [`sql/007_hackathons_and_security.sql`](sql/007_hackathons_and_security.sql) — the Hackathons section (126 open hackathons) and the security hardening described under [Security](#security). It ends with a short checklist; every line should show ✅.

- Works on the existing SkillMatch database and on a brand-new Supabase project.
- Safe to run again later — it only adds what's missing, refreshes imported projects and never removes roles.
- On its **first** run `full_setup.sql` deletes all old projects (and their applications/chats). A marker row (`cb_migrations`) stops that reset from ever running twice.
- `wisdomudoudo24@gmail.com` becomes the first admin. After that, admins are only added from **Admin → Admins** in the app (the email shortcut stops working once any admin exists, so nobody can claim admin by registering an address).

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
| Hackathons | Open hackathons (online / in person, themes, prizes, deadlines) linking to the official pages. Tap **Count me in** so others can see who's joining and team up in #hackathons. Admins refresh the list from Devpost with one click, or add / hide / feature entries in **Admin → Hackathons**. |
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

## Security

What `sql/007` and the app guarantee (all enforced in the database, so they hold even if someone skips the app and calls the API directly):

- **Logged-out visitors get nothing.** The public key can't read any table or run any function; new tables are closed by default.
- **Private stays private.** DMs, team chats, notifications, applications, funding requests and saved projects are only visible to the people involved (and admins where they need it). "How did you hear about us" and the last-seen time of members who hide their status live in `profile_private`, which only admin functions can read.
- **No tracking images.** A profile picture must be a file the member uploaded to this app's own storage (images only, 5 MB, no SVG); the avatar folder can't be listed. The site's CSP only allows images from our storage, GitHub avatars and Devpost's image CDN.
- **No dangerous links.** Only `http(s)` links are stored or rendered — `javascript:` and friends are dropped on both sides.
- **No impersonation.** Verified / official badges are admin-only; names and usernames that pose as Cobuild, admin or support are refused.
- **No skipping the checks.** Projects, roadmaps and progress can only change through the validated functions; team members can only be people who applied; applications and funding requests can't be self-approved.
- **Anti-spam speed limits** on posts, messages, hypes, applications, new chats and new projects.
- **Closed by default.** Every old rule is replaced with one known set, every table has row-level security, and members can only call the functions the app actually uses.

Two settings live in the Supabase dashboard (Auth) rather than in code: **Confirm email** (currently off, so sign-ups aren't proven to own their address) and **leaked-password protection**.

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
sql/                     full_setup.sql (database) + 002–007 (more projects, badges, official account, hackathons + security)
api/validate-email-domain.ts   Vercel function: rejects email domains with no mail server
api/hackathons.ts              Vercel function: reads Devpost's public hackathon list (fixed source, cached)
```

## Deploy

Push to the GitHub repo connected to Vercel. `vercel.json` handles SPA routing, security headers and the CSP (Supabase + GitHub API allowed). Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel → Project → Environment Variables.

Before a public launch: replace the placeholder Terms/Privacy text, and turn on **Confirm email**, CAPTCHA and leaked-password protection in Supabase → Auth.
