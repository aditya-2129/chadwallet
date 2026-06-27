/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { getFallbackDecimals } from "@/lib/providers/trading-fallback"
import type {
  Holder,
  OhlcvBar,
  TokenDetail,
  TokenSummary,
  TradeEvent,
} from "@/lib/types"

const BIRDEYE_BASE_URL = "https://public-api.birdeye.so"

export class ProviderError extends Error {
  code: string
  status: number
  retryAfter?: number

  constructor(provider: string, code: string, message: string, status: number, retryAfter?: number) {
    super(`[${provider}] ${message}`)
    this.code = code
    this.status = status
    this.retryAfter = retryAfter
  }
}

type CacheEntry<T> = {
  data: T
  expiresAt: number
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>()
  private pending = new Map<string, Promise<any>>()

  async getOrFetch<T>(
    key: string,
    ttlMs: number,
    fetchFn: () => Promise<T>
  ): Promise<T> {
    const now = Date.now()
    const cached = this.cache.get(key)

    if (cached && cached.expiresAt > now) {
      return cached.data
    }

    let promise = this.pending.get(key)
    if (!promise) {
      promise = fetchFn().then((data) => {
        if (data !== null && data !== undefined) {
          this.cache.set(key, { data, expiresAt: Date.now() + ttlMs })
        }
        this.pending.delete(key)
        return data
      }).catch((err) => {
        this.pending.delete(key)
        throw err
      })
      this.pending.set(key, promise)
    }

    return promise
  }

  getExpired(key: string): any {
    return this.cache.get(key)?.data ?? null
  }
}

const birdeyeCache = new MemoryCache()
let rateLimitResetTime = 0

export function mapInterval(interval: string): string {
  const mapping: Record<string, string> = {
    "1m": "1m",
    "5m": "5m",
    "15m": "15m",
    "30m": "30m",
    "1h": "1H",
    "1H": "1H",
    "4h": "4H",
    "4H": "4H",
    "1d": "1D",
    "1D": "1D",
  }
  return mapping[interval] ?? interval
}

function birdeyeHeaders() {
  const apiKey = process.env.BIRDEYE_API_KEY
  if (!apiKey) return null

  return {
    accept: "application/json",
    "X-API-KEY": apiKey,
    "x-chain": "solana",
  }
}

function asNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function asString(value: unknown) {
  return typeof value === "string" ? value : undefined
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

function asTradeAmount(value: unknown) {
  const record = asRecord(value)
  if (record) {
    return (
      asNumber(record.uiAmount) ||
      asNumber(record.ui_amount) ||
      asNumber(record.amount) ||
      asNumber(record.value) ||
      asNumber(record.tokenAmount) ||
      asNumber(record.token_amount) ||
      asNumber(record.quantity)
    )
  }

  return asNumber(value)
}

function findTradeTokenLeg(item: Record<string, unknown>, mint: string) {
  for (const key of ["base", "quote", "from", "to"] as const) {
    const leg = asRecord(item[key])
    if (leg && asString(leg.address) === mint) return leg
  }

  return undefined
}

function extractTradePrice(item: Record<string, unknown>, tokenAmount: number, valueUsd: number) {
  const tokenPrice =
    asNumber(item.tokenPrice) ||
    asNumber(item.token_price) ||
    asNumber(item.price)

  if (tokenPrice > 0) return tokenPrice
  if (tokenAmount > 0 && valueUsd > 0) return valueUsd / tokenAmount
  return 0
}

function mapSummary(entry: Record<string, unknown>): TokenSummary {
  const mint =
    asString(entry.address) ??
    asString(entry.mint) ??
    asString(entry.token_address) ??
    ""
  const symbol = asString(entry.symbol) ?? "TOKEN"
  const name = asString(entry.name) ?? symbol
  const imageUrl =
    asString(entry.logo_uri) ??
    asString(entry.logoURI) ??
    asString(entry.image) ??
    asString(entry.icon)

  const price =
    asNumber(entry.price) ||
    asNumber(entry.priceUsd) ||
    asNumber(entry.value)
  const change24h =
    asNumber(entry.priceChange24h) ||
    asNumber(entry.price_change_24h_percent) ||
    asNumber(entry.priceChange24hPercent) ||
    asNumber(entry.price24hChangePercent)
  const liquidity =
    asNumber(entry.liquidity) ||
    asNumber(entry.liquidityUsd) ||
    asNumber(entry.liquidity_in_usd)
  const marketCap =
    asNumber(entry.marketCap) ||
    asNumber(entry.market_cap) ||
    asNumber(entry.mc) ||
    asNumber(entry.fdv)
  const volume24h =
    asNumber(entry.volume24h) ||
    asNumber(entry.v24hUSD) ||
    asNumber(entry.volume_24h_usd) ||
    asNumber(entry.volume24hUsd)
  const rank =
    asNumber(entry.rank) || asNumber(entry.tokenRank) || asNumber(entry.sort)

  return {
    mint,
    name,
    symbol,
    imageUrl,
    price,
    change24h,
    liquidity,
    marketCap,
    volume24h,
    verified:
      typeof entry.verified === "boolean"
        ? entry.verified
        : Boolean(entry.is_verified ?? entry.isVerified),
    rank: rank || undefined,
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function fetchBirdeyeRaw<T>(
  path: string,
  searchParams: Record<string, string | number | undefined>,
  attempt = 1,
): Promise<T | null> {
  const headers = birdeyeHeaders()
  if (!headers) return null

  const url = new URL(`${BIRDEYE_BASE_URL}${path}`)
  Object.entries(searchParams).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value))
    }
  })

  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), 10000)

  try {
    const response = await fetch(url, {
      headers,
      signal: controller.signal,
      cache: "no-store",
    })
    clearTimeout(id)

    if (response.status === 401) {
      throw new ProviderError("birdeye", "invalid_credentials", "Invalid credentials", 401)
    }
    if (response.status === 403) {
      throw new ProviderError("birdeye", "unsupported_plan", "Unsupported API plan", 403)
    }
    if (response.status === 404) {
      throw new ProviderError("birdeye", "unknown_token", "Unknown token address", 404)
    }
    if (response.status === 429) {
      const retryAfterHeader = response.headers.get("retry-after")
      const retryAfterSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 1
      const delay = Number.isNaN(retryAfterSeconds) ? attempt * 350 : retryAfterSeconds * 1000

      if (attempt < 4) {
        console.warn(`[birdeye] Rate limited (429) on ${path}. Retrying in ${delay}ms (attempt ${attempt}/3)...`)
        await sleep(delay)
        return fetchBirdeyeRaw<T>(path, searchParams, attempt + 1)
      }

      rateLimitResetTime = Date.now() + delay
      throw new ProviderError("birdeye", "rate_limited", "Rate limited by Birdeye after retries", 429, retryAfterSeconds)
    }
    if (!response.ok) {
      throw new ProviderError("birdeye", "provider_error", `Birdeye request failed (${response.status})`, response.status)
    }

    try {
      return (await response.json()) as T
    } catch {
      throw new ProviderError("birdeye", "malformed_response", "Malformed provider JSON response", 500)
    }
  } catch (error: any) {
    clearTimeout(id)
    if (error.name === "AbortError") {
      throw new ProviderError("birdeye", "timeout", "Request timed out", 408)
    }
    throw error
  }
}

async function fetchBirdeye<T>(
  path: string,
  searchParams: Record<string, string | number | undefined>,
  ttlMs = 0,
): Promise<T | null> {
  const cacheKey = `${path}?${new URLSearchParams(
    Object.entries(searchParams)
      .filter(([_, v]) => v !== undefined && v !== "")
      .map(([k, v]) => [k, String(v)])
  ).toString()}`

  const now = Date.now()
  if (now < rateLimitResetTime) {
    const expired = birdeyeCache.getExpired(cacheKey)
    if (expired !== null) {
      return expired
    }
    throw new ProviderError("birdeye", "rate_limited", "Rate limit block active", 429)
  }

  try {
    if (ttlMs > 0) {
      return await birdeyeCache.getOrFetch(cacheKey, ttlMs, () => fetchBirdeyeRaw<T>(path, searchParams))
    }
    return await fetchBirdeyeRaw<T>(path, searchParams)
  } catch (error) {
    if (error instanceof ProviderError && error.code === "rate_limited") {
      const expired = birdeyeCache.getExpired(cacheKey)
      if (expired !== null) {
        return expired
      }
    }
    throw error
  }
}

