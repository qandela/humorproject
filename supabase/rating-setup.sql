-- Week 4. Run AFTER setup.sql and auth-setup.sql in the SAME Supabase project.
-- Existing profiles, photos, and jokes are preserved. Safe to re-run.
begin;

create table if not exists public.generation_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scene text not null check (char_length(scene) between 12 and 400),
  topic text not null check (topic in ('Campus', 'Dorm life', 'NYC weekends')),
  tone text not null check (tone in ('Dry', 'Chaotic', 'Wholesome')),
  prompt text not null check (char_length(prompt) between 12 and 5000),
  model text not null check (char_length(model) between 1 and 100),
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  created_at timestamptz not null default now()
);
create index if not exists generation_requests_user_time on public.generation_requests (user_id, created_at desc);

create table if not exists public.captions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.generation_requests(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 240),
  created_at timestamptz not null default now()
);
create index if not exists captions_time on public.captions (created_at desc);

create table if not exists public.votes (
  user_id uuid not null references auth.users(id) on delete cascade,
  caption_id uuid not null references public.captions(id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (user_id, caption_id)
);
create index if not exists votes_caption on public.votes (caption_id);

-- Enable RLS on every application table, including any other public tables.
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;

-- Replace the known application's policies, avoiding additive permissive policies.
do $$
declare p record;
begin
  for p in select tablename, policyname from pg_policies
    where schemaname = 'public' and tablename in ('jokes', 'profiles', 'generation_requests', 'captions', 'votes') loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

revoke all on public.jokes, public.profiles, public.generation_requests, public.captions, public.votes from anon, authenticated;
grant usage on schema public to anon, authenticated;

-- Existing public collection remains read-only.
grant select on public.jokes to anon, authenticated;
create policy "Public joke reads" on public.jokes for select to anon, authenticated using (true);

-- Profiles remain private to their owners; avatar storage policies from Week 3 remain in place.
grant select, insert, update on public.profiles to authenticated;
create policy "Read own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "Create own profile" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "Update own profile" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Generation prompts and ownership stay private. Writes go through narrow RPCs below.
grant select on public.generation_requests to authenticated;
create policy "Read own generations" on public.generation_requests for select to authenticated
  using ((select auth.uid()) = user_id);
grant select on public.captions to anon, authenticated;
create policy "Public caption reads" on public.captions for select to anon, authenticated using (true);

-- A vote is a new immutable row. The primary key prevents duplicate votes.
grant select on public.votes to authenticated;
grant insert (user_id, caption_id, value) on public.votes to authenticated;
create policy "Read own votes" on public.votes for select to authenticated using ((select auth.uid()) = user_id);
create policy "Insert own votes" on public.votes for insert to authenticated with check ((select auth.uid()) = user_id);

-- Reserve an attempt before contacting AI. The lock prevents concurrent quota bypass.
create or replace function public.reserve_generation(p_scene text, p_topic text, p_tone text, p_prompt text, p_model text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); request_id uuid;
begin
  if actor is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_scene is null or char_length(trim(p_scene)) not between 12 and 400
    or p_topic is null or p_topic not in ('Campus', 'Dorm life', 'NYC weekends')
    or p_tone is null or p_tone not in ('Dry', 'Chaotic', 'Wholesome')
    or p_prompt is null or char_length(p_prompt) not between 12 and 5000
    or p_model is null or char_length(p_model) not between 1 and 100 then
    raise exception 'invalid_generation';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text, 0));
  if (select count(*) from public.generation_requests where user_id = actor and created_at > now() - interval '24 hours') >= 10 then
    raise exception 'generation_limit';
  end if;
  insert into public.generation_requests (user_id, scene, topic, tone, prompt, model)
    values (actor, trim(p_scene), p_topic, p_tone, p_prompt, p_model) returning id into request_id;
  return request_id;
end $$;

-- Publish and complete a reservation in one transaction. A reservation yields at most one caption.
create or replace function public.publish_caption(p_request_id uuid, p_content text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); result_id uuid; owned_request uuid;
begin
  if actor is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  select id into owned_request from public.generation_requests
    where id = p_request_id and user_id = actor and status = 'pending' for update;
  if owned_request is null then raise exception 'generation_unavailable' using errcode = '42501'; end if;
  if p_content is null or char_length(trim(p_content)) not between 1 and 240 then raise exception 'invalid_caption'; end if;
  insert into public.captions (request_id, content) values (owned_request, trim(p_content)) returning id into result_id;
  update public.generation_requests set status = 'completed' where id = owned_request;
  return result_id;
end $$;

create or replace function public.fail_generation(p_request_id uuid)
returns void language sql security definer set search_path = '' as $$
  update public.generation_requests set status = 'failed'
    where id = p_request_id and user_id = auth.uid() and status = 'pending';
$$;

-- Only aggregate votes are public. Individual voter IDs and other users' prompts never leave this function.
create or replace function public.get_caption_feed(p_sort text default 'new', p_topic text default 'all', p_caption_id uuid default null)
returns table (
  id uuid, scene text, topic text, tone text, content text, model text,
  created_at timestamptz, score bigint, vote_count bigint, my_vote smallint, prompt text
) language sql stable security definer set search_path = '' as $$
  select c.id, r.scene, r.topic, r.tone, c.content, r.model, c.created_at,
    coalesce(t.score, 0), coalesce(t.vote_count, 0), mine.value,
    case when r.user_id = auth.uid() then r.prompt else null end
  from public.captions c
  join public.generation_requests r on r.id = c.request_id
  left join lateral (
    select sum(v.value)::bigint as score, count(*) as vote_count from public.votes v where v.caption_id = c.id
  ) t on true
  left join public.votes mine on mine.caption_id = c.id and mine.user_id = auth.uid()
  where (p_topic = 'all' or r.topic = p_topic)
    and (p_caption_id is null or c.id = p_caption_id)
    and (p_sort <> 'today' or c.created_at >= (date_trunc('day', now() at time zone 'America/New_York') at time zone 'America/New_York'))
  order by case when p_sort in ('top', 'today') then coalesce(t.score, 0) end desc,
    c.created_at desc, c.id
  limit 60;
$$;

revoke all on function public.reserve_generation(text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.publish_caption(uuid, text) from public, anon, authenticated;
revoke all on function public.fail_generation(uuid) from public, anon, authenticated;
revoke all on function public.get_caption_feed(text, text, uuid) from public, anon, authenticated;
grant execute on function public.reserve_generation(text, text, text, text, text) to authenticated;
grant execute on function public.publish_caption(uuid, text) to authenticated;
grant execute on function public.fail_generation(uuid) to authenticated;
grant execute on function public.get_caption_feed(text, text, uuid) to anon, authenticated;

commit;
