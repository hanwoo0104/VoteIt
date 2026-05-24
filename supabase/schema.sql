create extension if not exists "pgcrypto";

do $$ begin
  create type public.user_role as enum ('user', 'politician', 'admin');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  nickname text not null unique,
  phone text not null unique,
  role public.user_role not null default 'user',
  gender text not null default 'other',
  age_group text not null,
  region text not null,
  income_level text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
  created_at timestamptz not null default now()
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
  gradient text,
  party_alignment text,
  difference text,
  pros text[] not null default '{}',
  cons text[] not null default '{}',
  percent integer not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.issue_option_politicians (
  issue_option_id uuid not null references public.issue_options(id) on delete cascade,
  politician_id uuid not null references public.politicians(id) on delete cascade,
  primary key (issue_option_id, politician_id)
);

create table if not exists public.issue_statistics (
  id uuid primary key default gen_random_uuid(),
  issue_option_id uuid not null unique references public.issue_options(id) on delete cascade,
  age jsonb not null default '[]'::jsonb,
  gender jsonb not null default '[]'::jsonb,
  region jsonb not null default '[]'::jsonb,
  income jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
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

create table if not exists public.issue_votes (
  issue_id uuid not null references public.issues(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  issue_option_id uuid not null references public.issue_options(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (issue_id, user_id)
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
  created_at timestamptz not null default now()
);

create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  politician_id uuid not null references public.politicians(id) on delete cascade,
  last_message text,
  last_message_at timestamptz,
  unread_count integer not null default 0,
  created_at timestamptz not null default now(),
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

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  );
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
  insert into public.users (
    id,
    name,
    nickname,
    phone,
    role,
    gender,
    age_group,
    region,
    income_level,
    avatar_url
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'VoteIt 사용자'),
    coalesce(new.raw_user_meta_data->>'nickname', 'citizen_' || substring(new.id::text from 1 for 8)),
    coalesce(new.phone, new.raw_user_meta_data->>'phone', ''),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'user'),
    coalesce(new.raw_user_meta_data->>'gender', 'other'),
    coalesce(new.raw_user_meta_data->>'age_group', '30대'),
    coalesce(new.raw_user_meta_data->>'region', '서울'),
    coalesce(new.raw_user_meta_data->>'income_level', '200-400만원'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.users enable row level security;
alter table public.politicians enable row level security;
alter table public.issues enable row level security;
alter table public.issue_options enable row level security;
alter table public.issue_option_politicians enable row level security;
alter table public.issue_statistics enable row level security;
alter table public.news_links enable row level security;
alter table public.issue_votes enable row level security;
alter table public.comments enable row level security;
alter table public.comment_likes enable row level security;
alter table public.reports enable row level security;
alter table public.chats enable row level security;
alter table public.chat_messages enable row level security;

create policy "Users can read own profile or admins read all" on public.users
  for select using (auth.uid() = id or public.is_admin());
create policy "Users can update own profile" on public.users
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "Public can read politicians" on public.politicians
  for select using (true);
create policy "Admins manage politicians" on public.politicians
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Public can read published issues" on public.issues
  for select using (published = true or public.is_admin());
create policy "Admins manage issues" on public.issues
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Public can read issue options" on public.issue_options
  for select using (exists (select 1 from public.issues i where i.id = issue_id and (i.published or public.is_admin())));
create policy "Admins manage issue options" on public.issue_options
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Public can read option politicians" on public.issue_option_politicians
  for select using (true);
create policy "Admins manage option politicians" on public.issue_option_politicians
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Public can read statistics" on public.issue_statistics
  for select using (true);
create policy "Admins manage statistics" on public.issue_statistics
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Public can read news links" on public.news_links
  for select using (true);
create policy "Admins manage news links" on public.news_links
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Users can read own votes" on public.issue_votes
  for select using (auth.uid() = user_id or public.is_admin());
create policy "Users vote once per issue" on public.issue_votes
  for insert with check (auth.uid() = user_id);
create policy "Users can update own vote" on public.issue_votes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Public can read comments" on public.comments
  for select using (true);
create policy "Authenticated users write comments" on public.comments
  for insert with check (auth.uid() = user_id);
create policy "Users update own comments or admins" on public.comments
  for update using (auth.uid() = user_id or public.is_admin()) with check (auth.uid() = user_id or public.is_admin());
create policy "Users delete own comments or admins" on public.comments
  for delete using (auth.uid() = user_id or public.is_admin());

create policy "Users read likes" on public.comment_likes
  for select using (true);
create policy "Users like as themselves" on public.comment_likes
  for insert with check (auth.uid() = user_id);
create policy "Users remove own likes" on public.comment_likes
  for delete using (auth.uid() = user_id);

create policy "Users create reports" on public.reports
  for insert with check (auth.uid() = reporter_id);
create policy "Admins read reports" on public.reports
  for select using (public.is_admin());
create policy "Admins update reports" on public.reports
  for update using (public.is_admin()) with check (public.is_admin());

create policy "Chat participants read rooms" on public.chats
  for select using (
    user_id = auth.uid()
    or exists (select 1 from public.politicians p where p.id = politician_id and p.user_id = auth.uid())
    or public.is_admin()
  );
create policy "Users create rooms" on public.chats
  for insert with check (auth.uid() = user_id);
create policy "Chat participants update rooms" on public.chats
  for update using (
    user_id = auth.uid()
    or exists (select 1 from public.politicians p where p.id = politician_id and p.user_id = auth.uid())
    or public.is_admin()
  );

create policy "Chat participants read messages" on public.chat_messages
  for select using (public.is_chat_participant(room_id));
create policy "Chat participants send messages" on public.chat_messages
  for insert with check (public.is_chat_participant(room_id) and auth.uid() = sender_id);
create policy "Chat participants update read state" on public.chat_messages
  for update using (public.is_chat_participant(room_id));
