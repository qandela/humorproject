// Local-only test service. Never imported by the application or deployed as a route.
import { createServer } from "node:http";
import { createHash, randomUUID } from "node:crypto";

export const userId = "11111111-1111-4111-8111-111111111111";
const otherId = "22222222-2222-4222-8222-222222222222";
const firstId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const secondId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const requestId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const requestB = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
export const captionId = firstId;
export const fixtureCaption = "My study group has a playlist, a group chat, and absolutely no progress.";
export const token = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: userId, role: "authenticated", exp: Math.floor(Date.now()/1000) + 3600 })).toString("base64url")}.fixture-signature`;
const user = { id: userId, aud: "authenticated", role: "authenticated", email: "test-member@example.test", app_metadata: { provider: "google" }, user_metadata: {}, created_at: new Date().toISOString() };
export function sessionCookie() {
  return "base64-" + Buffer.from(JSON.stringify({ access_token: token, refresh_token: "local-fixture-refresh", expires_at: Math.floor(Date.now()/1000)+3600, expires_in: 3600, token_type: "bearer", user })).toString("base64url");
}

export async function startFixture() {
  const votes = new Map();
  let authorization = null;
  const created = new Date(Date.now()-60000).toISOString();
  const scenes = [
    { id: firstId, request_id: requestId, scene: "My study group spent two hours choosing a playlist instead of studying.", topic: "Campus", tone: "Dry", content: fixtureCaption, model: "fixture-only", created_at: created },
    { id: secondId, request_id: requestB, scene: "I led my friends onto the subway, confidently, in the wrong direction.", topic: "NYC weekends", tone: "Chaotic", content: "Taking the scenic route was not in the itinerary. Neither was the character development.", model: "fixture-only", created_at: created },
  ];
  const requests = [{ id: requestId, user_id: userId, scene: scenes[0].scene, topic: "Campus", tone: "Dry", status: "completed", created_at: created }];
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    let body = "";
    for await (const part of req) body += part;
    let input = {};
    try { input = body ? JSON.parse(body) : {}; } catch {}
    const authenticated = req.headers.authorization === `Bearer ${token}`;
    function send(status, payload) {
      res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end(payload === null ? "" : JSON.stringify(payload));
    }
    if (url.pathname === "/auth/v1/authorize") {
      const target = new URL(url.searchParams.get("redirect_to"));
      if (target.origin !== "http://localhost:3001" || target.pathname !== "/auth/callback") return send(400, { message: "Invalid fixture callback" });
      authorization = { code: randomUUID(), challenge: url.searchParams.get("code_challenge") };
      target.searchParams.set("code", authorization.code);
      res.writeHead(302, { Location: target.toString() });
      return res.end();
    }
    if (url.pathname === "/auth/v1/token") {
      const challenge = createHash("sha256").update(input.code_verifier ?? "").digest("base64url");
      if (!authorization || input.auth_code !== authorization.code || challenge !== authorization.challenge) return send(400, { message: "Invalid fixture PKCE exchange" });
      authorization = null;
      return send(200, { access_token: token, refresh_token: "local-fixture-refresh", expires_in: 3600, token_type: "bearer", user });
    }
    if (url.pathname === "/auth/v1/user") return send(authenticated ? 200 : 401, authenticated ? user : { message: "Not signed in" });
    if (url.pathname === "/auth/v1/logout") return send(204, null);
    if (url.pathname === "/rest/v1/rpc/get_caption_feed") {
      const rows = scenes.filter(row => (!input.p_caption_id || row.id === input.p_caption_id) && (!input.p_topic || input.p_topic === "all" || row.topic === input.p_topic)).map(row => ({
        ...row, score: votes.get(row.id) ?? 0, vote_count: votes.has(row.id) ? 1 : 0,
        my_vote: authenticated ? votes.get(row.id) ?? null : null,
        prompt: authenticated && row.id === firstId ? "Local UI fixture prompt; not a real generation." : null,
      }));
      if (input.p_sort === "top" || input.p_sort === "today") rows.sort((a,b) => b.score-a.score);
      return send(200, rows);
    }
    if (url.pathname === "/rest/v1/rpc/reserve_generation") return send(400, { code: "P0001", message: "Local UI fixture deliberately simulates an unavailable reservation." });
    if (url.pathname === "/rest/v1/generation_requests") {
      if (!authenticated) return send(401, { code: "42501" });
      const id = url.searchParams.get("id")?.replace(/^eq\./, "");
      return send(200, requests.filter(row => !id || row.id === id));
    }
    if (url.pathname === "/rest/v1/captions") return send(200, scenes.filter(row => row.request_id === requestId));
    if (url.pathname === "/rest/v1/votes") {
      if (!authenticated) return send(401, { code: "42501" });
      if (req.method === "POST") {
        if (input.user_id !== userId || !scenes.some(row => row.id === input.caption_id) || ![1,-1].includes(input.value)) return send(403, { code: "42501" });
        if (votes.has(input.caption_id)) return send(409, { code: "23505" });
        votes.set(input.caption_id, input.value);
        return send(201, null);
      }
      const id = url.searchParams.get("caption_id")?.replace(/^eq\./, "");
      return send(200, votes.has(id) ? [{ value: votes.get(id) }] : []);
    }
    if (url.pathname === "/rest/v1/profiles") return send(200, [{ first_name: "Sam", last_name: null, avatar_path: null }]);
    if (url.pathname === "/rest/v1/jokes") return send(200, []);
    send(404, { message: "Unsupported local fixture endpoint" });
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  return { server, port: server.address().port, votes };
}
