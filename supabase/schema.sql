-- E2 Collaboration schema (Supabase Free Tier)
-- Run in Supabase SQL Editor. Requires Anonymous Auth enabled.

create extension if not exists "pgcrypto";

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null default 'Event Storming Board',
  host_token_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days')
);

create table if not exists public.board_snapshots (
  room_id uuid primary key references public.rooms (id) on delete cascade,
  snapshot jsonb not null,
  yjs_state bytea,
  revision bigint not null default 1,
  updated_at timestamptz not null default now()
);

create index if not exists rooms_code_idx on public.rooms (code);
create index if not exists rooms_expires_at_idx on public.rooms (expires_at);

alter table public.rooms enable row level security;
alter table public.board_snapshots enable row level security;

-- Anyone with the anon key can insert rooms (workshop create).
create policy "rooms_insert" on public.rooms
  for insert to anon, authenticated
  with check (true);

-- Read/update only non-expired rooms (code must be known / queried).
create policy "rooms_select" on public.rooms
  for select to anon, authenticated
  using (expires_at > now());

create policy "rooms_update" on public.rooms
  for update to anon, authenticated
  using (expires_at > now())
  with check (expires_at > now());

create policy "rooms_delete" on public.rooms
  for delete to anon, authenticated
  using (expires_at > now());

create policy "snapshots_select" on public.board_snapshots
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.rooms r
      where r.id = room_id and r.expires_at > now()
    )
  );

create policy "snapshots_insert" on public.board_snapshots
  for insert to anon, authenticated
  with check (
    exists (
      select 1 from public.rooms r
      where r.id = room_id and r.expires_at > now()
    )
  );

create policy "snapshots_update" on public.board_snapshots
  for update to anon, authenticated
  using (
    exists (
      select 1 from public.rooms r
      where r.id = room_id and r.expires_at > now()
    )
  )
  with check (
    exists (
      select 1 from public.rooms r
      where r.id = room_id and r.expires_at > now()
    )
  );

-- Realtime: enable broadcast for private channels via client (no table replication required).
-- In Dashboard: Database → Replication not needed for Broadcast-only sync.
