create extension if not exists "pgcrypto";

do $$ begin
  create type public.user_role as enum ('user', 'politician', 'admin');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text not null unique,
  role public.user_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references public.users(id) on delete cascade,
  name text not null,
  nickname text not null unique,
  gender text not null default 'other',
  age_group text not null,
  region text not null,
  income_level text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.phone_verifications (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  purpose text not null default 'signup',
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  verified_at timestamptz,
  consumed_at timestamptz,
  user_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists phone_verifications_phone_idx on public.phone_verifications(phone, purpose, created_at desc);

create table if not exists public.politicians (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  name text not null,
  party text not null,
  role_title text not null,
  region text not null,
  avatar_url text,
  status text,
  online boolean not null default false,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.issues (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text not null,
  description text not null,
  hot boolean not null default false,
  published boolean not null default true,
  views integer not null default 0,
  participants integer not null default 0,
  comments_count integer not null default 0,
  reaction_count integer not null default 0,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.issue_options (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues(id) on delete cascade,
  title text not null,
  short_text text not null,
  gradient text default 'linear-gradient(135deg,#244868,#345f8f,#e04b5d)',
  party_alignment text,
  difference text,
  pros text[] not null default '{}',
  cons text[] not null default '{}',
  votes_count integer not null default 0,
  percent integer not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.issue_option_politicians (
  issue_option_id uuid not null references public.issue_options(id) on delete cascade,
  politician_id uuid not null references public.politicians(id) on delete cascade,
  primary key (issue_option_id, politician_id)
);

create table if not exists public.issue_votes (
  issue_id uuid not null references public.issues(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  issue_option_id uuid not null references public.issue_options(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (issue_id, user_id)
);

create table if not exists public.issue_views (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.news_links (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues(id) on delete cascade,
  title text not null,
  outlet text not null,
  url text not null,
  created_at timestamptz not null default now(),
  unique (issue_id, url)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  body text not null,
  likes_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.comment_likes (
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid references public.comments(id) on delete cascade,
  reporter_id uuid not null references public.users(id) on delete cascade,
  reason text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (comment_id, reporter_id)
);

create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  politician_id uuid not null references public.politicians(id) on delete cascade,
  last_message text,
  last_message_at timestamptz,
  unread_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, politician_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chats(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(select 1 from public.users where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_chat_participant(room uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.chats c
    left join public.politicians p on p.id = c.politician_id
    where c.id = room
      and (c.user_id = auth.uid() or p.user_id = auth.uid() or public.is_admin())
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'phone', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'user')
  )
  on conflict (id) do update
  set phone = excluded.phone,
      role = excluded.role;

  insert into public.profiles (id, name, nickname, gender, age_group, region, income_level, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'VoteIt 사용자'),
    coalesce(new.raw_user_meta_data->>'nickname', 'citizen_' || substring(new.id::text from 1 for 8)),
    coalesce(new.raw_user_meta_data->>'gender', 'other'),
    coalesce(new.raw_user_meta_data->>'age_group', '30대'),
    coalesce(new.raw_user_meta_data->>'region', '서울'),
    coalesce(new.raw_user_meta_data->>'income_level', '200-400만원'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
  set name = excluded.name,
      nickname = excluded.nickname,
      gender = excluded.gender,
      age_group = excluded.age_group,
      region = excluded.region,
      income_level = excluded.income_level,
      avatar_url = excluded.avatar_url;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.refresh_issue_vote_counts(target_issue_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  total_votes integer;
begin
  select count(*) into total_votes from public.issue_votes where issue_id = target_issue_id;

  update public.issues
  set participants = total_votes,
      updated_at = now()
  where id = target_issue_id;

  update public.issue_options o
  set votes_count = counts.vote_count,
      percent = case when total_votes > 0 then round((counts.vote_count::numeric / total_votes::numeric) * 100)::integer else 0 end,
      updated_at = now()
  from (
    select option.id, count(v.issue_option_id)::integer as vote_count
    from public.issue_options option
    left join public.issue_votes v on v.issue_option_id = option.id
    where option.issue_id = target_issue_id
    group by option.id
  ) counts
  where o.id = counts.id;
end;
$$;

create or replace function public.on_issue_vote_changed()
returns trigger
language plpgsql
as $$
begin
  perform public.refresh_issue_vote_counts(coalesce(new.issue_id, old.issue_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists issue_vote_counts_trigger on public.issue_votes;
create trigger issue_vote_counts_trigger
  after insert or update or delete on public.issue_votes
  for each row execute procedure public.on_issue_vote_changed();

create or replace function public.on_issue_view_created()
returns trigger
language plpgsql
as $$
begin
  update public.issues set views = views + 1 where id = new.issue_id;
  return new;
end;
$$;

drop trigger if exists issue_view_count_trigger on public.issue_views;
create trigger issue_view_count_trigger
  after insert on public.issue_views
  for each row execute procedure public.on_issue_view_created();

create or replace function public.on_comment_changed()
returns trigger
language plpgsql
as $$
begin
  update public.issues
  set comments_count = (
    select count(*) from public.comments where issue_id = coalesce(new.issue_id, old.issue_id)
  )
  where id = coalesce(new.issue_id, old.issue_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists comments_count_trigger on public.comments;
create trigger comments_count_trigger
  after insert or delete on public.comments
  for each row execute procedure public.on_comment_changed();

create or replace function public.on_comment_like_changed()
returns trigger
language plpgsql
as $$
begin
  update public.comments
  set likes_count = (
    select count(*) from public.comment_likes where comment_id = coalesce(new.comment_id, old.comment_id)
  )
  where id = coalesce(new.comment_id, old.comment_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists comment_likes_count_trigger on public.comment_likes;
create trigger comment_likes_count_trigger
  after insert or delete on public.comment_likes
  for each row execute procedure public.on_comment_like_changed();

create or replace function public.on_chat_message_created()
returns trigger
language plpgsql
as $$
declare
  room_user uuid;
begin
  select user_id into room_user from public.chats where id = new.room_id;
  update public.chats
  set last_message = new.body,
      last_message_at = new.created_at,
      unread_count = case when new.sender_id = room_user then unread_count else unread_count + 1 end,
      updated_at = now()
  where id = new.room_id;
  return new;
end;
$$;

drop trigger if exists chat_last_message_trigger on public.chat_messages;
create trigger chat_last_message_trigger
  after insert on public.chat_messages
  for each row execute procedure public.on_chat_message_created();

create or replace function public.get_issue_statistics(p_issue_id uuid)
returns table(issue_option_id uuid, age jsonb, gender jsonb, region jsonb, income jsonb)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with option_totals as (
    select o.id, greatest(count(v.user_id), 1)::numeric as total
    from public.issue_options o
    left join public.issue_votes v on v.issue_option_id = o.id
    where o.issue_id = p_issue_id
    group by o.id
  )
  select
    o.id,
    coalesce((select jsonb_agg(jsonb_build_object('label', label, 'value', value) order by label)
      from (
        select p.age_group as label, round(count(*)::numeric / ot.total * 100)::integer as value
        from public.issue_votes v join public.profiles p on p.id = v.user_id
        where v.issue_option_id = o.id
        group by p.age_group, ot.total
      ) s), '[]'::jsonb) as age,
    coalesce((select jsonb_agg(jsonb_build_object('label', label, 'value', value) order by label)
      from (
        select p.gender as label, round(count(*)::numeric / ot.total * 100)::integer as value
        from public.issue_votes v join public.profiles p on p.id = v.user_id
        where v.issue_option_id = o.id
        group by p.gender, ot.total
      ) s), '[]'::jsonb) as gender,
    coalesce((select jsonb_agg(jsonb_build_object('label', label, 'value', value) order by label)
      from (
        select p.region as label, round(count(*)::numeric / ot.total * 100)::integer as value
        from public.issue_votes v join public.profiles p on p.id = v.user_id
        where v.issue_option_id = o.id
        group by p.region, ot.total
      ) s), '[]'::jsonb) as region,
    coalesce((select jsonb_agg(jsonb_build_object('label', label, 'value', value) order by label)
      from (
        select p.income_level as label, round(count(*)::numeric / ot.total * 100)::integer as value
        from public.issue_votes v join public.profiles p on p.id = v.user_id
        where v.issue_option_id = o.id
        group by p.income_level, ot.total
      ) s), '[]'::jsonb) as income
  from public.issue_options o
  join option_totals ot on ot.id = o.id
  where o.issue_id = p_issue_id
  order by o.sort_order;
end;
$$;

alter table public.users enable row level security;
alter table public.profiles enable row level security;
alter table public.phone_verifications enable row level security;
alter table public.politicians enable row level security;
alter table public.issues enable row level security;
alter table public.issue_options enable row level security;
alter table public.issue_option_politicians enable row level security;
alter table public.issue_votes enable row level security;
alter table public.issue_views enable row level security;
alter table public.news_links enable row level security;
alter table public.comments enable row level security;
alter table public.comment_likes enable row level security;
alter table public.reports enable row level security;
alter table public.chats enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "users_select_own_admin" on public.users;
create policy "users_select_own_admin" on public.users for select using (auth.uid() = id or public.is_admin());
drop policy if exists "users_update_own" on public.users;
create policy "users_update_own" on public.users for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles_public_read" on public.profiles;
create policy "profiles_public_read" on public.profiles for select using (true);
drop policy if exists "profiles_update_own_admin" on public.profiles;
create policy "profiles_update_own_admin" on public.profiles for update using (auth.uid() = id or public.is_admin()) with check (auth.uid() = id or public.is_admin());

drop policy if exists "politicians_public_read" on public.politicians;
create policy "politicians_public_read" on public.politicians for select using (true);
drop policy if exists "politicians_admin_manage" on public.politicians;
create policy "politicians_admin_manage" on public.politicians for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "issues_public_read" on public.issues;
create policy "issues_public_read" on public.issues for select using (published = true or public.is_admin());
drop policy if exists "issues_admin_manage" on public.issues;
create policy "issues_admin_manage" on public.issues for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "issue_options_public_read" on public.issue_options;
create policy "issue_options_public_read" on public.issue_options for select using (exists (select 1 from public.issues i where i.id = issue_id and (i.published or public.is_admin())));
drop policy if exists "issue_options_admin_manage" on public.issue_options;
create policy "issue_options_admin_manage" on public.issue_options for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "option_politicians_public_read" on public.issue_option_politicians;
create policy "option_politicians_public_read" on public.issue_option_politicians for select using (true);
drop policy if exists "option_politicians_admin_manage" on public.issue_option_politicians;
create policy "option_politicians_admin_manage" on public.issue_option_politicians for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "votes_select_own_admin" on public.issue_votes;
create policy "votes_select_own_admin" on public.issue_votes for select using (auth.uid() = user_id or public.is_admin());
drop policy if exists "votes_insert_own" on public.issue_votes;
create policy "votes_insert_own" on public.issue_votes for insert with check (auth.uid() = user_id);
drop policy if exists "votes_update_own" on public.issue_votes;
create policy "votes_update_own" on public.issue_votes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "views_insert_any" on public.issue_views;
create policy "views_insert_any" on public.issue_views for insert with check (true);
drop policy if exists "views_admin_read" on public.issue_views;
create policy "views_admin_read" on public.issue_views for select using (public.is_admin());

drop policy if exists "news_public_read" on public.news_links;
create policy "news_public_read" on public.news_links for select using (true);
drop policy if exists "news_admin_manage" on public.news_links;
create policy "news_admin_manage" on public.news_links for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "comments_public_read" on public.comments;
create policy "comments_public_read" on public.comments for select using (true);
drop policy if exists "comments_insert_auth" on public.comments;
create policy "comments_insert_auth" on public.comments for insert with check (auth.uid() = user_id);
drop policy if exists "comments_update_own_admin" on public.comments;
create policy "comments_update_own_admin" on public.comments for update using (auth.uid() = user_id or public.is_admin()) with check (auth.uid() = user_id or public.is_admin());
drop policy if exists "comments_delete_own_admin" on public.comments;
create policy "comments_delete_own_admin" on public.comments for delete using (auth.uid() = user_id or public.is_admin());

drop policy if exists "likes_public_read" on public.comment_likes;
create policy "likes_public_read" on public.comment_likes for select using (true);
drop policy if exists "likes_insert_own" on public.comment_likes;
create policy "likes_insert_own" on public.comment_likes for insert with check (auth.uid() = user_id);
drop policy if exists "likes_delete_own" on public.comment_likes;
create policy "likes_delete_own" on public.comment_likes for delete using (auth.uid() = user_id);

drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own" on public.reports for insert with check (auth.uid() = reporter_id);
drop policy if exists "reports_select_own_admin" on public.reports;
create policy "reports_select_own_admin" on public.reports for select using (auth.uid() = reporter_id or public.is_admin());
drop policy if exists "reports_admin_update" on public.reports;
create policy "reports_admin_update" on public.reports for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "chats_participants_select" on public.chats;
create policy "chats_participants_select" on public.chats for select using (
  user_id = auth.uid()
  or exists (select 1 from public.politicians p where p.id = politician_id and p.user_id = auth.uid())
  or public.is_admin()
);
drop policy if exists "chats_user_insert" on public.chats;
create policy "chats_user_insert" on public.chats for insert with check (auth.uid() = user_id);
drop policy if exists "chats_participants_update" on public.chats;
create policy "chats_participants_update" on public.chats for update using (
  user_id = auth.uid()
  or exists (select 1 from public.politicians p where p.id = politician_id and p.user_id = auth.uid())
  or public.is_admin()
);

drop policy if exists "messages_participants_select" on public.chat_messages;
create policy "messages_participants_select" on public.chat_messages for select using (public.is_chat_participant(room_id));
drop policy if exists "messages_participants_insert" on public.chat_messages;
create policy "messages_participants_insert" on public.chat_messages for insert with check (public.is_chat_participant(room_id) and auth.uid() = sender_id);
drop policy if exists "messages_participants_update" on public.chat_messages;
create policy "messages_participants_update" on public.chat_messages for update using (public.is_chat_participant(room_id));

do $$
begin
  alter publication supabase_realtime add table public.chat_messages;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.comments;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.issue_votes;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
