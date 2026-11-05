-- Run this file in your Supabase project's SQL Editor.
-- Re-running it preserves existing jokes and avoids duplicate seed rows.
begin;

create table if not exists public.jokes (
  id bigint generated always as identity primary key,
  category text not null,
  setup text not null unique,
  punchline text not null,
  created_at timestamptz not null default now()
);

alter table public.jokes enable row level security;
grant usage on schema public to anon;
revoke all on table public.jokes from anon, authenticated;
grant select on table public.jokes to anon;

drop policy if exists "Anyone can read jokes" on public.jokes;
create policy "Anyone can read jokes"
  on public.jokes for select to anon using (true);

insert into public.jokes (category, setup, punchline) values
  ('Programming', 'Why do programmers prefer dark mode?', 'Because light attracts bugs.'),
  ('Food', 'What do you call a fake noodle?', 'An impasta.'),
  ('Science', 'Why can you never trust an atom?', 'Because they make up everything.'),
  ('Programming', 'Why did the developer go broke?', 'Because they used up all their cache.'),
  ('Animals', 'What do you call a bear with no teeth?', 'A gummy bear.'),
  ('Everyday', 'Why did the bicycle fall over?', 'It was two-tired.')
on conflict (setup) do nothing;

commit;
