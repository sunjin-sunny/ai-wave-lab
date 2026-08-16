-- The Lineup — online leaderboard foundation (TOP TURN 10.1)
--
-- Paste this into the Supabase project's SQL Editor (Dashboard ->
-- SQL Editor -> New query) and run it once. This is the only manual
-- database setup needed for this foundation turn.

create extension if not exists pgcrypto;

create table if not exists public.lineup_scores (
  id uuid primary key default gen_random_uuid(),
  nickname text not null,
  character_id text not null,
  rides integer not null,
  wave_reached integer not null,
  created_at timestamptz not null default now(),

  constraint lineup_scores_nickname_length
    check (char_length(nickname) between 1 and 12),
  constraint lineup_scores_character_id_known
    check (character_id in ('surfer01', 'surfer02', 'surfer03', 'surfer04')),
  constraint lineup_scores_rides_non_negative
    check (rides >= 0),
  constraint lineup_scores_wave_reached_min
    check (wave_reached >= 1)
);

-- Leaderboard ranking: rides desc, wave_reached desc, created_at asc.
create index if not exists lineup_scores_ranking_idx
  on public.lineup_scores (rides desc, wave_reached desc, created_at asc);

alter table public.lineup_scores enable row level security;

-- Anonymous (public, unauthenticated) browser clients may read the
-- leaderboard...
create policy "Public read access"
  on public.lineup_scores
  for select
  to anon
  using (true);

-- ...and submit new scores...
create policy "Public score submission"
  on public.lineup_scores
  for insert
  to anon
  with check (true);

-- ...but no UPDATE or DELETE policy exists for the `anon` role, so both
-- operations are denied by RLS's default-deny behavior. Do not add them
-- — an unauthenticated public leaderboard has no legitimate reason for a
-- browser client to modify or remove an existing row.
