import { getStore } from "@netlify/blobs";

// The OpenRouter key stays on the server. Set it in Netlify:
// Project configuration → Environment variables → OPENROUTER_API_KEY
// Optional: OPENROUTER_MODEL (default openai/gpt-4o-mini), AI_HOURLY_LIMIT (default 120 per trip code)
const env = (k) => globalThis.Netlify?.env?.get(k) ?? process.env[k];

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
  const apiKey = env("OPENROUTER_API_KEY");
  const url = new URL(req.url);
  if (req.method === "GET") return json({ enabled: !!apiKey, model: env("OPENROUTER_MODEL") || "openai/gpt-4o-mini" });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!apiKey) return json({ error: "AI is not set up yet. Add OPENROUTER_API_KEY in Netlify." }, 503);

  // Only people who have a real trip code can use the AI (protects your OpenRouter credit).
  const code = (url.searchParams.get("k") || "").trim();
  if (code.length < 8) return json({ error: "Trip code required" }, 400);
  const hash = await keyFor(code);
  const trips = getStore({ name: "yatra-trips", consistency: "strong" });
  if (!(await trips.get(hash))) return json({ error: "Unknown trip code" }, 403);

  // Simple hourly limit per trip code.
  const limit = Number(env("AI_HOURLY_LIMIT") || 120);
  const usage = getStore({ name: "yatra-ai-usage", consistency: "strong" });
  const slot = hash + ":" + Math.floor(Date.now() / 3600000);
  const used = Number((await usage.get(slot)) || 0);
  if (used >= limit) return json({ error: "Hourly AI limit reached. Try again later." }, 429);
  await usage.set(slot, String(used + 1));

  let body;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const messages = Array.isArray(body.messages) ? body.messages.slice(-40) : [];
  if (!messages.length) return json({ error: "No messages" }, 400);
  const tools = Array.isArray(body.tools) && body.tools.length ? body.tools.slice(0, 20) : undefined;

  const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey,
      "HTTP-Referer": url.origin,
      "X-Title": "Raahio",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env("OPENROUTER_MODEL") || "openai/gpt-4o-mini",
      messages,
      tools,
      max_tokens: 900,
      temperature: 0.3,
    }),
  });
  let d = {};
  try { d = await r.json(); } catch {}
  if (!r.ok) return json({ error: (d.error && d.error.message) || "AI request failed (" + r.status + ")" }, 502);
  const m = (d.choices && d.choices[0] && d.choices[0].message) || {};
  return json({ message: { role: "assistant", content: m.content ?? null, tool_calls: m.tool_calls || undefined } });
};

export const config = { path: "/api/ai" };
