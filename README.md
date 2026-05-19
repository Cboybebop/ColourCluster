# ColourCluster

ColourCluster is a lightweight swipe-and-merge browser game designed to deploy fast on Vercel.

## Vercel-optimized setup

- Static front-end served from `index.html`.
- Serverless API route at `api/highscores.js` for global leaderboard support.
- Clean URL + security headers configured in `vercel.json`.
- Open Graph + Twitter metadata and SVG favicon included for social sharing.

## Local development

Open `index.html` directly, or run any static server:

```bash
python -m http.server 8080
```

Then visit <http://localhost:8080>.

## Deploy to Vercel

1. Import this repo into Vercel.
2. (Optional but recommended) add Vercel KV / Upstash REST variables:
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
3. Deploy.

Without KV variables, the game still works and leaderboard requests gracefully fall back to demo mode.

## Files of interest

- `index.html` – game UI and client logic
- `api/highscores.js` – global high score API
- `favicon.svg` – site icon
- `og-image.svg` – social preview image
- `vercel.json` – deployment/runtime headers and URL behavior