function unwrapList(payload: unknown) {
  if (!payload || typeof payload !== "object") return []
  const record = payload as Record<string, unknown>
  const data = record.data

  if (Array.isArray(data)) return data
  if (data && typeof data === "object") {
    const inner = data as Record<string, unknown>
    if (Array.isArray(inner.items)) return inner.items
    if (Array.isArray(inner.tokens)) return inner.tokens
    if (Array.isArray(inner.result)) return inner.result
    if (Array.isArray(inner.list)) return inner.list
  }

  return []
}

export async function getBirdeyeMarket(query?: string, limit = 12) {
  if (query?.trim()) {
    const payload = await fetchBirdeye<unknown>("/defi/v3/search", {
      chain: "solana",
      target: "token",
      search_mode: "fuzzy",
      keyword: query.trim(),
    }, 5000)

    const items = unwrapList(payload)
      .map((item) => mapSummary(item as Record<string, unknown>))
      .filter((item) => item.mint && item.price > 0)

    return items.slice(0, limit)
  }

  const payload = await fetchBirdeye<unknown>("/defi/token_trending", {
    sort_by: "rank",
    sort_type: "asc",
    offset: 0,
    limit,
  }, 30000)

  return unwrapList(payload)
    .map((item) => mapSummary(item as Record<string, unknown>))
    .filter((item) => item.mint && item.price > 0)
    .slice(0, limit)
}

export async function getBirdeyeTokenDetail(mint: string): Promise<TokenDetail | null> {
  const payload = await fetchBirdeye<unknown>("/defi/token_overview", {
    address: mint,
    frames: "5m,1h,4h,24h",
  }, 60000)

  if (!payload || typeof payload !== "object") return null
  const data =
    (payload as { data?: Record<string, unknown> }).data ??
    (payload as Record<string, unknown>)

  if (!data || typeof data !== "object") return null
  const summary = mapSummary(data)
  if (!summary.mint || summary.price <= 0) return null

  const priceChanges = {
    m5:
      asNumber(data.priceChange5mPercent) ||
      asNumber(data.price_change_5m_percent),
    h1:
      asNumber(data.priceChange1hPercent) ||
      asNumber(data.price_change_1h_percent),
    h6:
      asNumber(data.priceChange4hPercent) ||
      asNumber(data.price_change_4h_percent),
    h24:
      asNumber(data.priceChange24hPercent) ||
      asNumber(data.price_change_24h_percent) ||
      summary.change24h,
  }

  const extensions =
    (data.extensions as Record<string, unknown> | undefined) ?? undefined

  return {
    ...summary,
    description:
      asString(data.description) ?? asString(extensions?.description),
    supply:
      asNumber(data.supply) ||
      asNumber(data.totalSupply) ||
      asNumber(data.circulatingSupply),
    website:
      asString(data.website) ??
      asString(extensions?.website) ??
      asString(extensions?.website_url),
    twitter:
      asString(data.twitter) ??
      asString(extensions?.twitter) ??
      asString(extensions?.twitter_url),
    priceChanges,
  }
}

export async function getBirdeyeDecimals(mint: string) {
  const detail = await getBirdeyeTokenDetail(mint)
  const payload = await fetchBirdeye<unknown>("/defi/token_overview", {
    address: mint,
  }, 86400000)

  if (payload && typeof payload === "object") {
    const data =
      (payload as { data?: Record<string, unknown> }).data ??
      (payload as Record<string, unknown>)
    const decimals = asNumber((data as Record<string, unknown>).decimals, -1)
    if (decimals >= 0) return decimals
  }

  return detail ? getFallbackDecimals(detail.mint) : getFallbackDecimals(mint)
}

