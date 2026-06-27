import type {
  BackendChartInterval,
  ChadWalletDatafeed,
  ChartPayload,
  DatafeedConfiguration,
  LibrarySymbolInfo,
  PeriodParams,
  TokenPayload,
  TradingViewBar,
  TradingViewResolution,
} from "@/lib/tradingview/types"
import type { OhlcvBar } from "@/lib/types"

export const supportedTradingViewResolutions = ["1", "5", "15", "60", "240", "1D"] as const

const resolutionToBackendInterval: Record<TradingViewResolution, BackendChartInterval> = {
  "1": "1m",
  "5": "5m",
  "15": "15m",
  "60": "1H",
  "240": "4H",
  "1D": "1D",
  D: "1D",
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

export function mapTradingViewResolution(resolution: string): BackendChartInterval | null {
  return resolutionToBackendInterval[resolution as TradingViewResolution] ?? null
}

export function derivePriceScale(price: number) {
  if (price < 0.000001) return 10_000_000_000
  if (price < 0.0001) return 100_000_000
  if (price < 0.01) return 1_000_000
  if (price < 1) return 10_000
  return 100
}

export function normalizeBars(
  bars: OhlcvBar[],
  range?: Pick<PeriodParams, "from" | "to">,
): TradingViewBar[] {
  const byTime = new Map<number, OhlcvBar>()

  for (const bar of bars) {
    if (range && (bar.time < range.from || bar.time >= range.to)) continue
    if (bar.open <= 0 || bar.high <= 0 || bar.low <= 0 || bar.close <= 0) continue
    byTime.set(bar.time, bar)
  }

  return [...byTime.values()]
    .sort((a, b) => a.time - b.time)
    .map((bar) => ({
      time: bar.time * 1000,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      volume: bar.volume,
    }))
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function mintFromSymbol(symbol: string) {
  const raw = symbol.includes(":") ? symbol.split(":").at(-1) ?? symbol : symbol
  return raw.includes("/") ? raw.split("/")[0] : raw
}

async function readApi<T>(fetchJson: FetchLike, url: string): Promise<T> {
  const response = await fetchJson(url)
  const payload = (await response.json()) as {
    data: T | null
    error: { message: string } | null
  }

  if (!response.ok || payload.error || !payload.data) {
    throw new Error(payload.error?.message || "Request failed")
  }

  return payload.data
}

export function buildSymbolInfo(mint: string, payload: TokenPayload): LibrarySymbolInfo {
  const token = payload.token
  const shortMint = mint.length > 8 ? `${mint.slice(0, 4)}...${mint.slice(-4)}` : mint

  return {
    ticker: mint,
    name: `${token.symbol}/USD`,
    full_name: `ChadWallet:${token.symbol}/USD`,
    description: `${token.name} (${shortMint})`,
    type: "crypto",
    session: "24x7",
    timezone: "Etc/UTC",
    exchange: "ChadWallet",
    listed_exchange: "ChadWallet",
    format: "price",
    minmov: 1,
    pricescale: derivePriceScale(token.price),
    has_intraday: true,
    has_daily: true,
    has_weekly_and_monthly: false,
    supported_resolutions: [...supportedTradingViewResolutions],
    intraday_multipliers: ["1", "5", "15", "60", "240"],
    daily_multipliers: ["1"],
    volume_precision: 2,
    data_status: "streaming",
  }
}

export function getDatafeedConfiguration(): DatafeedConfiguration {
  return {
    supported_resolutions: [...supportedTradingViewResolutions],
    supports_group_request: false,
    supports_marks: false,
    supports_timescale_marks: false,
    supports_time: false,
    exchanges: [{ value: "ChadWallet", name: "ChadWallet", desc: "ChadWallet" }],
    symbols_types: [{ name: "crypto", value: "crypto" }],
  }
}

export function createChadWalletDatafeed({
  fetchJson = fetch,
  intradayPollMs = 25_000,
  dailyPollMs = 60_000,
  now = () => Math.floor(Date.now() / 1000),
}: {
  fetchJson?: FetchLike
  intradayPollMs?: number
  dailyPollMs?: number
  now?: () => number
} = {}): ChadWalletDatafeed {
  const subscriptions = new Map<string, ReturnType<typeof setInterval>>()
  const lastBars = new Map<string, TradingViewBar>()

  const fetchBars = async (
    mint: string,
    resolution: string,
    params: { countBack?: number; to?: number; from?: number } = {},
  ) => {
    const interval = mapTradingViewResolution(resolution)
    if (!interval) {
      throw new Error(`Unsupported resolution: ${resolution}`)
    }

    const query = new URLSearchParams({
      interval,
      limit: String(clamp(params.countBack ?? 300, 20, 300)),
    })
    query.set("to", String(params.to ?? now()))

    const payload = await readApi<ChartPayload>(
      fetchJson,
      `/api/token/${mint}/chart?${query.toString()}`,
    )
    return normalizeBars(payload.items, params.from && params.to ? { from: params.from, to: params.to } : undefined)
  }

  return {
    onReady(callback) {
      setTimeout(() => callback(getDatafeedConfiguration()), 0)
    },

    searchSymbols(_userInput, _exchange, _symbolType, onResult) {
      onResult([])
    },

    async resolveSymbol(symbolName, onResolve, onError) {
      try {
        const mint = mintFromSymbol(symbolName)
        const payload = await readApi<TokenPayload>(fetchJson, `/api/token/${mint}`)
        onResolve(buildSymbolInfo(mint, payload))
      } catch (error) {
        onError(error instanceof Error ? error.message : "Unable to resolve token")
      }
    },

    async getBars(symbolInfo, resolution, periodParams, onHistory, onError) {
      try {
        const bars = await fetchBars(symbolInfo.ticker, resolution, {
          countBack: periodParams.countBack,
          from: periodParams.from,
          to: periodParams.to,
        })
        onHistory(bars, { noData: bars.length === 0 })
      } catch (error) {
        onError(error instanceof Error ? error.message : "Unable to load candles")
      }
    },

    subscribeBars(symbolInfo, resolution, onRealtime, subscriberUID) {
      const poll = async () => {
        if (typeof document !== "undefined" && document.visibilityState !== "visible") return

        try {
          const bars = await fetchBars(symbolInfo.ticker, resolution, { countBack: 2 })
          const latestBar = bars.at(-1)
          if (!latestBar) return

          const previousBar = lastBars.get(subscriberUID)
          if (!previousBar || latestBar.time >= previousBar.time) {
            lastBars.set(subscriberUID, latestBar)
            onRealtime(latestBar)
          }
        } catch (error) {
          console.error("TradingView subscribeBars failed:", error)
        }
      }

      void poll()
      const pollMs = resolution === "1D" || resolution === "D" ? dailyPollMs : intradayPollMs
      subscriptions.set(subscriberUID, setInterval(poll, pollMs))
    },

    unsubscribeBars(subscriberUID) {
      const subscription = subscriptions.get(subscriberUID)
      if (subscription) {
        clearInterval(subscription)
      }
      subscriptions.delete(subscriberUID)
      lastBars.delete(subscriberUID)
    },
  }
}
