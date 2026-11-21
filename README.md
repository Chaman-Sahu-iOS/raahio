# Raahio

A mobile-first travel companion: plan, track, checklists, reminders, budget, map & routes, and a voice + AI assistant. Built for family trips, with shared editing via a trip code.

Live: https://raahio.netlify.app

## Structure

```
public/index.html            Built app (served by Netlify)
src/app.js, src/style.css    App source
scripts/build.py             Rebuilds public/index.html from src/
netlify/functions/state.mjs  Shared trip storage (Netlify Blobs), keyed by a hash of the trip code
netlify/functions/ai.mjs     AI proxy to OpenRouter (key stays server-side)
netlify.toml                 Netlify config
```

## Develop and deploy

```bash
npm install
python3 scripts/build.py          # after editing src/
npx netlify-cli deploy --prod
```

## Environment variables (Netlify → Project configuration → Environment variables)

| Name | Required | Purpose |
|---|---|---|
| `OPENROUTER_API_KEY` | for AI | OpenRouter key (`sk-or-...`) |
| `OPENROUTER_MODEL` | no | Default `openai/gpt-4o-mini` |
| `AI_HOURLY_LIMIT` | no | AI requests per trip code per hour (default 120) |

## Using it

1. Open the site → **Create a new code** → **Open trip**.
2. **Restore from backup file** to load a trip (backup files are not committed to this repo).
3. **More → Settings → Copy share link** to share with family.

Trip data never lives in this repository or in the page HTML; it is stored in Netlify Blobs behind the trip code.
