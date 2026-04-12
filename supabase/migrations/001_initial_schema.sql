-- ─────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────

create table public.users (
  id          uuid references auth.users(id) on delete cascade primary key,
  username    text unique not null,
  avatar_url  text,
  bio         text,
  borough     text,
  created_at  timestamptz default now()
);

create table public.places (
  id                  uuid default gen_random_uuid() primary key,
  name                text not null,
  address             text,
  neighborhood        text,
  borough             text,
  lat                 float8,
  lng                 float8,
  google_place_id     text unique,
  style               text,
  barstool_score      float4,
  barstool_review_url text,
  tier                integer default 2,
  created_at          timestamptz default now()
);

create table public.reviews (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references public.users(id) on delete cascade not null,
  place_id        uuid references public.places(id) on delete cascade not null,
  score_crust     float4,
  score_sauce     float4,
  score_cheese    float4,
  score_toppings  float4,
  score_value     float4,
  overall_score   float4,
  note            text,
  photo_urls      text[],
  created_at      timestamptz default now(),
  unique (user_id, place_id)
);

create table public.follows (
  follower_id   uuid references public.users(id) on delete cascade,
  following_id  uuid references public.users(id) on delete cascade,
  created_at    timestamptz default now(),
  primary key (follower_id, following_id)
);

create table public.badges (
  id          uuid default gen_random_uuid() primary key,
  slug        text unique,
  name        text,
  description text,
  icon        text
);

create table public.user_badges (
  user_id   uuid references public.users(id) on delete cascade,
  badge_id  uuid references public.badges(id) on delete cascade,
  earned_at timestamptz default now(),
  primary key (user_id, badge_id)
);

-- ─────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────

alter table public.users       enable row level security;
alter table public.places      enable row level security;
alter table public.reviews     enable row level security;
alter table public.follows     enable row level security;
alter table public.badges      enable row level security;
alter table public.user_badges enable row level security;

-- ─────────────────────────────────────────
-- POLICIES — users
-- ─────────────────────────────────────────

create policy "users: read all"
  on public.users for select
  to authenticated using (true);

create policy "users: update own"
  on public.users for update
  to authenticated using (auth.uid() = id);

create policy "users: delete own"
  on public.users for delete
  to authenticated using (auth.uid() = id);

create policy "users: insert own"
  on public.users for insert
  to authenticated with check (auth.uid() = id);

-- ─────────────────────────────────────────
-- POLICIES — places
-- ─────────────────────────────────────────

create policy "places: read all"
  on public.places for select
  to authenticated using (true);

-- ─────────────────────────────────────────
-- POLICIES — reviews
-- ─────────────────────────────────────────

create policy "reviews: read all"
  on public.reviews for select
  to authenticated using (true);

create policy "reviews: insert own"
  on public.reviews for insert
  to authenticated with check (auth.uid() = user_id);

create policy "reviews: update own"
  on public.reviews for update
  to authenticated using (auth.uid() = user_id);

create policy "reviews: delete own"
  on public.reviews for delete
  to authenticated using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- POLICIES — follows
-- ─────────────────────────────────────────

create policy "follows: read all"
  on public.follows for select
  to authenticated using (true);

create policy "follows: insert own"
  on public.follows for insert
  to authenticated with check (auth.uid() = follower_id);

create policy "follows: delete own"
  on public.follows for delete
  to authenticated using (auth.uid() = follower_id);

-- ─────────────────────────────────────────
-- POLICIES — badges
-- ─────────────────────────────────────────

create policy "badges: read all"
  on public.badges for select
  to authenticated using (true);

-- ─────────────────────────────────────────
-- POLICIES — user_badges
-- ─────────────────────────────────────────

create policy "user_badges: read all"
  on public.user_badges for select
  to authenticated using (true);

create policy "user_badges: delete own"
  on public.user_badges for delete
  to authenticated using (auth.uid() = user_id);
