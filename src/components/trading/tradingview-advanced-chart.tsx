"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  CandlestickSeries,
  ColorType,
  createChart,
  HistogramSeries,
  LineSeries,
  PriceScaleMode,
  type IChartApi,
  type ISeriesApi,
  type PriceFormat,
  type UTCTimestamp,
} from "lightweight-charts"
import {
  Camera,
  CandlestickChart,
  Hexagon,
  Maximize,
  Redo2,
  Settings2,
  Undo2,
  Zap,
} from "lucide-react"
import type { OhlcvBar } from "@/lib/types"
import type { ChartPayload, TokenPayload } from "@/components/trading/types"

type LocalChartInterval = "1m" | "5m" | "15m" | "1H" | "4H" | "1D"
type LocalChartRange = "1D" | "1W" | "1M" | "3M" | "1Y"
type ScaleMode = "price" | "percent"
type ValueMode = "price" | "mcap"
type ChartType = "candles" | "line"
type IndicatorId = "sma20" | "ema20" | "vwap"

type ChartSettings = {
  interval: LocalChartInterval
  limit: number
  selectedRange: LocalChartRange | null
  scaleMode: ScaleMode
  logMode: boolean
  valueMode: ValueMode
  chartType: ChartType
  activeIndicators: IndicatorId[]
  gridVisible: boolean
  volumeVisible: boolean
}

type DisplayBar = OhlcvBar & {
  sourceOpen: number
  sourceClose: number
}

const INTERVAL_OPTIONS: { label: string; value: LocalChartInterval; limit: number }[] = [
  { label: "1m", value: "1m", limit: 180 },
  { label: "5m", value: "5m", limit: 240 },
  { label: "15m", value: "15m", limit: 240 },
  { label: "1h", value: "1H", limit: 240 },
  { label: "4h", value: "4H", limit: 240 },
  { label: "1d", value: "1D", limit: 300 },
]

const RANGE_OPTIONS: {
  label: LocalChartRange
  interval: LocalChartInterval
  limit: number
}[] = [
  { label: "1D", interval: "5m", limit: 288 },
  { label: "1W", interval: "1H", limit: 168 },
  { label: "1M", interval: "4H", limit: 180 },
  { label: "3M", interval: "1D", limit: 90 },
  { label: "1Y", interval: "1D", limit: 300 },
]

const INDICATOR_OPTIONS: {
  id: IndicatorId
  label: string
  description: string
}[] = [
  { id: "sma20", label: "SMA 20", description: "20 candle simple moving average" },
  { id: "ema20", label: "EMA 20", description: "20 candle exponential moving average" },
  { id: "vwap", label: "VWAP", description: "Volume weighted average price" },
]

const INDICATOR_COLORS: Record<IndicatorId, string> = {
  sma20: "#56a6ff",
  ema20: "#f5c84b",
  vwap: "#b777ff",
}

function formatClock(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(date)
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: value >= 1_000_000 ? 2 : 4,
  }).format(value)
}

function formatChartValue(value: number, mode: ValueMode) {
  if (mode === "mcap") return formatCompactCurrency(value)
  if (value === 0) return "0"
  if (Math.abs(value) < 0.000001) return value.toExponential(3)
  if (Math.abs(value) < 0.01) return value.toPrecision(6)
  return value.toLocaleString("en-US", { maximumSignificantDigits: 7 })
}

function getPrecision(value: number, mode: ValueMode) {
  if (mode === "mcap") return value >= 1_000_000 ? 0 : 2
  if (value < 0.000001) return 10
  if (value < 0.0001) return 8
  if (value < 0.01) return 6
  if (value < 1) return 4
  return 2
}

function toolbarButtonClass(active = false) {
  return [
    "inline-flex h-8 items-center justify-center rounded-md px-2 text-xs font-semibold transition",
    active
      ? "bg-white/10 text-white"
      : "text-[#c0c7da] hover:bg-white/[0.06] hover:text-white",
  ].join(" ")
}

