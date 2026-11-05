-- Week 3. Run this in the SAME Supabase project's SQL Editor.
-- Run once before enabling Google sign-in. Safe to run again.
begin;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text check (char_length(first_name) <= 80),
  last_name text check (char_length(last_name) <= 80),
  avatar_path text,
  updated_at timestamptz not null default now(),
  constraint own_avatar_folder check (
    avatar_path is null or avatar_path like (id::text || '/%')
  )
);

alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant usage on schema public to authenticated;
grant select, insert, update on public.profiles to authenticated;

drop policy if exists "Read own profile" on public.profiles;
create policy "Read own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
drop policy if exists "Create own profile" on public.profiles;
create policy "Create own profile" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
drop policy if exists "Update own profile" on public.profiles;
create policy "Update own profile" on public.profiles
  for update to authenticated using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create or replace function public.handle_new_user_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, first_name, last_name)
  values (
    new.id,
    left(nullif(new.raw_user_meta_data ->> 'given_name', ''), 80),
    left(nullif(new.raw_user_meta_data ->> 'family_name', ''), 80)
  ) on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function public.handle_new_user_profile() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user_profile();

-- Also create profiles for users who signed up before this migration.
insert into public.profiles (id, first_name, last_name)
select id,
  left(nullif(raw_user_meta_data ->> 'given_name', ''), 80),
  left(nullif(raw_user_meta_data ->> 'family_name', ''), 80)
from auth.users on conflict (id) do nothing;

-- Photos live in Storage, never in a database bytea/base64 column.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Read own avatar" on storage.objects;
create policy "Read own avatar" on storage.objects
  for select to authenticated using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text
  );
drop policy if exists "Upload own avatar" on storage.objects;
create policy "Upload own avatar" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text
  );
drop policy if exists "Delete own avatar" on storage.objects;
create policy "Delete own avatar" on storage.objects
  for delete to authenticated using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text
  );

commit;
