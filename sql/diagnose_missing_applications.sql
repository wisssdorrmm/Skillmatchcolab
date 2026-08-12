-- Run this in Supabase SQL Editor to diagnose "applied but owner can't see it".
-- No changes made, read-only.

-- 1. Does the application actually exist?
select id, project_id, applicant_id, status, created_at
from applications
order by created_at desc
limit 10;

-- 2. For the project in question, who actually owns it according to the DB?
--    Replace 'PROJECT_ID_HERE' with the project_id from query 1.
select id, title, owner_id, created_at
from projects
where id = 'PROJECT_ID_HERE';

-- 3. Does the "main account" you're testing with match that owner_id?
--    Replace 'YOUR_EMAIL_HERE' with the main account's email.
select p.id as profile_id, p.name, u.email
from profiles p
join auth.users u on u.id = p.id
where u.email = 'YOUR_EMAIL_HERE';

-- If the owner_id from query 2 does NOT match the profile_id from query 3,
-- that's the bug: the project was created under a different account than
-- the one you're checking with. This can happen if you signed up multiple
-- times with different emails while testing, or if a project got created
-- before the earlier profile-creation bug was fixed.