export async function getBirdeyeChart(
  mint: string,
  interval: string,
  limit: number,
  options: { timeTo?: number } = {},
): Promise<OhlcvBar[]> {
  const normalizedInterval = mapInterval(interval)
  const payload = await fetchBirdeye<unknown>("/defi/v3/ohlcv", {
    address: mint,
    type: normalizedInterval,
    mode: "count",
    count_limit: limit,
    time_to: options.timeTo ?? Math.floor(Date.now() / 1000),
  }, 20000)

  return unwrapList(payload)
    .map((entry) => {
      const item = entry as Record<string, unknown>
      return {
        time:
          asNumber(item.unix_time) ||
          asNumber(item.unixTime) ||
          asNumber(item.startUnixTime) ||
          asNumber(item.time),
        open: asNumber(item.o) || asNumber(item.open),
        high: asNumber(item.h) || asNumber(item.high),
        low: asNumber(item.l) || asNumber(item.low),
        close: asNumber(item.c) || asNumber(item.close),
        volume: asNumber(item.v) || asNumber(item.v_usd) || asNumber(item.volume),
      }
    })
    .filter((bar) => bar.time && bar.open > 0 && bar.high > 0 && bar.low > 0 && bar.close > 0)
}

export async function getBirdeyeTrades(mint: string, limit: number): Promise<TradeEvent[]> {
  const payload = await fetchBirdeye<unknown>("/defi/txs/token", {
    address: mint,
    offset: 0,
    limit,
    sort_type: "desc",
  }, 5000)

  const mappedTrades = unwrapList(payload).map((entry, index) => {
    const item = entry as Record<string, unknown>
    const sideText =
      asString(item.side) ??
      asString(item.txType) ??
      asString(item.tx_type) ??
      "buy"

    const tokenLeg = findTradeTokenLeg(item, mint)
    const tokenAmount =
      asTradeAmount(tokenLeg) ||
      asNumber(item.baseAmount) ||
      asNumber(item.base_amount) ||
      asNumber(item.amount)
    const price = extractTradePrice(item, tokenAmount, 0)
    const valueUsd =
      (tokenAmount > 0 && price > 0 ? tokenAmount * price : 0) ||
      asNumber(item.quoteAmount) ||
      asNumber(item.quote_amount) ||
      asNumber(item.value) ||
      asNumber(item.valueUsd)
    const normalizedPrice = price || extractTradePrice(item, tokenAmount, valueUsd)

    return {
      signature:
        asString(item.txHash) ??
        asString(item.signature) ??
        `${mint}-${index}`,
      side: (sideText.toLowerCase().includes("sell") ? "sell" : "buy") as
        | "buy"
        | "sell",
      tokenAmount,
      valueUsd,
      price: normalizedPrice,
      wallet:
        asString(item.owner) ??
        asString(item.fromOwner) ??
        asString(item.user) ??
        "Unknown",
      timestamp:
        asNumber(item.blockUnixTime) * 1000 ||
        asNumber(item.block_unix_time) * 1000 ||
        asNumber(item.unixTime) * 1000 ||
        Date.now(),
    }
  })

  return mappedTrades.filter((trade) => trade.signature && trade.tokenAmount > 0 && trade.price > 0)
}

export async function getBirdeyeHolders(mint: string, limit: number): Promise<Holder[]> {
  const payload = await fetchBirdeye<unknown>("/defi/v3/token/holder", {
    address: mint,
    offset: 0,
    limit,
  }, 60000)

  return unwrapList(payload)
    .map((entry, index) => {
      const item = entry as Record<string, unknown>
      return {
        address:
          asString(item.owner) ??
          asString(item.address) ??
          asString(item.wallet) ??
          `holder-${index}`,
        balance:
          asNumber(item.uiAmount) ||
          asNumber(item.ui_amount) ||
          asNumber(item.balance),
        percentage:
          asNumber(item.percentage) ||
          asNumber(item.percent) ||
          asNumber(item.share),
        rank: asNumber(item.rank) || index + 1,
      }
    })
    .filter((holder) => holder.address && holder.balance > 0)
}
