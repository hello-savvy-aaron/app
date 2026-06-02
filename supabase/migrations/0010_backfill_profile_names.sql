-- 0009: Backfill profile display names from auth metadata.
--
-- Magic-link signups carry no name, so handle_new_user fell back to storing the
-- email in profiles.full_name; a later OAuth link (e.g. Google, which does
-- provide a name) never updated the existing profile row. This sets full_name
-- from the auth user's metadata for any profile whose name is missing or still
-- equals the email. Idempotent — safe to run multiple times.
--
-- Note: guard_profile_role (0001) only reverts *role* changes, so it's a no-op
-- here (full_name-only update); no need to disable it.

update public.profiles p
set full_name = meta.name
from (
  select
    u.id,
    coalesce(
      nullif(u.raw_user_meta_data ->> 'full_name', ''),
      nullif(u.raw_user_meta_data ->> 'name', '')
    ) as name
  from auth.users u
) as meta
where meta.id = p.id
  and meta.name is not null
  and meta.name <> p.email
  and (p.full_name is null or p.full_name = p.email);
