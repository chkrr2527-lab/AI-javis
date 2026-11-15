# Trading Vision AI – Cloudflare Worker

This Worker receives a chart image from the GitHub Pages app and forwards it to Gemini Vision.

## Required secret
Create a Cloudflare Worker Secret named `GEMINI_API_KEY`. Never put the key in frontend files or GitHub.

## Deploy
1. Create a Worker in the Cloudflare dashboard.
2. Paste the contents of `index.js` into the Worker editor.
3. Add `GEMINI_API_KEY` under Settings → Variables and Secrets → Add → Secret.
4. Deploy.
5. Open `https://YOUR-WORKER.YOUR-SUBDOMAIN.workers.dev/health`. It should return JSON with `ok: true` and `apiKeyConfigured: true`.
6. Configure the frontend API endpoint after deployment.

## Endpoints
- GET /health – health check; does not reveal the secret.
- POST /analyze – accepts JSON with imageBase64, mimeType, symbol, timeframe, tradeStyle, currentPrice, notes.

## Important
- This first version analyzes the uploaded image only. It does not connect a live XAUUSD price feed.
- Free Gemini API tier limits may apply. Google states free-tier content may be used to improve its products; avoid sending account numbers, balances, or other private information.
- This is an analysis aid, not financial advice and not an automated trading system.
