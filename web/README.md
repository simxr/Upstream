# Upstream web

The frontend is a statically exported Next.js application. It reads build-time copies of `data/feed.json` and `data/journey.json`, stores personal tracker state in browser local storage, and pre-renders `/journey/<slug>`.

```bash
npm install
npm run dev
npm run check
npm run build
```

The `sync-feed` script copies both root JSON artifacts into `public/` before development and production builds. Browsing and manual tracking require no credentials. Optional PR sync accepts a fine-grained read-only token, keeps it in `sessionStorage` for the current tab, and sends it only to `api.github.com`.