function iconButtonClass(active = false) {
  return [
    "inline-flex size-8 items-center justify-center rounded-md transition disabled:cursor-not-allowed disabled:opacity-35",
    active
      ? "bg-white/10 text-white"
      : "text-[#c0c7da] hover:bg-white/[0.06] hover:text-white",
  ].join(" ")
}

function calculateSma(bars: DisplayBar[], period: number) {
  return bars
    .map((bar, index) => {
      if (index < period - 1) return null
      const windowBars = bars.slice(index - period + 1, index + 1)
      const value = windowBars.reduce((sum, item) => sum + item.close, 0) / period
      return { time: bar.time as UTCTimestamp, value }
    })
    .filter((point): point is { time: UTCTimestamp; value: number } => Boolean(point))
}

function calculateEma(bars: DisplayBar[], period: number) {
  const multiplier = 2 / (period + 1)
  let previous: number | null = null

  return bars.map((bar, index) => {
    if (index < period - 1) return null
    if (previous === null) {
      const seedBars = bars.slice(index - period + 1, index + 1)
      previous = seedBars.reduce((sum, item) => sum + item.close, 0) / period
    } else {
      previous = (bar.close - previous) * multiplier + previous
    }
    return { time: bar.time as UTCTimestamp, value: previous }
  }).filter((point): point is { time: UTCTimestamp; value: number } => Boolean(point))
}

function calculateVwap(bars: DisplayBar[]) {
  let cumulativePriceVolume = 0
  let cumulativeVolume = 0

  return bars.map((bar) => {
    const typicalPrice = (bar.high + bar.low + bar.close) / 3
    cumulativePriceVolume += typicalPrice * bar.volume
    cumulativeVolume += bar.volume
    return {
      time: bar.time as UTCTimestamp,
      value: cumulativeVolume > 0 ? cumulativePriceVolume / cumulativeVolume : typicalPrice,
    }
  })
}

function getIndicatorData(indicator: IndicatorId, bars: DisplayBar[]) {
  if (indicator === "sma20") return calculateSma(bars, 20)
  if (indicator === "ema20") return calculateEma(bars, 20)
  return calculateVwap(bars)
}

export function TradingViewAdvancedChart({
  mint,
  symbol,
}: {
  mint: string
  symbol: string
}) {
  return <LightweightTradingChart mint={mint} symbol={symbol} />
}

