# ChadWallet Web Assessment

A polished Solana discovery and trading experience built with Next.js 16,
Tailwind CSS, Privy, Birdeye, Alchemy, Jupiter and Lightweight Charts.

## Run locally

```bash
npm install --legacy-peer-deps
copy .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The app is intentionally reviewable without provider credentials:

- Authentication uses a local demo session when `NEXT_PUBLIC_PRIVY_APP_ID` is
  absent.
- Market routes use deterministic live-shaped data when Birdeye is unavailable.
- Live trading is disabled unless `NEXT_PUBLIC_ENABLE_LIVE_TRADING=true`.

Provider credentials switch the same interface to live integrations; see
`.env.example`.

## Provider setup

1. Create a Privy application, enable Google and Apple, and configure Solana
   embedded wallets.
2. Add a Birdeye Data API key for token intelligence.
3. Add an Alchemy Solana mainnet RPC URL for balances and confirmations.
4. Add a Jupiter API key for production quote limits.
5. Optionally add Supabase for profiles, watchlists and recently viewed tokens.
   Apply `supabase/migrations/001_chadwallet_profiles.sql` before adding the
   service-role credentials.

All private credentials are consumed by server route handlers only.

## Quality checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Deployment

Vercel is the primary target. Add the variables from `.env.example` separately
for Preview and Production. Keep live trading off in Preview. Configure Privy
OAuth origins and a stable HTTPS domain before enabling cookie sessions or
executing a controlled small-value mainnet QA swap.

## Important

This is an assessment implementation. Market data can be delayed and is not
financial advice. Never enter a seed phrase or private key. Review every wallet
transaction before signing.
