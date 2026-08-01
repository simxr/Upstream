# Upstream web

The frontend is a statically exported Next.js application. It reads a build-time copy of `data/feed.json` and stores personal tracker state in browser local storage.

```bash
npm install
npm run dev
npm run check
npm run build
```

The `sync-feed` script copies the root feed into `public/feed.json` automatically before development and production builds. No GitHub token is exposed to the browser.
