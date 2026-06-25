import { SOL_MINT, USDC_MINT } from "@/lib/mock-data"
import {
  buildFallbackQuote,
  getFallbackDecimals,
  getFallbackTokenSummary,
} from "@/lib/providers/trading-fallback"
import type { SwapExecutionResult, SwapOrder } from "@/lib/types"

const JUPITER_QUOTE_URL = "https://api.jup.ag/swap/v1/quote"
const JUPITER_SWAP_V2_URL = "https://api.jup.ag/swap/v2"

export type QuoteRequest = {
  inputMint: string
  outputMint: string
  amountUi: number
  slippageBps: number
}

export type OrderRequest = QuoteRequest & {
  taker: string
}

export type QuoteEnvelope = {
  order: SwapOrder
  inputSymbol: string
  outputSymbol: string
  inputUiAmount: number
  outputUiAmount: number
  minimumReceivedUi: number
  source: "jupiter" | "fallback"
  liveTradingEnabled: boolean
  executable: boolean
}

export class JupiterError extends Error {
  code: string
  status: number

  constructor(code: string, message: string, status: number) {
    super(message)
    this.code = code
    this.status = status
  }
}

function getJupiterApiKey() {
  return process.env.JUPITER_API_KEY
}

function isLiveTradingEnabled() {
  return process.env.NEXT_PUBLIC_ENABLE_LIVE_TRADING === "true"
}

function getTokenDecimals(mint: string) {
  if (mint === SOL_MINT) return 9
  if (mint === USDC_MINT) return 6
  return getFallbackDecimals(mint)
}

function toRawAmount(amountUi: number, decimals: number) {
  return BigInt(Math.round(amountUi * 10 ** Math.min(decimals, 9))).toString()
}

function fromRawAmount(amount: string, decimals: number) {
  const parsed = Number(amount)
  if (!Number.isFinite(parsed)) return 0
  return parsed / 10 ** decimals
}

async function fetchJupiterQuote(params: QuoteRequest) {
  const apiKey = getJupiterApiKey()
  if (!apiKey) return null

  const inputDecimals = getTokenDecimals(params.inputMint)
  const outputDecimals = getTokenDecimals(params.outputMint)
  const amount = toRawAmount(params.amountUi, inputDecimals)
  const url = new URL(JUPITER_QUOTE_URL)
  url.searchParams.set("inputMint", params.inputMint)
  url.searchParams.set("outputMint", params.outputMint)
  url.searchParams.set("amount", amount)
  url.searchParams.set("slippageBps", String(params.slippageBps))

  const response = await fetch(url, {
    headers: {
      "x-api-key": apiKey,
    },
    cache: "no-store",
  })

  if (!response.ok) {
    let message = `Jupiter quote failed (${response.status})`
    let code = "provider_unavailable"
    try {
      const body = await response.json()
      if (body && typeof body === "object") {
        const errorMsg = String(body.message ?? body.error ?? "")
        if (errorMsg) message = errorMsg

        const lowerMsg = errorMsg.toLowerCase()
        if (lowerMsg.includes("route") || lowerMsg.includes("no_route") || lowerMsg.includes("no route")) {
          code = "no_route"
        } else if (lowerMsg.includes("tradable") || lowerMsg.includes("not_tradable") || lowerMsg.includes("not tradable")) {
          code = "token_not_tradable"
        } else if (lowerMsg.includes("amount") || lowerMsg.includes("invalid amount")) {
          code = "invalid_amount"
        } else if (response.status === 429) {
          code = "rate_limited"
        }
      }
    } catch {}

    if (response.status === 429) {
      code = "rate_limited"
    } else if (response.status >= 500) {
      code = "provider_unavailable"
    }

    throw new JupiterError(code, message, response.status)
  }

  const quote = (await response.json()) as Record<string, unknown>
  const outAmount = String(quote.outAmount ?? "0")
  const routePlan = Array.isArray(quote.routePlan)
    ? quote.routePlan
    : Array.isArray(quote.marketInfos)
      ? quote.marketInfos
      : []

  const order: SwapOrder = {
    inputMint: params.inputMint,
    outputMint: params.outputMint,
    inputAmount: amount,
    outputAmount: outAmount,
    minimumReceived: String(
      quote.otherAmountThreshold ?? quote.minOutAmount ?? outAmount,
    ),
    priceImpactPct: Number(quote.priceImpactPct ?? 0),
    feesUsd:
      Number(
        routePlan.reduce((sum, route) => {
          if (!route || typeof route !== "object") return sum
          const feeAmount = Number(
            (route as { swapInfo?: { feeAmount?: string } }).swapInfo?.feeAmount ??
              0,
          )
          return sum + feeAmount
        }, 0),
      ) /
        10 ** outputDecimals || 0,
    route: routePlan.map((route) => {
      if (!route || typeof route !== "object") return "Router"
      const label =
        (route as { swapInfo?: { label?: string } }).swapInfo?.label ?? "Router"
      return label
    }),
  }

  return {
    order,
    inputSymbol: getFallbackTokenSummary(params.inputMint).symbol,
    outputSymbol: getFallbackTokenSummary(params.outputMint).symbol,
    inputUiAmount: params.amountUi,
    outputUiAmount: fromRawAmount(outAmount, outputDecimals),
    minimumReceivedUi: fromRawAmount(order.minimumReceived, outputDecimals),
    source: "jupiter" as const,
    liveTradingEnabled: isLiveTradingEnabled(),
    executable: false,
  }
}

