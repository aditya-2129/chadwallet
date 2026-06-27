import { describe, expect, it, vi } from "vitest"
import {
  buildSymbolInfo,
  createChadWalletDatafeed,
  derivePriceScale,
  mapTradingViewResolution,
  normalizeBars,
} from "@/lib/tradingview/datafeed"
import type { LibrarySymbolInfo } from "@/lib/tradingview/types"

function response(data: unknown) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ data, error: null }),
  } as Response)
}

describe("TradingView datafeed helpers", () => {
  it("maps TradingView resolutions to backend chart intervals", () => {
    expect(mapTradingViewResolution("1")).toBe("1m")
    expect(mapTradingViewResolution("5")).toBe("5m")
    expect(mapTradingViewResolution("15")).toBe("15m")
    expect(mapTradingViewResolution("60")).toBe("1H")
    expect(mapTradingViewResolution("240")).toBe("4H")
    expect(mapTradingViewResolution("1D")).toBe("1D")
    expect(mapTradingViewResolution("D")).toBe("1D")
    expect(mapTradingViewResolution("1W")).toBeNull()
  })

  it("derives price scale for tiny and normal token prices", () => {
    expect(derivePriceScale(0.0000004)).toBe(10_000_000_000)
    expect(derivePriceScale(0.00004)).toBe(100_000_000)
    expect(derivePriceScale(0.004)).toBe(1_000_000)
    expect(derivePriceScale(0.4)).toBe(10_000)
    expect(derivePriceScale(4)).toBe(100)
  })

  it("sorts, dedupes, filters, and converts candle times to milliseconds", () => {
    expect(
      normalizeBars(
        [
          { time: 30, open: 3, high: 4, low: 2, close: 3.5, volume: 30 },
          { time: 10, open: 1, high: 2, low: 0.5, close: 1.5, volume: 10 },
          { time: 20, open: 0, high: 2, low: 0.5, close: 1.5, volume: 10 },
          { time: 10, open: 1.1, high: 2.1, low: 0.6, close: 1.6, volume: 11 },
        ],
        { from: 10, to: 31 },
      ),
    ).toEqual([
      { time: 10_000, open: 1.1, high: 2.1, low: 0.6, close: 1.6, volume: 11 },
      { time: 30_000, open: 3, high: 4, low: 2, close: 3.5, volume: 30 },
    ])
  })

  it("builds symbol info using the mint as the unique ticker", () => {
    const info = buildSymbolInfo("So11111111111111111111111111111111111111112", {
      source: "fallback",
      token: {
        mint: "So11111111111111111111111111111111111111112",
        name: "Solana",
        symbol: "SOL",
        price: 147.25,
      },
    })

    expect(info.ticker).toBe("So11111111111111111111111111111111111111112")
    expect(info.name).toBe("SOL/USD")
    expect(info.session).toBe("24x7")
    expect(info.supported_resolutions).toContain("1D")
  })
})

describe("TradingView datafeed", () => {
  const symbolInfo: LibrarySymbolInfo = {
    ticker: "So11111111111111111111111111111111111111112",
    name: "SOL/USD",
    full_name: "ChadWallet:SOL/USD",
    description: "Solana",
    type: "crypto",
    session: "24x7",
    timezone: "Etc/UTC",
    exchange: "ChadWallet",
    listed_exchange: "ChadWallet",
    format: "price",
    minmov: 1,
    pricescale: 100,
    has_intraday: true,
    has_daily: true,
    has_weekly_and_monthly: false,
    supported_resolutions: ["1", "5", "15", "60", "240", "1D"],
    intraday_multipliers: ["1", "5", "15", "60", "240"],
    daily_multipliers: ["1"],
    volume_precision: 2,
    data_status: "streaming",
  }

  it("getBars fetches candles and returns normalized history", async () => {
    const fetchJson = vi.fn().mockImplementation((url: string) => {
      expect(url).toContain("interval=1m")
      expect(url).toContain("limit=2")
      expect(url).toContain("to=30")
      return response({
        source: "fallback",
        items: [
          { time: 10, open: 1, high: 2, low: 0.5, close: 1.5, volume: 10 },
          { time: 20, open: 2, high: 3, low: 1.5, close: 2.5, volume: 20 },
        ],
      })
    })
    const datafeed = createChadWalletDatafeed({ fetchJson, now: () => 30 })
    const onHistory = vi.fn()
    const onError = vi.fn()

    await datafeed.getBars(
      symbolInfo,
      "1",
      { from: 0, to: 30, countBack: 2 },
      onHistory,
      onError,
    )

    expect(onError).not.toHaveBeenCalled()
    expect(onHistory).toHaveBeenCalledWith(
      [
        { time: 10_000, open: 1, high: 2, low: 0.5, close: 1.5, volume: 10 },
        { time: 20_000, open: 2, high: 3, low: 1.5, close: 2.5, volume: 20 },
      ],
      { noData: false },
    )
  })

  it("getBars returns noData when no candles remain", async () => {
    const fetchJson = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { source: "fallback", items: [] }, error: null }),
    } as Response)
    const datafeed = createChadWalletDatafeed({ fetchJson })
    const onHistory = vi.fn()

    await datafeed.getBars(symbolInfo, "5", { from: 0, to: 30 }, onHistory, vi.fn())

    expect(onHistory).toHaveBeenCalledWith([], { noData: true })
  })

  it("subscribeBars emits the latest candle and clears timers", () => {
    vi.useFakeTimers()
    const fetchJson = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            source: "fallback",
            items: [
              { time: 10, open: 1, high: 2, low: 0.5, close: 1.5, volume: 10 },
              { time: 20, open: 2, high: 3, low: 1.5, close: 2.5, volume: 20 },
            ],
          },
          error: null,
        }),
    } as Response)
    const datafeed = createChadWalletDatafeed({ fetchJson, intradayPollMs: 25_000 })
    const onRealtime = vi.fn()

    datafeed.subscribeBars(symbolInfo, "1", onRealtime, "sub-1")
    datafeed.unsubscribeBars("sub-1")

    expect(fetchJson).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
    vi.useRealTimers()
  })
})
