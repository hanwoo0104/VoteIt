-- Run this once in Supabase SQL Editor if you previously created auth users
-- manually or if login shows "Database error querying schema".
--
-- The auth.users trigger must only run on insert. Running it on update can
-- interfere with Supabase Auth's own login/session bookkeeping.

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Optional cleanup for the demo account that may have been inserted directly
-- into auth tables. The safe Admin API script will recreate it.
do $$
declare
  demo_user_id uuid;
begin
  select id
    into demo_user_id
  from auth.users
  where email = '01012345678@phone.voteit.local'
  limit 1;

  if demo_user_id is not null then
    delete from public.profiles where id = demo_user_id;
    delete from public.users where id = demo_user_id;
    delete from auth.identities where user_id = demo_user_id;
    delete from auth.users where id = demo_user_id;
  end if;
end $$;