export async function getQuoteEnvelope(params: QuoteRequest): Promise<QuoteEnvelope> {
  const apiKey = getJupiterApiKey()
  if (!apiKey) {
    return getFallbackEnvelope(params)
  }

  try {
    const liveQuote = await fetchJupiterQuote(params)
    if (liveQuote) return liveQuote
  } catch (error) {
    if (error instanceof JupiterError) {
      if (error.code === "provider_unavailable") {
        return getFallbackEnvelope(params)
      }
      throw error
    }
  }

  return getFallbackEnvelope(params)
}

function getFallbackEnvelope(params: QuoteRequest): QuoteEnvelope {
  const order = buildFallbackQuote({
    ...params,
    routeLabel: "DemoRoute",
  })

  return {
    order,
    inputSymbol: getFallbackTokenSummary(params.inputMint).symbol,
    outputSymbol: getFallbackTokenSummary(params.outputMint).symbol,
    inputUiAmount: params.amountUi,
    outputUiAmount: Number(order.outputAmount),
    minimumReceivedUi: Number(order.minimumReceived),
    source: "fallback",
    liveTradingEnabled: isLiveTradingEnabled(),
    executable: false,
  }
}

export async function getOrderEnvelope(params: OrderRequest): Promise<QuoteEnvelope> {
  const apiKey = getJupiterApiKey()
  const quote = await getQuoteEnvelope(params)

  if (quote.source === "fallback" || !apiKey) {
    return {
      ...quote,
      order: {
        ...quote.order,
        requestId: quote.order.requestId ?? `demo-order-${Date.now()}`,
      },
      executable: false,
      source: "fallback",
    }
  }

  const inputDecimals = getTokenDecimals(params.inputMint)
  const url = new URL(`${JUPITER_SWAP_V2_URL}/order`)
  url.searchParams.set("inputMint", params.inputMint)
  url.searchParams.set("outputMint", params.outputMint)
  url.searchParams.set("amount", toRawAmount(params.amountUi, inputDecimals))
  url.searchParams.set("taker", params.taker)

  try {
    const response = await fetch(url, {
      headers: {
        "x-api-key": apiKey,
      },
      cache: "no-store",
    })

    if (!response.ok) {
      let message = `Jupiter order failed (${response.status})`
      let code = "provider_unavailable"
      try {
        const body = await response.json()
        if (body && typeof body === "object") {
          const errorMsg = String(body.message ?? body.error ?? "")
          if (errorMsg) message = errorMsg

          const lowerMsg = errorMsg.toLowerCase()
          if (lowerMsg.includes("route") || lowerMsg.includes("no_route")) {
            code = "no_route"
          } else if (lowerMsg.includes("tradable") || lowerMsg.includes("not_tradable")) {
            code = "token_not_tradable"
          } else if (lowerMsg.includes("amount") || lowerMsg.includes("invalid amount")) {
            code = "invalid_amount"
          } else if (response.status === 429) {
            code = "rate_limited"
          }
        }
      } catch {}

      if (response.status === 429) {
        code = "rate_limited"
      } else if (response.status >= 500) {
        code = "provider_unavailable"
      }

      throw new JupiterError(code, message, response.status)
    }

    const payload = (await response.json()) as Record<string, unknown>
    return {
      ...quote,
      order: {
        ...quote.order,
        requestId: String(payload.requestId ?? quote.order.requestId ?? ""),
        transaction:
          typeof payload.transaction === "string"
            ? payload.transaction
            : undefined,
        route:
          Array.isArray(payload.routePlan) && payload.routePlan.length
            ? payload.routePlan.map((route) => {
                if (!route || typeof route !== "object") return "Router"
                return (
                  (route as { swapInfo?: { label?: string } }).swapInfo?.label ??
                  "Router"
                )
              })
            : quote.order.route,
      },
      executable: Boolean(payload.transaction) && isLiveTradingEnabled(),
      source: "jupiter",
    }
  } catch (error) {
    if (error instanceof JupiterError) {
      throw error
    }
    throw new JupiterError("provider_unavailable", error instanceof Error ? error.message : "Order build failed", 502)
  }
}

export async function executeOrder(params: {
  signedTransaction: string
  requestId: string
  lastValidBlockHeight?: string
}): Promise<SwapExecutionResult> {
  if (!isLiveTradingEnabled()) {
    throw new Error("Live trading is disabled")
  }

  const apiKey = getJupiterApiKey()
  if (!apiKey) {
    throw new Error("Jupiter API key is missing")
  }

  const response = await fetch(`${JUPITER_SWAP_V2_URL}/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(params),
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Jupiter execute failed (${response.status})`)
  }

  const payload = (await response.json()) as Record<string, unknown>
  const signature = String(payload.signature ?? "")
  let status: SwapExecutionResult["status"] =
    String(payload.status ?? "").toLowerCase() === "success"
      ? "confirmed"
      : "submitted"

  if (signature && status !== "confirmed") {
    status = await confirmWithAlchemy(signature)
  }

  return {
    signature,
    status,
    explorerUrl: `https://solscan.io/tx/${signature}`,
  }
}

async function confirmWithAlchemy(
  signature: string,
): Promise<SwapExecutionResult["status"]> {
  const rpcUrl = process.env.ALCHEMY_SOLANA_RPC_URL
  if (!rpcUrl) return "submitted"

  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getSignatureStatuses",
        params: [[signature], { searchTransactionHistory: true }],
      }),
      cache: "no-store",
    })

    if (!response.ok) return "submitted"

    const payload = (await response.json()) as {
      result?: {
        value?: Array<{
          confirmationStatus?: string
          err?: unknown
        } | null>
      }
    }
    const confirmation = payload.result?.value?.[0]

    if (confirmation?.err) return "failed"
    return confirmation?.confirmationStatus === "confirmed" ||
      confirmation?.confirmationStatus === "finalized"
      ? "confirmed"
      : "submitted"
  } catch {
    return "submitted"
  }
}
