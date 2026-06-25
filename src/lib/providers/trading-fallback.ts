import {
  DEFAULT_TOKEN_MINT,
  SOL_MINT,
  USDC_MINT,
  fallbackHolders,
  fallbackOhlcv,
  fallbackTokenDetail,
  fallbackTokens,
  fallbackTrades,
} from "@/lib/mock-data"
import type {
  Holder,
  OhlcvBar,
  SwapOrder,
  TokenDetail,
  TradeEvent,
  WalletPosition,
} from "@/lib/types"

const DECIMALS_BY_MINT: Record<string, number> = {
  [SOL_MINT]: 9,
  [USDC_MINT]: 6,
  [DEFAULT_TOKEN_MINT]: 5,
  JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN: 6,
  EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zjm: 6,
  "2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv": 6,
}

function stableHash(input: string) {
  return Array.from(input).reduce((acc, char) => {
    return (acc * 31 + char.charCodeAt(0)) % 1_000_003
  }, 17)
}

export function getFallbackDecimals(mint: string) {
  return DECIMALS_BY_MINT[mint] ?? 6
}

export function getFallbackTokenSummary(mint: string) {
  if (mint === USDC_MINT) {
    return {
      mint: USDC_MINT,
      name: "USD Coin",
      symbol: "USDC",
      price: 1,
      change24h: 0,
      liquidity: 0,
      marketCap: 0,
      volume24h: 0,
      verified: true,
    }
  }

  return fallbackTokens.find((token) => token.mint === mint) ?? fallbackTokens[0]
}

export function getFallbackMarket(query?: string, limit = 12) {
  const normalizedQuery = query?.trim().toLowerCase()
  const items = normalizedQuery
    ? fallbackTokens.filter((token) => {
        return (
          token.name.toLowerCase().includes(normalizedQuery) ||
          token.symbol.toLowerCase().includes(normalizedQuery) ||
          token.mint.toLowerCase().includes(normalizedQuery)
        )
      })
    : fallbackTokens

  return items.slice(0, limit)
}

export function getFallbackTokenDetail(mint: string): TokenDetail {
  return fallbackTokenDetail(mint)
}

export function getFallbackChart(mint: string, count = 96): OhlcvBar[] {
  return fallbackOhlcv(getFallbackTokenSummary(mint), count)
}

export function getFallbackTrades(mint: string): TradeEvent[] {
  return fallbackTrades(getFallbackTokenSummary(mint))
}

export function getFallbackHolders(mint: string): Holder[] {
  return fallbackHolders(getFallbackTokenSummary(mint))
}

export function getFallbackPositions(address: string): WalletPosition[] {
  const seed = stableHash(address)
  const rawPositions = fallbackTokens.map((token, index) => {
    const decimals = getFallbackDecimals(token.mint)
    const weight = ((seed + index * 97) % 1_200) + 40
    const balance = weight / 10 ** Math.min(decimals, 4)
    const valueUsd = balance * token.price

    return {
      mint: token.mint,
      symbol: token.symbol,
      balance,
      valueUsd,
      portfolioPercentage: 0,
    }
  })

  const totalValue = rawPositions.reduce((sum, position) => {
    return sum + position.valueUsd
  }, 0)

  return rawPositions.map((position) => ({
    ...position,
    portfolioPercentage: totalValue
      ? (position.valueUsd / totalValue) * 100
      : 0,
  }))
}

export function getFallbackPosition(address: string, mint: string) {
  return (
    getFallbackPositions(address).find((position) => position.mint === mint) ??
    null
  )
}

export function buildFallbackQuote(params: {
  inputMint: string
  outputMint: string
  amountUi: number
  slippageBps: number
  taker?: string
  routeLabel?: string
}): SwapOrder {
  const inputToken = getFallbackTokenSummary(params.inputMint)
  const outputToken = getFallbackTokenSummary(params.outputMint)
  const inputValueUsd = params.amountUi * inputToken.price
  const outputUi = outputToken.price
    ? inputValueUsd / outputToken.price
    : params.amountUi
  const priceImpactPct =
    0.12 + (stableHash(`${params.inputMint}:${params.outputMint}`) % 41) / 100
  const feesUsd = Math.max(0.18, inputValueUsd * 0.0035)
  const minimumReceived = outputUi * (1 - params.slippageBps / 10_000)

  return {
    requestId: `demo-${stableHash(
      `${params.inputMint}:${params.outputMint}:${params.amountUi}:${params.taker ?? "anon"}`,
    )}`,
    inputMint: params.inputMint,
    outputMint: params.outputMint,
    inputAmount: params.amountUi.toFixed(6),
    outputAmount: outputUi.toFixed(6),
    minimumReceived: minimumReceived.toFixed(6),
    priceImpactPct,
    feesUsd,
    route: [
      inputToken.symbol,
      params.routeLabel ?? "ChadRouter",
      outputToken.symbol,
    ],
  }
}
