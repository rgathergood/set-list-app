-- SetList Builder Database Schema
-- Creates all tables with proper relationships and RLS policies
-- Tables are created in dependency order: profiles, setlists, collaborators, groups, songs, private_notes

-- 1. Profiles table (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  spotify_connected boolean default false,
  spotify_refresh_token text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- 2. Setlists table
create table if not exists public.setlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  gig_date date,
  venue text,
  share_id text unique default encode(gen_random_bytes(8), 'hex'),
  is_public boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.setlists enable row level security;

-- Owner can do everything
create policy "setlists_owner_all" on public.setlists for all using (auth.uid() = user_id);

-- 3. Collaborators table (must be created before groups/songs RLS that reference it)
create table if not exists public.collaborators (
  id uuid primary key default gen_random_uuid(),
  setlist_id uuid not null references public.setlists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('editor', 'viewer')),
  invited_by uuid references auth.users(id),
  created_at timestamptz default now(),
  unique(setlist_id, user_id)
);

alter table public.collaborators enable row level security;

create policy "collaborators_owner_all" on public.collaborators for all using (
  exists (select 1 from public.setlists s where s.id = setlist_id and s.user_id = auth.uid())
);

create policy "collaborators_self_select" on public.collaborators for select using (auth.uid() = user_id);

-- Now add collaborator and public policies to setlists
create policy "setlists_collaborator_select" on public.setlists for select using (
  exists (
    select 1 from public.collaborators c 
    where c.setlist_id = id and c.user_id = auth.uid()
  )
);

create policy "setlists_public_select" on public.setlists for select using (is_public = true);

-- 4. Groups table (sets, encores, sections)
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  setlist_id uuid not null references public.setlists(id) on delete cascade,
  name text not null,
  position integer not null default 0,
  color text default '#1DB954',
  is_collapsed boolean default false,
  created_at timestamptz default now()
);

alter table public.groups enable row level security;

create policy "groups_owner_all" on public.groups for all using (
  exists (select 1 from public.setlists s where s.id = setlist_id and s.user_id = auth.uid())
);

create policy "groups_collaborator_select" on public.groups for select using (
  exists (
    select 1 from public.collaborators c 
    where c.setlist_id = groups.setlist_id and c.user_id = auth.uid()
  )
);

create policy "groups_collaborator_modify" on public.groups for insert, update, delete using (
  exists (
    select 1 from public.collaborators c 
    where c.setlist_id = groups.setlist_id and c.user_id = auth.uid() and c.role = 'editor'
  )
);

create policy "groups_public_select" on public.groups for select using (
  exists (select 1 from public.setlists s where s.id = setlist_id and s.is_public = true)
);

-- 5. Songs table
create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  setlist_id uuid not null references public.setlists(id) on delete cascade,
  title text not null,
  artist text,
  album text,
  duration_ms integer,
  bpm integer,
  song_key text,
  energy float,
  spotify_id text,
  spotify_uri text,
  album_art_url text,
  preview_url text,
  position integer not null default 0,
  shared_notes text,
  created_at timestamptz default now()
);

alter table public.songs enable row level security;

create policy "songs_owner_all" on public.songs for all using (
  exists (select 1 from public.setlists s where s.id = setlist_id and s.user_id = auth.uid())
);

create policy "songs_collaborator_select" on public.songs for select using (
  exists (
    select 1 from public.collaborators c 
    where c.setlist_id = songs.setlist_id and c.user_id = auth.uid()
  )
);

create policy "songs_collaborator_modify" on public.songs for insert, update, delete using (
  exists (
    select 1 from public.collaborators c 
    where c.setlist_id = songs.setlist_id and c.user_id = auth.uid() and c.role = 'editor'
  )
);

create policy "songs_public_select" on public.songs for select using (
  exists (select 1 from public.setlists s where s.id = setlist_id and s.is_public = true)
);

-- 6. Private Notes table (per-user notes on songs)
create table if not exists public.private_notes (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(song_id, user_id)
);

alter table public.private_notes enable row level security;

create policy "private_notes_own" on public.private_notes for all using (auth.uid() = user_id);

-- Create trigger for auto-creating profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Create indexes for performance
create index if not exists idx_setlists_user_id on public.setlists(user_id);
create index if not exists idx_setlists_share_id on public.setlists(share_id);
create index if not exists idx_groups_setlist_id on public.groups(setlist_id);
create index if not exists idx_songs_group_id on public.songs(group_id);
create index if not exists idx_songs_setlist_id on public.songs(setlist_id);
create index if not exists idx_collaborators_setlist_id on public.collaborators(setlist_id);
create index if not exists idx_collaborators_user_id on public.collaborators(user_id);
