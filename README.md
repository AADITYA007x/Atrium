# Atrium

A living, beating 3D human heart for the browser. Educational only; not medical advice.

## Run locally

```
npm install
npm run dev
```

Open http://localhost:5173. Everything works here except the chat.

## Run locally with the chat

1. Create a file named `.dev.vars` in the project root (it is ignored by git) containing:
   `GEMINI_API_KEY=your-key-here`
2. Then:

```
npm run build
npx wrangler dev
```

Open http://localhost:8787

## Build and deploy

```
npm run build
```

Deployed on Cloudflare Workers from the `main` branch (`wrangler.jsonc`). The site is served
from `dist/`, and `worker/index.js` answers `/api/chat`. Set `GEMINI_API_KEY` as a secret in the
Cloudflare dashboard; `GEMINI_MODEL` is optional.

Sources and licenses are listed in CREDITS.md.
