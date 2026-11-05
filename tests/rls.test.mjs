import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

test("PostgreSQL enforces caption ownership, vote constraints, quotas, and private data", async () => {
  const db = new PGlite();
  try {
    // Minimal Supabase-owned infrastructure; application SQL is run unchanged.
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth; create schema storage;
      create table auth.users (id uuid primary key, raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth to anon, authenticated;
      create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
      create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
      alter table storage.objects enable row level security;
      create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name, '/') $$;
      grant usage on schema storage to authenticated;
      grant select, insert, delete on storage.objects to authenticated;
    `);
    for (const file of ["setup.sql", "auth-setup.sql", "rating-setup.sql"]) {
      await db.exec(await readFile(new URL(`../supabase/${file}`, import.meta.url), "utf8"));
    }
    // Re-running the migration must preserve a valid schema.
    await db.exec(await readFile(new URL("../supabase/rating-setup.sql", import.meta.url), "utf8"));
    await db.query("insert into auth.users (id) values ($1), ($2)", [A, B]);
    const actor = async (id = null) => {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id ?? ""]);
      await db.exec(id ? "set role authenticated" : "set role anon");
    };
    const reserve = async () => (await db.query(
      "select public.reserve_generation($1, $2, $3, $4, $5) as id",
      ["A very relatable campus scene", "Campus", "Dry", "A private prompt used to generate this scene", "test-model"]
    )).rows[0].id;

    await actor();
    assert.equal((await db.query("select * from public.jokes")).rows.length, 6);
    await assert.rejects(() => db.query("select * from public.profiles"));
    await assert.rejects(() => db.query("select * from public.generation_requests"));
    await assert.rejects(reserve);
    await assert.rejects(() => db.query("select public.publish_caption(gen_random_uuid(), 'fake')"));

    await actor(A);
    assert.equal((await db.query("select * from public.profiles")).rows.length, 1);
    const requestId = await reserve();
    await actor(B);
    assert.equal((await db.query("select * from public.generation_requests")).rows.length, 0);
    await assert.rejects(() => db.query("select public.publish_caption($1, 'Stolen caption')", [requestId]));
    await actor(A);
    const captionId = (await db.query("select public.publish_caption($1, $2) as id", [requestId, "My commute has more plot twists than my group chat."])).rows[0].id;
    assert.equal((await db.query("select status from public.generation_requests where id = $1", [requestId])).rows[0].status, "completed");
    await assert.rejects(() => db.query("select public.publish_caption($1, 'Second caption')", [requestId]));
    await assert.rejects(() => db.query("insert into public.captions (request_id, content) values ($1, 'Bypass')", [requestId]));
    await assert.rejects(() => db.query("insert into public.generation_requests (user_id,scene,topic,tone,prompt,model) values ($1,'Fake campus scene','Campus','Dry','Bypass quota prompt','test')", [A]));

    await db.query("insert into public.votes (user_id, caption_id, value) values ($1,$2,1)", [A, captionId]);
    await assert.rejects(() => db.query("insert into public.votes (user_id, caption_id, value) values ($1,$2,-1)", [A, captionId]));
    await assert.rejects(() => db.query("insert into public.votes (user_id, caption_id, value) values ($1,$2,1)", [B, captionId]));
    await assert.rejects(() => db.query("update public.votes set value=-1 where caption_id=$1", [captionId]));
    await assert.rejects(() => db.query("delete from public.votes where caption_id=$1", [captionId]));
    const owned = (await db.query("select * from public.get_caption_feed('new','all',null)")).rows[0];
    assert.equal(owned.my_vote, 1);
    assert.match(owned.prompt, /private prompt/);

    await actor(B);
    assert.equal((await db.query("select * from public.votes")).rows.length, 0);
    await assert.rejects(() => db.query("insert into public.votes (user_id, caption_id, value) values ($1,$2,0)", [B, captionId]));
    await assert.rejects(() => db.query("insert into public.votes (user_id, caption_id, value) values ($1,gen_random_uuid(),1)", [B]));
    await db.query("insert into public.votes (user_id, caption_id, value) values ($1,$2,-1)", [B, captionId]);
    const other = (await db.query("select * from public.get_caption_feed('top','Campus',null)")).rows[0];
    assert.equal(other.prompt, null);
    assert.equal(other.my_vote, -1);
    assert.equal(Number(other.score), 0);
    assert.equal(Number(other.vote_count), 2);
    assert.equal((await db.query("select * from public.get_caption_feed('new','Dorm life',null)")).rows.length, 0);
    assert.equal((await db.query("update public.profiles set first_name='Changed' where id=$1 returning id", [A])).rows.length, 0);
    await db.query("insert into storage.objects (bucket_id,name) values ('avatars',$1)", [`${B}/photo.png`]);
    await assert.rejects(() => db.query("insert into storage.objects (bucket_id,name) values ('avatars',$1)", [`${A}/photo.png`]));

    await actor();
    const publicRow = (await db.query("select * from public.get_caption_feed('new','all',$1)", [captionId])).rows[0];
    assert.equal(publicRow.prompt, null);
    assert.equal(publicRow.my_vote, null);
    assert.equal(Number(publicRow.vote_count), 2);
    await assert.rejects(() => db.query("select * from public.votes"));
    await assert.rejects(() => db.query("insert into public.votes (user_id,caption_id,value) values ($1,$2,1)", [A, captionId]));

    await actor(A);
    const failedRequest = await reserve();
    await db.query("select public.fail_generation($1)", [failedRequest]);
    assert.equal((await db.query("select status from public.generation_requests where id=$1", [failedRequest])).rows[0].status, "failed");
    await assert.rejects(() => db.query("select public.publish_caption($1, 'Cannot publish a failed attempt')", [failedRequest]));
    for (let i=0; i<8; i++) await reserve();
    await assert.rejects(reserve, /generation_limit/);
    await db.exec("reset role");
    const unprotected = await db.query("select tablename from pg_tables where schemaname='public' and not rowsecurity");
    assert.equal(unprotected.rows.length, 0);
    await db.exec(await readFile(new URL("../supabase/rating-setup.sql", import.meta.url), "utf8"));
    assert.equal((await db.query("select * from public.votes")).rows.length, 2);
    assert.equal((await db.query("select * from public.captions")).rows.length, 1);
    assert.equal((await db.query("select * from public.generation_requests")).rows.length, 10);
  } finally {
    await db.close();
  }
});
