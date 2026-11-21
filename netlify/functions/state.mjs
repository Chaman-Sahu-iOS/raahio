import { getStore } from "@netlify/blobs";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

async function keyFor(code) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("yatra:" + code));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

export default async (req) => {
  const code = (new URL(req.url).searchParams.get("k") || "").trim();
  if (code.length < 8) return json({ error: "Trip code must be at least 8 characters" }, 400);
  const key = await keyFor(code);
  const store = getStore({ name: "yatra-trips", consistency: "strong" });

  if (req.method === "GET") {
    const rec = await store.get(key, { type: "json" });
    return json(rec || { updatedAt: 0, state: null });
  }

  if (req.method === "PUT") {
    let body;
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
    const state = body && body.state;
    if (!state || !Array.isArray(state.trips)) return json({ error: "Missing trips" }, 400);
    const size = JSON.stringify(state).length;
    if (size > 2_000_000) return json({ error: "Trip data too large" }, 413);
    const cur = await store.get(key, { type: "json" });
    // Someone else saved after this device last loaded: send their version back.
    if (cur && typeof body.base === "number" && cur.updatedAt > body.base) return json(cur, 409);
    const rec = { updatedAt: Number(state.updatedAt) || Date.now(), state };
    await store.setJSON(key, rec);
    return json({ ok: true, updatedAt: rec.updatedAt });
  }

  return json({ error: "Method not allowed" }, 405);
};

export const config = { path: "/api/state" };
