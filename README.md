# ChadWallet Assessment Submission

ChadWallet is a Solana-first discovery and trading web app. It combines token
discovery, social trading signals, wallet-aware trade flows, Solana market
charts, and ChadWallet-branded landing pages in a Next.js application.

Production: [https://chadwallet.vrivalsarena.com](https://chadwallet.vrivalsarena.com)

This README is written as the main assessment submission document. It explains
what was implemented, which tools and providers were used, how the app is
deployed, how to run it locally, and how to verify the important functionality.

## Submission Links

| Item | Link |
| --- | --- |
| Live app | [https://chadwallet.vrivalsarena.com](https://chadwallet.vrivalsarena.com) |
| Trading page | [https://chadwallet.vrivalsarena.com/trade](https://chadwallet.vrivalsarena.com/trade) |
| GitHub repository | [https://github.com/aditya-2129/chadwallet](https://github.com/aditya-2129/chadwallet) |

## Assessment Review Checklist

For review, start here:

1. Open the live app and confirm the ChadWallet-branded landing/trading flow.
2. Visit `/trade` and confirm the token sidebar, chart, and trade panel layout.
3. Use the chart toolbar to switch intervals, ranges, price/market-cap mode,
   indicators, log scale, fullscreen, and snapshot download.
4. Confirm public API routes return successful responses, especially
   `/api/market` and `/api/tokens/trending`.
5. Review provider integrations in `src/lib/providers/`.
6. Review deployment config in `vercel.json`.
7. Review environment requirements in `.env.example`.

## What Was Built

- ChadWallet-branded landing experience using the provided app imagery and
  product assets.
- Trading screen with sticky token sidebar, token header, custom chart surface,
  and trade panel.
- Lightweight Charts implementation styled to resemble a TradingView-style
  terminal while using custom Solana OHLCV data.
- Market, token, chart, holder, trade, wallet, watchlist, quote, order, and
  execute API routes.
- Provider adapters for Birdeye, Alchemy Solana RPC, Jupiter, Privy, and
  Supabase.
- Vercel production deployment for the app.
- Cloudflare-backed custom subdomain on `vrivalsarena.com`.
- Production environment variables configured in Vercel.
- Vercel install configuration for the current npm peer dependency constraints.

## Scope Covered

The implementation covers the main assessment expectations:

- Branded ChadWallet UI.
- Mobile-app-oriented product sections using the supplied assets.
- Trading-focused application screen.
- Solana token discovery and market data.
- Custom chart implementation using live-shaped OHLCV data.
- Provider-backed API routes with fallback behavior where appropriate.
- Production deployment on a real subdomain.
- Documented local setup, deployment setup, and verification steps.

Out of scope for this version:

- Real TradingView Advanced Charts, because the official library requires
  licensed private access.
- Production-enabled live trading by default. Live trading remains gated behind
  `NEXT_PUBLIC_ENABLE_LIVE_TRADING=true`.
- Full broker-style terminal behavior such as advanced drawing tools,
  order-book depth, or custom social overlays on the chart.

## Live Deployment

| Item | Value |
| --- | --- |
| Production URL | `https://chadwallet.vrivalsarena.com` |
| Vercel team | `aditya-fulzeles-projects` |
| Vercel project | `chadwallet-app` |
| Vercel project id | `prj_NWaD9Z9JAalfCWTUrm1yMaiITqrC` |
| Latest production deployment | `dpl_4Dtqjpa4ocwhj4JNBrAqJEbiMxug` |
| Deployment URL | `https://chadwallet-c5kg27cy8-aditya-fulzeles-projects.vercel.app` |
| Domain provider | Cloudflare nameservers |
| Public domain status | Verified and configured correctly in Vercel |

Smoke checks performed after deployment:

- `/` returned `200`
- `/trade` returned `200`
- `/api/market` returned `200`
- `/api/tokens/trending` returned `200`
- Response headers confirmed Cloudflare in front of Vercel:
  `Server: cloudflare`, `X-Vercel-Cache`, and `X-Vercel-Id`

## Tech Stack

### Frontend

- [Next.js 16](https://nextjs.org/) App Router
- React 19
- Tailwind CSS 4
- Lucide React icons
- Motion
- Lightweight Charts

### Authentication And Wallets

- [Privy](https://privy.io/) for user authentication and embedded wallet flows.
- Local demo mode when Privy credentials are not present.

### Market And Trading Data

- [Birdeye Data API](https://birdeye.so/data-api) for Solana token metadata,
  market data, OHLCV candles, trades, holders, and decimals.
- [Alchemy Solana RPC](https://www.alchemy.com/rpc-api) for wallet balances,
  token accounts, and transaction confirmation checks.
- [Jupiter](https://developers.jup.ag/docs/get-started) for quote, order, and
  swap execution routes.

### Persistence

- [Supabase](https://supabase.com/) for optional profiles, watchlists, and
  recently viewed tokens.
- The app can still run without Supabase credentials, using graceful fallbacks.

### Hosting And Edge

- [Vercel](https://vercel.com/) for Next.js hosting and serverless API routes.
- [Cloudflare](https://www.cloudflare.com/) for DNS, proxying, TLS edge, and
  traffic protection on `vrivalsarena.com`.
- Wrangler is installed locally as a dev dependency so Cloudflare work can be
  managed from this repository.

### Development Tools

- TypeScript
- ESLint
- Vitest
- npm
- Vercel CLI
- Wrangler CLI
- AI-assisted implementation and verification through Codex

## Chart Implementation

The chart currently uses `lightweight-charts`, not TradingView Advanced Charts.

Why:

- TradingView Advanced Charts / Charting Library is not a public npm package.
- The official library requires licensed private access from TradingView.
- The project needed custom Solana token OHLCV data, which rules out a simple
  public TradingView embed.
- Lightweight Charts is open source and directly usable with custom data.

Implemented chart features:

- Candlestick chart
- Line chart toggle
- Volume histogram
- Timeframes: `1m`, `5m`, `15m`, `1h`, `4h`, `1d`
- Ranges: `1D`, `1W`, `1M`, `3M`, `1Y`
- Price and market-cap display modes
- Log scale toggle
- Percent scale toggle
- Auto-scale toggle
- Jump-to-live action
- Snapshot download
- Fullscreen action
- Settings menu for chart options
- Indicator menu with simple overlays such as SMA, EMA, and VWAP

Files involved:

- `src/components/trading/tradingview-advanced-chart.tsx`
- `src/components/trading/trade-shell.tsx`
- `src/app/api/token/[mint]/chart/route.ts`
- `src/app/api/tokens/[mint]/ohlcv/route.ts`
- `src/lib/providers/trading.ts`
- `src/lib/providers/birdeye.ts`

Note: the component export is still named `TradingViewAdvancedChart` for
compatibility with the existing import path, but the runtime implementation is
the custom Lightweight Charts version.

There is also a tested `src/lib/tradingview/` datafeed adapter kept for the
future licensed TradingView Advanced Charts path. It is not used by the current
runtime UI, but it documents the intended datafeed shape for custom Solana
OHLCV candles if the official private TradingView library is provided later.

## API Routes

The app exposes these route groups:

- `/api/market`
- `/api/recent-tokens`
- `/api/swap/order`
- `/api/swap/execute`
- `/api/token/[mint]`
- `/api/token/[mint]/chart`
- `/api/token/[mint]/holders`
- `/api/token/[mint]/position`
- `/api/token/[mint]/trades`
- `/api/tokens/[mint]`
- `/api/tokens/[mint]/ohlcv`
- `/api/tokens/[mint]/holders`
- `/api/tokens/[mint]/trades`
- `/api/tokens/trending`
- `/api/trade/quote`
- `/api/trade/order`
- `/api/trade/execute`
- `/api/wallet/[address]/positions`
- `/api/watchlist`

## Environment Variables

Create `.env.local` from `.env.example` for local development.

Required for the full live app:

```env
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_PRIVY_APP_ID=
PRIVY_APP_SECRET=

BIRDEYE_API_KEY=

ALCHEMY_SOLANA_RPC_URL=
ALCHEMY_SOLANA_WS_URL=

JUPITER_API_KEY=
NEXT_PUBLIC_ENABLE_LIVE_TRADING=false

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWKS_URL=

NEXT_PUBLIC_TRADINGVIEW_LIBRARY_PATH=
```

Optional:

```env
SENTRY_DSN=
```

Production values are configured in Vercel for `chadwallet-app`. Do not commit
`.env.local`, `.env.production.local`, `.vercel`, or any secret values.

## Local Development

Install dependencies:

```bash
npm install --legacy-peer-deps
```

Run the dev server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Useful routes:

- `http://localhost:3000`
- `http://localhost:3000/trade`
- `http://localhost:3000/trade/So11111111111111111111111111111111111111112`

## Quality Checks

Run before shipping:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Checks already performed during the latest deployment work:

- `npm run typecheck` passed
- `npm run lint` passed
- `npm test` passed during chart implementation
- `npm run build` passed locally
- Vercel production build passed
- Browser and HTTP smoke checks passed against the production domain

## Deployment

The app deploys to Vercel.

The repository includes `vercel.json`:

```json
{
  "installCommand": "npm install --legacy-peer-deps"
}
```

This is required because Vercel's default `npm install` fails on the current
peer dependency conflict between `@privy-io/node` and `@solana/kit`.

Deploy production:

```bash
npx vercel deploy --prod --yes --scope aditya-fulzeles-projects
```

Inspect the latest deployment:

```bash
npx vercel inspect chadwallet-c5kg27cy8-aditya-fulzeles-projects.vercel.app --scope aditya-fulzeles-projects
```

Verify the custom domain:

```bash
npx vercel domains verify chadwallet.vrivalsarena.com --scope aditya-fulzeles-projects
```

## Cloudflare

Cloudflare is used for the `vrivalsarena.com` DNS zone and edge proxy.

Current public subdomain:

```text
chadwallet.vrivalsarena.com
```

Current nameservers for the root domain:

```text
arnold.ns.cloudflare.com
vida.ns.cloudflare.com
```

Wrangler is installed in this repo:

```bash
npx wrangler --version
```

Authenticated Wrangler user during setup:

```text
aditya210399@gmail.com
```

Cloudflare can be used later for:

- WAF rules for `/api/*`
- Rate limiting for expensive provider-backed APIs
- Bot protection with Turnstile
- Workers for cached market-data proxying
- Cron jobs for token metadata refresh
- R2 for public assets or generated images

## Brand Assets

ChadWallet assets were added under:

```text
public/brand/
```

These include app screenshots, feature images, and the `chadwallet.mp4` video
used by the landing page and product sections.

## Important Notes

- Live trading is disabled unless `NEXT_PUBLIC_ENABLE_LIVE_TRADING=true`.
- The app should not ask for seed phrases or private keys.
- Market data may be delayed or unavailable depending on provider limits.
- Birdeye, Alchemy, Jupiter, Privy, and Supabase credentials should be rotated
  if they were ever exposed outside secure env storage.
- Trading and token information is not financial advice.

## Repository Hygiene

Keep committed:

- Source code
- Public brand assets
- `package.json`
- `package-lock.json`
- `vercel.json`
- Documentation

Keep uncommitted:

- `.env*`
- `.vercel`
- local build artifacts
- generated cache folders
- unrelated local agent/tooling folders
