import {
  getBirdeyeChart,
  getBirdeyeDecimals,
  getBirdeyeHolders,
  getBirdeyeMarket,
  getBirdeyeTokenDetail,
  getBirdeyeTrades,
} from "@/lib/providers/birdeye"
import { getAlchemyPositions } from "@/lib/providers/alchemy"
import {
  buildFallbackQuote,
  getFallbackChart,
  getFallbackDecimals,
  getFallbackHolders,
  getFallbackMarket,
  getFallbackPosition,
  getFallbackTokenDetail,
  getFallbackTrades,
} from "@/lib/providers/trading-fallback"
import {
  executeOrder,
  getOrderEnvelope,
  getQuoteEnvelope,
  type OrderRequest,
  type QuoteRequest,
} from "@/lib/providers/jupiter"

export async function loadMarket(query?: string, limit = 12) {
  try {
    const items = await getBirdeyeMarket(query, limit)
    if (items.length) {
      return {
        items,
        source: "birdeye" as const,
      }
    }
  } catch (error) {
    console.error("loadMarket failed:", error instanceof Error ? error.message : error)
  }

  return {
    items: getFallbackMarket(query, limit),
    source: "fallback" as const,
  }
}

export async function loadTokenDetail(mint: string) {
  try {
    const token = await getBirdeyeTokenDetail(mint)
    if (token) {
      return {
        token,
        source: "birdeye" as const,
      }
    }
  } catch (error) {
    console.error("loadTokenDetail failed:", error instanceof Error ? error.message : error)
  }

  return {
    token: getFallbackTokenDetail(mint),
    source: "fallback" as const,
  }
}

export async function loadChart(
  mint: string,
  interval: string,
  limit: number,
  options: { timeTo?: number } = {},
) {
  try {
    const items = await getBirdeyeChart(mint, interval, limit, options)
    if (items.length) {
      return {
        items,
        source: "birdeye" as const,
      }
    }
  } catch (error) {
    console.error("loadChart failed:", error instanceof Error ? error.message : error)
  }

  return {
    items: getFallbackChart(mint, limit),
    source: "fallback" as const,
  }
}

export async function loadTrades(mint: string, limit: number) {
  try {
    const items = await getBirdeyeTrades(mint, limit)
    if (items.length) {
      return {
        items,
        source: "birdeye" as const,
      }
    }
  } catch (error) {
    console.error("loadTrades failed:", error instanceof Error ? error.message : error)
  }

  return {
    items: getFallbackTrades(mint).slice(0, limit),
    source: "fallback" as const,
  }
}

export async function loadHolders(mint: string, limit: number) {
  try {
    const items = await getBirdeyeHolders(mint, limit)
    if (items.length) {
      return {
        items,
        source: "birdeye" as const,
      }
    }
  } catch (error) {
    console.error("loadHolders failed:", error instanceof Error ? error.message : error)
  }

  return {
    items: getFallbackHolders(mint).slice(0, limit),
    source: "fallback" as const,
  }
}

export async function loadPosition(address: string, mint: string) {
  try {
    const positions = await getAlchemyPositions(address)
    if (positions) {
      return {
        position:
          positions.find((position) => position.mint === mint) ??
          positions.find((position) => position.symbol === "SOL" && mint === "So11111111111111111111111111111111111111112") ??
          null,
        source: "alchemy" as const,
      }
    }
  } catch (error) {
    console.error("loadPosition failed:", error instanceof Error ? error.message : error)
  }

  // If live authentication is configured, do not show demo wallet balances.
  if (process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
    return {
      position: {
        mint,
        symbol: mint === "So11111111111111111111111111111111111111112" ? "SOL" : "TOKEN",
        balance: 0,
        valueUsd: 0,
        portfolioPercentage: 0,
        unavailable: true,
      },
      source: "alchemy" as const,
    }
  }

  return {
    position: getFallbackPosition(address, mint),
    source: "fallback" as const,
  }
}

export async function loadQuote(params: QuoteRequest) {
  return getQuoteEnvelope(params)
}

export async function loadOrder(params: OrderRequest) {
  return getOrderEnvelope(params)
}

export async function submitExecution(params: {
  signedTransaction: string
  requestId: string
  lastValidBlockHeight?: string
}) {
  return executeOrder(params)
}

export async function resolveTokenDecimals(mint: string) {
  try {
    return await getBirdeyeDecimals(mint)
  } catch (error) {
    console.error("resolveTokenDecimals failed:", error instanceof Error ? error.message : error)
    return getFallbackDecimals(mint)
  }
}

export function buildDemoOrder(params: QuoteRequest & { taker?: string }) {
  return buildFallbackQuote({
    ...params,
    routeLabel: params.taker ? "DemoOrder" : "DemoQuote",
  })
}
