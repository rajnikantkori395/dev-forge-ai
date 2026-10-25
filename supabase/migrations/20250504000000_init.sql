-- DevForge AI — initial schema + RLS
-- Run via Supabase SQL editor or `supabase db push`

create extension if not exists "pgcrypto";

-- Profiles (1:1 with auth.users)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  email text,
  xp integer not null default 0,
  level integer not null default 1,
  streak integer not null default 0,
  last_active_date date,
  preferred_stack text[] default '{}',
  goals text,
  daily_minutes integer default 15,
  role text,
  experience_level text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.daily_missions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  type text not null check (
    type in (
      'dev_tip',
      'interview',
      'challenge',
      'explore',
      'architecture',
      'productivity'
    )
  ),
  difficulty text not null default 'medium',
  xp_reward integer not null default 25,
  mission_date date not null default (timezone ('utc', now()))::date,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index daily_missions_date_idx on public.daily_missions (mission_date);

create table public.user_missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  mission_id uuid not null references public.daily_missions (id) on delete cascade,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, mission_id)
);

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  options jsonb not null,
  correct_answer integer not null,
  difficulty text not null default 'medium',
  topic text not null,
  explanation text,
  created_at timestamptz not null default now()
);

create table public.generated_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  topic text not null,
  tone text,
  platform text default 'LinkedIn',
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.explore_topics (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text,
  difficulty text default 'intermediate',
  url text,
  created_at timestamptz not null default now()
);

create table public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  badge_id text not null,
  unlocked_at timestamptz not null default now(),
  unique (user_id, badge_id)
);

-- Auto-create profile on signup
create or replace function public.handle_new_user ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user ();

create or replace function public.touch_profile_updated_at ()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
before update on public.profiles
for each row
execute procedure public.touch_profile_updated_at ();

-- RLS
alter table public.profiles enable row level security;
alter table public.daily_missions enable row level security;
alter table public.user_missions enable row level security;
alter table public.quizzes enable row level security;
alter table public.generated_posts enable row level security;
alter table public.explore_topics enable row level security;
alter table public.user_badges enable row level security;

-- Profiles: users manage own row
create policy "profiles_select_own"
on public.profiles for select
using (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = id);

-- Daily missions: readable by authenticated users
create policy "daily_missions_read"
on public.daily_missions for select
to authenticated
using (true);

-- Allow clients to seed today's missions (MVP). Harden with Edge Functions + service role later.
create policy "daily_missions_insert_today"
on public.daily_missions for insert
to authenticated
with check (mission_date = (timezone ('utc', now()))::date);

-- User missions
create policy "user_missions_select_own"
on public.user_missions for select
using (auth.uid() = user_id);

create policy "user_missions_insert_own"
on public.user_missions for insert
with check (auth.uid() = user_id);

create policy "user_missions_update_own"
on public.user_missions for update
using (auth.uid() = user_id);

-- Quizzes: read all when authenticated
create policy "quizzes_read"
on public.quizzes for select
to authenticated
using (true);

create policy "quizzes_insert_authenticated"
on public.quizzes for insert
to authenticated
with check (true);

-- Generated posts
create policy "generated_posts_select_own"
on public.generated_posts for select
using (auth.uid() = user_id);

create policy "generated_posts_insert_own"
on public.generated_posts for insert
with check (auth.uid() = user_id);

-- Explore feed
create policy "explore_topics_read"
on public.explore_topics for select
to authenticated
using (true);

-- Badges
create policy "user_badges_select_own"
on public.user_badges for select
using (auth.uid() = user_id);

create policy "user_badges_insert_own"
on public.user_badges for insert
with check (auth.uid() = user_id);

-- RPC: award XP and optional badge (called after mission/quiz; service role or trusted client)
create or replace function public.award_xp (p_user uuid, p_delta integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is distinct from p_user then
    raise exception 'not allowed';
  end if;

  update public.profiles
  set xp = greatest(0, xp + p_delta)
  where id = p_user;

  update public.profiles
  set level = greatest(1, 1 + xp / 500)
  where id = p_user;
end;
$$;

grant execute on function public.award_xp (uuid, integer) to authenticated;

-- Seed explore + sample quizzes (idempotent-ish: skip if exists)
insert into public.explore_topics (title, description, category, difficulty, url)
select v.title, v.description, v.category, v.difficulty, v.url
from (
  values
    ('Event-driven microservices', 'Sagas, outbox pattern, and idempotent consumers for resilient backends.', 'Architecture', 'advanced', null),
    ('Edge functions vs lambdas', 'When to run logic at the edge and how cold starts differ from regional compute.', 'Cloud', 'intermediate', null),
    ('React Server Components mental model', 'What ships to the client, what stays on the server, and cache boundaries.', 'React', 'intermediate', null),
    ('Postgres indexing playbook', 'B-tree vs BRIN, partial indexes, and avoiding accidental seq scans.', 'SQL', 'advanced', null),
    ('Observability triad', 'Metrics, logs, traces — tying SLOs to actionable dashboards.', 'DevOps', 'intermediate', null),
    ('AI coding agents safely', 'Sandboxes, review gates, and prompt hygiene for production repos.', 'AI', 'intermediate', null)
) as v(title, description, category, difficulty, url)
where not exists (select 1 from public.explore_topics);

insert into public.quizzes (question, options, correct_answer, difficulty, topic, explanation)
select * from (
  values
    (
      'What does ACID stand for in databases?',
      '["Atomicity, Consistency, Isolation, Durability","Append, Cache, Index, Deploy","Auth, Cipher, Integrity, Deny","Async, Concurrent, Isolated, Deferred"]'::jsonb,
      0,
      'easy',
      'SQL',
      'ACID properties define reliable transaction processing in relational databases.'
    ),
    (
      'In Node.js, what is the primary purpose of the event loop?',
      '["Handle async I/O and schedule callbacks","Compile TypeScript","Manage GPU rendering","Encrypt HTTPS traffic"]'::jsonb,
      0,
      'easy',
      'Node.js',
      'The event loop coordinates non-blocking operations and callback execution.'
    ),
    (
      'Which pattern helps avoid cascading failures between services?',
      '["Bulkhead","Singleton","Factory","Adapter"]'::jsonb,
      0,
      'medium',
      'System Design',
      'Bulkheads isolate resource pools so one dependency cannot exhaust the entire system.'
    ),
    (
      'What is the main benefit of a CDN for static assets?',
      '["Lower latency via edge caching","Stronger password hashing","Database replication","Schema migrations"]'::jsonb,
      0,
      'easy',
      'AWS',
      'CDNs cache content close to users, reducing round-trip time and origin load.'
    ),
    (
      'In React, what triggers a re-render of a function component?',
      '["State or parent re-render (with new props)","Only direct DOM updates","console.log calls","Import order"]'::jsonb,
      0,
      'easy',
      'React',
      'React reconciles when state changes or parent renders with new props.'
    )
) as t(question, options, correct_answer, difficulty, topic, explanation)
where (select count(*) from public.quizzes) = 0;
