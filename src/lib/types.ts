export type ApiError = {
  code: string;
  message: string;
};

export type ApiResponse<T> =
  | { data: T; error: null }
  | { data: null; error: ApiError };

export type TokenSummary = {
  mint: string;
  name: string;
  symbol: string;
  imageUrl?: string;
  price: number;
  change24h: number;
  liquidity: number;
  marketCap: number;
  volume24h: number;
  verified?: boolean;
  rank?: number;
};

export type TokenDetail = TokenSummary & {
  description?: string;
  supply?: number;
  website?: string;
  twitter?: string;
  priceChanges: {
    m5: number;
    h1: number;
    h6: number;
    h24: number;
  };
};

export type OhlcvBar = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type Holder = {
  address: string;
  balance: number;
  percentage: number;
  rank: number;
};

export type TradeEvent = {
  signature: string;
  side: "buy" | "sell";
  tokenAmount: number;
  valueUsd: number;
  price: number;
  wallet: string;
  timestamp: number;
};

export type WalletPosition = {
  mint: string;
  symbol: string;
  balance: number;
  valueUsd: number;
  portfolioPercentage: number;
  unavailable?: boolean;
};

export type SwapOrder = {
  requestId?: string;
  inputMint: string;
  outputMint: string;
  inputAmount: string;
  outputAmount: string;
  minimumReceived: string;
  priceImpactPct: number;
  feesUsd: number;
  route: string[];
  transaction?: string;
};

export type SwapExecutionResult = {
  signature: string;
  status: "submitted" | "confirmed" | "failed";
  explorerUrl: string;
};
