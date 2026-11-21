import { getStore } from "@netlify/blobs";

// Trip documents (tickets, bookings). Files are stored per trip, behind the trip code.
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = /^(application\/pdf|image\/(png|jpe?g|webp|heic|heif))$/i;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

async function keyFor(code) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("yatra:" + code));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}
const safeName = (s) => String(s || "document").replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "document";

export default async (req) => {
  const url = new URL(req.url);
  const code = (url.searchParams.get("k") || "").trim();
  const id = (url.searchParams.get("id") || "").replace(/[^\w-]/g, "");
  if (code.length < 8 || !id) return json({ error: "Trip code and file id required" }, 400);
  const hash = await keyFor(code);
  const trips = getStore({ name: "yatra-trips", consistency: "strong" });
  if (!(await trips.get(hash))) return json({ error: "Unknown trip code" }, 403);
  const files = getStore({ name: "yatra-files", consistency: "strong" });
  const key = hash + "/" + id;

  if (req.method === "GET") {
    const r = await files.getWithMetadata(key, { type: "arrayBuffer" });
    if (!r) return json({ error: "File not found" }, 404);
    const name = safeName(url.searchParams.get("name") || r.metadata?.name);
    const disp = url.searchParams.get("dl") ? "attachment" : "inline";
    return new Response(r.data, {
      headers: {
        "content-type": r.metadata?.type || "application/octet-stream",
        "content-disposition": `${disp}; filename="${name}"`,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  }

  if (req.method === "PUT") {
    const type = (req.headers.get("content-type") || "").split(";")[0].trim();
    if (!ALLOWED.test(type)) return json({ error: "Only PDF or image files are allowed" }, 415);
    const buf = await req.arrayBuffer();
    if (!buf.byteLength) return json({ error: "Empty file" }, 400);
    if (buf.byteLength > MAX_BYTES) return json({ error: "File is larger than 5 MB" }, 413);
    await files.set(key, buf, { metadata: { type, name: safeName(url.searchParams.get("name")), size: buf.byteLength } });
    return json({ ok: true, size: buf.byteLength });
  }

  return json({ error: "Method not allowed" }, 405);
};

export const config = { path: "/api/files" };
