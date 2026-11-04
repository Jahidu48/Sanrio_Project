-- ============================================================================
-- SANRIO COUPLE SPACE PWA — SUPABASE SQL SCHEMA & REALTIME SETUP
-- Run this script in your Supabase SQL Editor
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. Table: daily_qna (Time-Locked Daily Romantic Prompts on Home Tab)
-- ----------------------------------------------------------------------------
create table if not exists public.daily_qna (
  id uuid primary key default gen_random_uuid(),
  room_id text not null default 'couple-room',
  prompt_date date not null default current_date,
  question text not null,
  user_a_name text not null default 'Partner A',
  user_b_name text not null default 'Partner B',
  user_a_answer text,
  user_b_answer text,
  user_a_answered_at timestamptz,
  user_b_answered_at timestamptz,
  is_unlocked boolean generated always as (
    coalesce(length(trim(user_a_answer)), 0) > 0
    and coalesce(length(trim(user_b_answer)), 0) > 0
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_qna_room_date_unique unique (room_id, prompt_date)
);

-- ----------------------------------------------------------------------------
-- 2. Table: shared_notes (Collaborative Couple Journal Notes)
-- ----------------------------------------------------------------------------
create table if not exists public.shared_notes (
  id uuid primary key default gen_random_uuid(),
  room_id text not null default 'couple-room',
  title text not null default 'Catatan Baru Kita',
  content text not null default '',
  mood text not null default 'romance',
  is_pinned boolean not null default false,
  last_edited_by text not null default 'Partner',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_shared_notes_room_updated
  on public.shared_notes (room_id, is_pinned desc, updated_at desc);

-- ----------------------------------------------------------------------------
-- 3. Table: bucket_list_items (Shared Couple Wishlist & Date Bucket List)
-- ----------------------------------------------------------------------------
create table if not exists public.bucket_list_items (
  id uuid primary key default gen_random_uuid(),
  room_id text not null default 'couple-room',
  title text not null,
  category text not null default 'date',
  is_completed boolean not null default false,
  completed_by text,
  created_by text not null default 'Partner',
  created_at timestamptz not null default now()
);

create index if not exists idx_bucket_list_room_created
  on public.bucket_list_items (room_id, created_at desc);

-- ----------------------------------------------------------------------------
-- 4. Table: chat_messages (Real-time WhatsApp-Style Couple Messenger)
-- ----------------------------------------------------------------------------
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id text not null default 'couple-room',
  sender_role text not null, -- 'user_a' or 'user_b'
  sender_name text not null,
  sender_character text,
  type text not null default 'text', -- 'text', 'image', 'audio', 'file', 'location', 'call_event', 'dare_proof'
  text text,
  media_url text,
  file_name text,
  file_size bigint,
  audio_duration numeric,
  location jsonb, -- { lat, lng, label }
  reply_to jsonb, -- { id, sender_name, text }
  reactions jsonb default '{}'::jsonb, -- { "💖": ["user_a"], ... }
  is_read boolean not null default false,
  is_scratch_card boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_messages_room_created
  on public.chat_messages (room_id, created_at asc);

-- ----------------------------------------------------------------------------
-- 5. Table: shared_playlist (Real-time Synchronized Couple Music Player)
-- ----------------------------------------------------------------------------
create table if not exists public.shared_playlist (
  id uuid primary key default gen_random_uuid(),
  room_id text not null default 'couple-room',
  title text not null,
  artist text default '',
  source text not null default 'file', -- 'file', 'youtube', 'spotify', 'soundcloud', 'custom_url'
  url text not null,
  cover_url text,
  added_by text not null default 'Partner',
  created_at timestamptz not null default now()
);

create index if not exists idx_shared_playlist_room
  on public.shared_playlist (room_id, created_at asc);

-- ----------------------------------------------------------------------------
-- 6. Automatic updated_at Trigger
-- ----------------------------------------------------------------------------
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_daily_qna_updated_at on public.daily_qna;
create trigger trg_daily_qna_updated_at
  before update on public.daily_qna
  for each row
  execute function public.handle_updated_at();

drop trigger if exists trg_shared_notes_updated_at on public.shared_notes;
create trigger trg_shared_notes_updated_at
  before update on public.shared_notes
  for each row
  execute function public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 6. Row Level Security (RLS) Policies
-- ----------------------------------------------------------------------------
alter table public.daily_qna enable row level security;
alter table public.shared_notes enable row level security;
alter table public.bucket_list_items enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "Allow couple room access to daily_qna" on public.daily_qna;
create policy "Allow couple room access to daily_qna"
  on public.daily_qna for all using (true) with check (true);

drop policy if exists "Allow couple room access to shared_notes" on public.shared_notes;
create policy "Allow couple room access to shared_notes"
  on public.shared_notes for all using (true) with check (true);

drop policy if exists "Allow couple room access to bucket_list_items" on public.bucket_list_items;
create policy "Allow couple room access to bucket_list_items"
  on public.bucket_list_items for all using (true) with check (true);

drop policy if exists "Allow couple room access to chat_messages" on public.chat_messages;
create policy "Allow couple room access to chat_messages"
  on public.chat_messages for all using (true) with check (true);

-- ----------------------------------------------------------------------------
-- 7. Supabase Storage Bucket for Media Attachments (chat_media)
-- ----------------------------------------------------------------------------
-- In Supabase Dashboard -> Storage:
-- 1. Create a public bucket named 'chat_media'
-- 2. Add policy: Allow public read and insert:
-- insert into storage.buckets (id, name, public) values ('chat_media', 'chat_media', true)
-- on conflict (id) do nothing;
-- create policy "Allow public uploads to chat_media" on storage.objects
--   for insert with check (bucket_id = 'chat_media');
-- create policy "Allow public downloads from chat_media" on storage.objects
--   for select using (bucket_id = 'chat_media');

-- ----------------------------------------------------------------------------
-- 8. Enable Supabase Realtime Replication
-- ----------------------------------------------------------------------------
alter publication supabase_realtime add table public.daily_qna;
alter publication supabase_realtime add table public.shared_notes;
alter publication supabase_realtime add table public.bucket_list_items;
alter publication supabase_realtime add table public.chat_messages;

-- ----------------------------------------------------------------------------
-- 9. Table: music_room_state (Jockie Music Bot YouTube & Audio Realtime Sync)
-- ----------------------------------------------------------------------------
create table if not exists public.music_room_state (
  room_id text primary key default 'couple-room',
  video_id text not null default '',
  url text not null default '',
  title text not null default '',
  is_playing boolean not null default false,
  started_at_server_time bigint not null default 0,
  paused_at_seconds numeric not null default 0,
  updated_by text not null default 'System',
  queue jsonb default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.music_room_state enable row level security;
drop policy if exists "Allow couple room access to music_room_state" on public.music_room_state;
create policy "Allow couple room access to music_room_state"
  on public.music_room_state for all using (true) with check (true);

alter publication supabase_realtime add table public.music_room_state;
