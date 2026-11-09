-- NameHope Good Vibe: Supabase setup
-- Admin account: namehope.goodvibe@gmail.com
-- Run this in Supabase Dashboard > SQL Editor > New query.

create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text,
  audio_url text not null,
  cover_url text,
  is_published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.songs enable row level security;

drop policy if exists "Public can read published songs" on public.songs;
create policy "Public can read published songs"
on public.songs for select
to anon, authenticated
using (is_published = true);

drop policy if exists "NameHope admin can manage songs" on public.songs;
create policy "NameHope admin can manage songs"
on public.songs for all
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'namehope.goodvibe@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'namehope.goodvibe@gmail.com');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'music',
  'music',
  true,
  104857600,
  array[
    'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/wav',
    'audio/x-wav', 'audio/ogg', 'audio/aac', 'audio/flac',
    'image/jpeg', 'image/png', 'image/webp'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Anyone can listen to / view files in the public music bucket.
drop policy if exists "Public can read music files" on storage.objects;
create policy "Public can read music files"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'music');

-- Only the configured admin account can upload, update, or delete files.
drop policy if exists "NameHope admin can upload music files" on storage.objects;
create policy "NameHope admin can upload music files"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'music'
  and lower(coalesce(auth.jwt() ->> 'email', '')) = 'namehope.goodvibe@gmail.com'
);

drop policy if exists "NameHope admin can update music files" on storage.objects;
create policy "NameHope admin can update music files"
on storage.objects for update
to authenticated
using (
  bucket_id = 'music'
  and lower(coalesce(auth.jwt() ->> 'email', '')) = 'namehope.goodvibe@gmail.com'
)
with check (
  bucket_id = 'music'
  and lower(coalesce(auth.jwt() ->> 'email', '')) = 'namehope.goodvibe@gmail.com'
);

drop policy if exists "NameHope admin can delete music files" on storage.objects;
create policy "NameHope admin can delete music files"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'music'
  and lower(coalesce(auth.jwt() ->> 'email', '')) = 'namehope.goodvibe@gmail.com'
);
