-- 0004: Ensure admin profiles exist for all @hellosavvy.design auth users.
-- Idempotent — safe to run multiple times.
-- Backfills any hellosavvy.design auth user who has no profile yet (e.g. if
-- the handle_new_user trigger didn't fire during an API-created user).

insert into public.profiles (id, email, full_name, role, client_id)
select
  u.id,
  u.email,
  coalesce(
    nullif(u.raw_user_meta_data ->> 'full_name', ''),
    nullif(u.raw_user_meta_data ->> 'name', ''),
    u.email
  ),
  'admin',
  null
from auth.users u
where split_part(u.email, '@', 2) = 'hellosavvy.design'
  and not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do update
  set role = 'admin';