function LightweightTradingChart({
  mint,
  symbol,
}: {
  mint: string
  symbol: string
}) {
  const shellRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null)
  const lineSeriesRef = useRef<ISeriesApi<"Line"> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null)
  const indicatorSeriesRef = useRef<Record<IndicatorId, ISeriesApi<"Line"> | null>>({
    sma20: null,
    ema20: null,
    vwap: null,
  })
  const undoStackRef = useRef<ChartSettings[]>([])
  const redoStackRef = useRef<ChartSettings[]>([])

  const [interval, setIntervalOption] = useState<LocalChartInterval>("1m")
  const [limit, setLimit] = useState(180)
  const [selectedRange, setSelectedRange] = useState<LocalChartRange | null>(null)
  const [scaleMode, setScaleMode] = useState<ScaleMode>("price")
  const [logMode, setLogMode] = useState(false)
  const [valueMode, setValueMode] = useState<ValueMode>("price")
  const [chartType, setChartType] = useState<ChartType>("candles")
  const [activeIndicators, setActiveIndicators] = useState<IndicatorId[]>([])
  const [indicatorMenuOpen, setIndicatorMenuOpen] = useState(false)
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false)
  const [gridVisible, setGridVisible] = useState(true)
  const [volumeVisible, setVolumeVisible] = useState(true)
  const [historySizes, setHistorySizes] = useState({ undo: 0, redo: 0 })
  const [clock, setClock] = useState<Date | null>(null)
  const [bars, setBars] = useState<OhlcvBar[]>([])
  const [marketCapMultiplier, setMarketCapMultiplier] = useState<number | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const currentSettings = (): ChartSettings => ({
    interval,
    limit,
    selectedRange,
    scaleMode,
    logMode,
    valueMode,
    chartType,
    activeIndicators,
    gridVisible,
    volumeVisible,
  })

  const applySettings = (settings: ChartSettings) => {
    setIntervalOption(settings.interval)
    setLimit(settings.limit)
    setSelectedRange(settings.selectedRange)
    setScaleMode(settings.scaleMode)
    setLogMode(settings.logMode)
    setValueMode(settings.valueMode)
    setChartType(settings.chartType)
    setActiveIndicators(settings.activeIndicators)
    setGridVisible(settings.gridVisible)
    setVolumeVisible(settings.volumeVisible)
  }

  const syncHistorySizes = () => {
    setHistorySizes({
      undo: undoStackRef.current.length,
      redo: redoStackRef.current.length,
    })
  }

  const updateSettings = (next: Partial<ChartSettings>) => {
    undoStackRef.current.push(currentSettings())
    redoStackRef.current = []
    syncHistorySizes()

    if (next.interval !== undefined) setIntervalOption(next.interval)
    if (next.limit !== undefined) setLimit(next.limit)
    if (next.selectedRange !== undefined) setSelectedRange(next.selectedRange)
    if (next.scaleMode !== undefined) setScaleMode(next.scaleMode)
    if (next.logMode !== undefined) setLogMode(next.logMode)
    if (next.valueMode !== undefined) setValueMode(next.valueMode)
    if (next.chartType !== undefined) setChartType(next.chartType)
    if (next.activeIndicators !== undefined) setActiveIndicators(next.activeIndicators)
    if (next.gridVisible !== undefined) setGridVisible(next.gridVisible)
    if (next.volumeVisible !== undefined) setVolumeVisible(next.volumeVisible)
  }

  const undo = () => {
    const previous = undoStackRef.current.pop()
    if (!previous) return
    redoStackRef.current.push(currentSettings())
    syncHistorySizes()
    applySettings(previous)
  }

  const redo = () => {
    const next = redoStackRef.current.pop()
    if (!next) return
    undoStackRef.current.push(currentSettings())
    syncHistorySizes()
    applySettings(next)
  }

  const sortedBars = useMemo(
    () => [...bars].sort((a, b) => a.time - b.time),
    [bars],
  )
  const valueMultiplier = valueMode === "mcap" ? marketCapMultiplier ?? 1 : 1
  const displayBars = useMemo<DisplayBar[]>(
    () =>
      sortedBars.map((bar) => ({
        ...bar,
        sourceOpen: bar.open,
        sourceClose: bar.close,
        open: bar.open * valueMultiplier,
        high: bar.high * valueMultiplier,
        low: bar.low * valueMultiplier,
        close: bar.close * valueMultiplier,
      })),
    [sortedBars, valueMultiplier],
  )

  useEffect(() => {
    const initialTimer = window.setTimeout(() => setClock(new Date()), 0)
    const timer = window.setInterval(() => setClock(new Date()), 1000)
    return () => {
      window.clearTimeout(initialTimer)
      window.clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadTokenMultiplier() {
      try {
        const response = await fetch(`/api/token/${mint}`)
        const payload = (await response.json()) as {
          data: TokenPayload | null
          error: { message: string } | null
        }
        const token = payload.data?.token
        if (!cancelled && response.ok && token) {
          const multiplier =
            token.supply && token.supply > 0
              ? token.supply
              : token.price > 0
                ? token.marketCap / token.price
                : null
          setMarketCapMultiplier(multiplier && Number.isFinite(multiplier) ? multiplier : null)
        }
      } catch {
        if (!cancelled) setMarketCapMultiplier(null)
      }
    }

    void loadTokenMultiplier()

    return () => {
      cancelled = true
    }
  }, [mint])

  useEffect(() => {
    let cancelled = false

    async function loadBars() {
      try {
        setLoadError(null)
        const response = await fetch(
          `/api/token/${mint}/chart?${new URLSearchParams({
            interval,
            limit: String(limit),
          }).toString()}`,
        )
        const payload = (await response.json()) as {
          data: ChartPayload | null
          error: { message: string } | null
        }

        if (!response.ok || payload.error || !payload.data) {
          throw new Error(payload.error?.message || "Unable to load chart")
        }
        if (!cancelled) {
          setBars(payload.data.items)
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Unable to load chart")
        }
      }
    }

    void loadBars()
    const pollMs = interval === "1D" ? 60_000 : 25_000
    const pollTimer = window.setInterval(loadBars, pollMs)

    return () => {
      cancelled = true
      window.clearInterval(pollTimer)
    }
  }, [interval, limit, mint])

  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      autoSize: true,
      height: 500,
      layout: {
        background: {
          type: ColorType.Solid,
          color: "#05050d",
        },
        textColor: "#b9c2d6",
      },
      grid: {
        vertLines: {
          color: "rgba(151,176,209,0.08)",
        },
        horzLines: {
          color: "rgba(151,176,209,0.08)",
        },
      },
      crosshair: {
        vertLine: {
          color: "rgba(32,233,130,0.2)",
        },
        horzLine: {
          color: "rgba(32,233,130,0.2)",
        },
      },
      rightPriceScale: {
        borderColor: "rgba(151,176,209,0.1)",
      },
      timeScale: {
        borderColor: "rgba(151,176,209,0.1)",
        timeVisible: true,
        secondsVisible: false,
        barSpacing: 6,
        minBarSpacing: 2,
        rightOffset: 4,
      },
    })

    candleSeriesRef.current = chart.addSeries(CandlestickSeries, {
      upColor: "#20e982",
      downColor: "#ff4b55",
      borderVisible: false,
      wickUpColor: "#20e982",
      wickDownColor: "#ff4b55",
    })
    lineSeriesRef.current = chart.addSeries(LineSeries, {
      color: "#20e982",
      lineWidth: 2,
      priceLineVisible: true,
    })
    volumeSeriesRef.current = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "",
    })
    volumeSeriesRef.current.priceScale().applyOptions({
      scaleMargins: {
        top: 0.84,
        bottom: 0,
      },
    })
    indicatorSeriesRef.current.sma20 = chart.addSeries(LineSeries, {
      color: INDICATOR_COLORS.sma20,
      lineWidth: 2,
      priceLineVisible: false,
    })
    indicatorSeriesRef.current.ema20 = chart.addSeries(LineSeries, {
      color: INDICATOR_COLORS.ema20,
      lineWidth: 2,
      priceLineVisible: false,
    })
    indicatorSeriesRef.current.vwap = chart.addSeries(LineSeries, {
      color: INDICATOR_COLORS.vwap,
      lineWidth: 2,
      priceLineVisible: false,
    })

    chartRef.current = chart

    const resizeObserver = new ResizeObserver(() => {
      chart.applyOptions({ autoSize: true })
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      chart.remove()
      chartRef.current = null
      candleSeriesRef.current = null
      lineSeriesRef.current = null
      volumeSeriesRef.current = null
      indicatorSeriesRef.current = {
        sma20: null,
        ema20: null,
        vwap: null,
      }
    }
  }, [])

  useEffect(() => {
    if (!chartRef.current || !candleSeriesRef.current || !lineSeriesRef.current) return

    const latestValue = displayBars.at(-1)?.close ?? 1
    const precision = getPrecision(latestValue, valueMode)
    const priceFormat: PriceFormat =
      valueMode === "mcap"
        ? {
          type: "custom",
          minMove: 1,
          formatter: (price: number) => formatCompactCurrency(price),
        }
        : {
          type: "price",
          precision,
          minMove: 10 ** -precision,
        }

    candleSeriesRef.current.applyOptions({
      priceFormat,
      visible: chartType === "candles",
    })
    lineSeriesRef.current.applyOptions({
      priceFormat,
      visible: chartType === "line",
    })
    candleSeriesRef.current.setData(
      displayBars.map((bar) => ({
        time: bar.time as UTCTimestamp,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
      })),
    )
    lineSeriesRef.current.setData(
      displayBars.map((bar) => ({
        time: bar.time as UTCTimestamp,
        value: bar.close,
      })),
    )
    volumeSeriesRef.current?.setData(
      displayBars.map((bar) => ({
        time: bar.time as UTCTimestamp,
        value: bar.volume,
        color: bar.sourceClose >= bar.sourceOpen
          ? "rgba(32,233,130,.36)"
          : "rgba(255,75,85,.36)",
      })),
    )

    for (const option of INDICATOR_OPTIONS) {
      const series = indicatorSeriesRef.current[option.id]
      if (!series) continue
      series.applyOptions({
        priceFormat,
        visible: activeIndicators.includes(option.id),
      })
      series.setData(activeIndicators.includes(option.id) ? getIndicatorData(option.id, displayBars) : [])
    }

    const visibleBars = selectedRange ? displayBars.length : Math.min(displayBars.length, 120)
    chartRef.current.timeScale().setVisibleLogicalRange({
      from: Math.max(0, displayBars.length - visibleBars),
      to: displayBars.length + 4,
    })
  }, [activeIndicators, chartType, displayBars, selectedRange, valueMode])

  useEffect(() => {
    chartRef.current?.applyOptions({
      grid: {
        vertLines: {
          color: gridVisible ? "rgba(151,176,209,0.08)" : "transparent",
        },
        horzLines: {
          color: gridVisible ? "rgba(151,176,209,0.08)" : "transparent",
        },
      },
    })
  }, [gridVisible])

  useEffect(() => {
    volumeSeriesRef.current?.applyOptions({
      visible: volumeVisible,
    })
  }, [volumeVisible])

  useEffect(() => {
    chartRef.current?.priceScale("right").applyOptions({
      mode: logMode
        ? PriceScaleMode.Logarithmic
        : scaleMode === "percent"
          ? PriceScaleMode.Percentage
          : PriceScaleMode.Normal,
    })
  }, [logMode, scaleMode])

  const jumpToLive = () => {
    chartRef.current?.timeScale().scrollToRealTime()
  }

  const downloadSnapshot = () => {
    const chart = chartRef.current
    if (!chart) return

    const canvas = chart.takeScreenshot(true, true)
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${symbol.toLowerCase()}-${valueMode}-chart.png`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    }, "image/png")
  }

  const lastBar = displayBars.at(-1)
  const isUp = lastBar ? lastBar.close >= lastBar.open : true
  const activeIntervalLabel =
    INTERVAL_OPTIONS.find((option) => option.value === interval)?.label ?? interval
  const utcTime = clock ? `${formatClock(clock)} UTC` : "--:--:-- UTC"
  const undoAvailable = historySizes.undo > 0
  const redoAvailable = historySizes.redo > 0

  return (
    <div ref={shellRef} className="relative flex h-[620px] flex-col border-b border-white/10 bg-[#05050d]">
      <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-white/[0.07] px-4">
        <div className="flex min-w-0 items-center gap-2 overflow-x-auto scrollbar-none">
          {INTERVAL_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() =>
                updateSettings({
                  interval: option.value,
                  limit: option.limit,
                  selectedRange: null,
                })
              }
              className={toolbarButtonClass(interval === option.value && !selectedRange)}
            >
              {option.label}
            </button>
          ))}
          <span className="h-7 w-px shrink-0 bg-white/15" />
          <button
            type="button"
            className={iconButtonClass(chartType === "candles")}
            title={chartType === "candles" ? "Switch to line chart" : "Switch to candles"}
            onClick={() => updateSettings({ chartType: chartType === "candles" ? "line" : "candles" })}
          >
            <CandlestickChart className="size-4" />
          </button>
          <span className="h-7 w-px shrink-0 bg-white/15" />
          <button
            type="button"
            className={toolbarButtonClass(activeIndicators.length > 0)}
            title="Indicators"
            onClick={() => {
              setSettingsMenuOpen(false)
              setIndicatorMenuOpen((current) => !current)
            }}
          >
            <span className="mr-1 text-base font-light leading-none">fx</span>
            Indicators
          </button>
          <span className="h-7 w-px shrink-0 bg-white/15" />
          <button
            type="button"
            className={toolbarButtonClass(true)}
            title="Toggle price or market cap scale"
            onClick={() => updateSettings({ valueMode: valueMode === "price" ? "mcap" : "price" })}
          >
            <span className={valueMode === "price" ? "text-white" : "text-[#9aa6bf]"}>Price</span>
            <span className="px-1 text-white/35">/</span>
            <span className={valueMode === "mcap" ? "text-white" : "text-[#6078ff]"}>MCap</span>
          </button>
          <span className="h-7 w-px shrink-0 bg-white/15" />
          <button type="button" className={iconButtonClass()} title="Undo chart setting" disabled={!undoAvailable} onClick={undo}>
            <Undo2 className="size-4" />
          </button>
          <button type="button" className={iconButtonClass()} title="Redo chart setting" disabled={!redoAvailable} onClick={redo}>
            <Redo2 className="size-4" />
          </button>
        </div>
        <div className="hidden shrink-0 items-center gap-2 md:flex">
          <span className="h-7 w-px bg-white/15" />
          <button type="button" className={iconButtonClass()} title="Jump to live" onClick={jumpToLive}>
            <Zap className="size-4" />
          </button>
          <button
            type="button"
            className={iconButtonClass(settingsMenuOpen)}
            title="Chart settings"
            onClick={() => {
              setIndicatorMenuOpen(false)
              setSettingsMenuOpen((current) => !current)
            }}
          >
            <Hexagon className="size-4" />
          </button>
          <button
            type="button"
            className={iconButtonClass()}
            title="Fullscreen"
            onClick={() => void shellRef.current?.requestFullscreen?.()}
          >
            <Maximize className="size-4" />
          </button>
          <button type="button" className={iconButtonClass()} title="Snapshot" onClick={downloadSnapshot}>
            <Camera className="size-4" />
          </button>
        </div>
      </div>

      {indicatorMenuOpen ? (
        <div className="absolute left-[260px] top-11 z-30 w-64 rounded-lg border border-white/10 bg-[#080812] p-2 shadow-2xl">
          {INDICATOR_OPTIONS.map((option) => {
            const active = activeIndicators.includes(option.id)
            return (
              <button
                key={option.id}
                type="button"
                className="flex w-full items-start gap-3 rounded-md px-2 py-2 text-left transition hover:bg-white/[0.06]"
                onClick={() => {
                  updateSettings({
                    activeIndicators: active
                      ? activeIndicators.filter((indicator) => indicator !== option.id)
                      : [...activeIndicators, option.id],
                  })
                }}
              >
                <span
                  className="mt-1 size-2.5 rounded-full"
                  style={{ backgroundColor: active ? INDICATOR_COLORS[option.id] : "rgba(255,255,255,.18)" }}
                />
                <span>
                  <span className="block text-xs font-semibold text-white">{option.label}</span>
                  <span className="mt-0.5 block text-[11px] leading-4 text-[#9aa6bf]">{option.description}</span>
                </span>
              </button>
            )
          })}
        </div>
      ) : null}

      {settingsMenuOpen ? (
        <div className="absolute right-9 top-11 z-30 w-64 rounded-lg border border-white/10 bg-[#080812] p-2 shadow-2xl">
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left transition hover:bg-white/[0.06]"
            onClick={() => updateSettings({ volumeVisible: !volumeVisible })}
          >
            <span>
              <span className="block text-xs font-semibold text-white">Volume bars</span>
              <span className="mt-0.5 block text-[11px] leading-4 text-[#9aa6bf]">Show or hide the volume overlay.</span>
            </span>
            <span className={volumeVisible ? "text-xs font-semibold text-chad-green" : "text-xs font-semibold text-[#9aa6bf]"}>
              {volumeVisible ? "On" : "Off"}
            </span>
          </button>
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left transition hover:bg-white/[0.06]"
            onClick={() => updateSettings({ gridVisible: !gridVisible })}
          >
            <span>
              <span className="block text-xs font-semibold text-white">Grid lines</span>
              <span className="mt-0.5 block text-[11px] leading-4 text-[#9aa6bf]">Toggle chart background guides.</span>
            </span>
            <span className={gridVisible ? "text-xs font-semibold text-chad-green" : "text-xs font-semibold text-[#9aa6bf]"}>
              {gridVisible ? "On" : "Off"}
            </span>
          </button>
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left transition hover:bg-white/[0.06]"
            onClick={() => {
              updateSettings({
                gridVisible: true,
                volumeVisible: true,
                scaleMode: "price",
                logMode: false,
                valueMode: "price",
                chartType: "candles",
                activeIndicators: [],
              })
            }}
          >
            <span>
              <span className="block text-xs font-semibold text-white">Reset view</span>
              <span className="mt-0.5 block text-[11px] leading-4 text-[#9aa6bf]">Restore the default chart display.</span>
            </span>
          </button>
        </div>
      ) : null}

      <div className="relative min-h-0 flex-1">
        <div className="absolute left-5 top-3 z-10 flex max-w-[calc(100%-120px)] flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-white">
            {symbol} / {valueMode === "mcap" ? "MCap" : "USD"}
          </span>
          <span className="text-[#9aa6bf]">{activeIntervalLabel}</span>
          {lastBar ? (
            <span className={isUp ? "text-chad-green" : "text-[#ff4b55]"}>
              O {formatChartValue(lastBar.open, valueMode)} H {formatChartValue(lastBar.high, valueMode)} L {formatChartValue(lastBar.low, valueMode)} C {formatChartValue(lastBar.close, valueMode)}
            </span>
          ) : (
            <span className="text-[#9aa6bf]">Loading chart...</span>
          )}
        </div>
        <div ref={containerRef} className="h-full w-full" aria-label={`${symbol} lightweight chart`} />
      </div>

      {loadError ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#05050d] p-6 text-center">
          <div>
            <h3 className="text-sm font-semibold text-white">Chart data unavailable</h3>
            <p className="mt-2 max-w-md text-xs text-muted">{loadError}</p>
          </div>
        </div>
      ) : null}

      <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-t border-white/[0.07] px-5">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() =>
                updateSettings({
                  interval: option.interval,
                  limit: option.limit,
                  selectedRange: option.label,
                })
              }
              className={toolbarButtonClass(selectedRange === option.label)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs font-semibold text-white">
          <span className="tabular-nums text-[#e8ecf8]">{utcTime}</span>
          <span className="mx-1 h-7 w-px bg-white/15" />
          <button
            type="button"
            className={toolbarButtonClass(scaleMode === "percent")}
            onClick={() =>
              updateSettings({
                scaleMode: scaleMode === "percent" ? "price" : "percent",
                logMode: false,
              })
            }
          >
            %
          </button>
          <button
            type="button"
            className={toolbarButtonClass(logMode)}
            onClick={() =>
              updateSettings({
                logMode: !logMode,
                scaleMode: "price",
              })
            }
          >
            log
          </button>
          <button
            type="button"
            className="inline-flex h-8 items-center justify-center rounded-md bg-white/20 px-2 text-xs font-semibold text-white transition hover:bg-white/25"
            onClick={() => chartRef.current?.timeScale().fitContent()}
          >
            auto
          </button>
          <button
            type="button"
            className={iconButtonClass(settingsMenuOpen)}
            title="Chart options"
            onClick={() => {
              setIndicatorMenuOpen(false)
              setSettingsMenuOpen((current) => !current)
            }}
          >
            <Settings2 className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
