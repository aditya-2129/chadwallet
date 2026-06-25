import type {
  Holder,
  OhlcvBar,
  TokenDetail,
  TokenSummary,
  TradeEvent,
} from "@/lib/types";

export const SOL_MINT = "So11111111111111111111111111111111111111112";
export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const DEFAULT_TOKEN_MINT = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";

export const fallbackTokens: TokenSummary[] = [
  {
    mint: DEFAULT_TOKEN_MINT,
    name: "Bonk",
    symbol: "BONK",
    price: 0.00002131,
    change24h: 12.84,
    liquidity: 22_840_000,
    marketCap: 1_690_000_000,
    volume24h: 184_200_000,
    verified: true,
    rank: 1,
  },
  {
    mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
    name: "Jupiter",
    symbol: "JUP",
    price: 0.4862,
    change24h: 6.42,
    liquidity: 41_320_000,
    marketCap: 1_510_000_000,
    volume24h: 96_800_000,
    verified: true,
    rank: 2,
  },
  {
    mint: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zjm",
    name: "dogwifhat",
    symbol: "WIF",
    price: 0.912,
    change24h: -3.18,
    liquidity: 18_600_000,
    marketCap: 911_000_000,
    volume24h: 123_600_000,
    verified: true,
    rank: 3,
  },
  {
    mint: "2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv",
    name: "Pudgy Penguins",
    symbol: "PENGU",
    price: 0.01342,
    change24h: 9.21,
    liquidity: 14_120_000,
    marketCap: 844_000_000,
    volume24h: 72_400_000,
    verified: true,
    rank: 4,
  },
  {
    mint: SOL_MINT,
    name: "Wrapped SOL",
    symbol: "SOL",
    price: 147.38,
    change24h: 2.76,
    liquidity: 496_000_000,
    marketCap: 73_100_000_000,
    volume24h: 2_860_000_000,
    verified: true,
    rank: 5,
  },
];

export function fallbackTokenDetail(mint: string): TokenDetail {
  const token =
    fallbackTokens.find((item) => item.mint === mint) ?? fallbackTokens[0];
  return {
    ...token,
    description:
      "A community-driven Solana token surfaced through ChadWallet market intelligence.",
    supply: token.marketCap / token.price,
    priceChanges: {
      m5: token.change24h / 12,
      h1: token.change24h / 6,
      h6: token.change24h / 2.4,
      h24: token.change24h,
    },
  };
}

export function fallbackOhlcv(token: TokenSummary, count = 96): OhlcvBar[] {
  const start = Date.now() / 1000 - count * 900;
  return Array.from({ length: count }, (_, index) => {
    const wave = Math.sin(index / 5) * 0.025 + Math.cos(index / 11) * 0.012;
    const trend = (index - count / 2) * 0.0007;
    const close = token.price * (1 + wave + trend);
    const open = close * (1 + Math.sin(index * 1.7) * 0.004);
    return {
      time: Math.floor(start + index * 900),
      open,
      high: Math.max(open, close) * 1.008,
      low: Math.min(open, close) * 0.992,
      close,
      volume: token.volume24h / 96 * (0.6 + Math.abs(Math.sin(index)) * 0.8),
    };
  });
}

export function fallbackHolders(token: TokenSummary): Holder[] {
  return Array.from({ length: 12 }, (_, index) => ({
    address: `${token.mint.slice(0, 4)}${String(index + 11).padStart(2, "0")}qR8VUtAeFoSYbKedZNsD${index}`,
    balance: (token.marketCap / token.price) * (0.016 / (index + 1)),
    percentage: 1.6 / (index + 1),
    rank: index + 1,
  }));
}

export function fallbackTrades(token: TokenSummary): TradeEvent[] {
  return Array.from({ length: 18 }, (_, index) => ({
    signature: `${token.mint.slice(0, 8)}-${index}`,
    side: index % 3 === 0 ? "sell" : "buy",
    tokenAmount: (1800 + index * 731) / Math.max(token.price, 0.00001),
    valueUsd: 1800 + index * 731,
    price: token.price * (1 + Math.sin(index) * 0.006),
    wallet: `Chad${String(8100 + index)}...${String(4200 + index)}`,
    timestamp: Date.now() - index * 42_000,
  }));
}
