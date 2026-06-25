"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import {
  CandlestickSeries,
  ColorType,
  createChart,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts"
import type { OhlcvBar } from "@/lib/types"

export function CandlestickChart({
  data,
  symbol,
}: {
  data: OhlcvBar[]
  symbol: string
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null)

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
        textColor: "#8ea0ba",
      },
      grid: {
        vertLines: {
          color: "rgba(151, 176, 209, 0.04)",
        },
        horzLines: {
          color: "rgba(151, 176, 209, 0.04)",
        },
      },
      crosshair: {
        vertLine: {
          color: "rgba(131, 224, 196, 0.15)",
        },
        horzLine: {
          color: "rgba(131, 224, 196, 0.15)",
        },
      },
      rightPriceScale: {
        borderColor: "rgba(151, 176, 209, 0.08)",
      },
      timeScale: {
        borderColor: "rgba(151, 176, 209, 0.08)",
        timeVisible: true,
        barSpacing: 6,
        minBarSpacing: 2,
        rightOffset: 4,
      },
    })

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#20e982",
      downColor: "#ff4b55",
      borderVisible: false,
      wickUpColor: "#20e982",
      wickDownColor: "#ff4b55",
    })
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "",
    })
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.85,
        bottom: 0,
      },
    })

    chartRef.current = chart
    seriesRef.current = series
    volumeSeriesRef.current = volumeSeries

    const resizeObserver = new ResizeObserver(() => {
      chart.applyOptions({ autoSize: true })
    })

    resizeObserver.observe(containerRef.current)
    return () => {
      resizeObserver.disconnect()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
      volumeSeriesRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!seriesRef.current || !data.length) return

    const latestPrice = data[data.length - 1]?.close ?? 1
    const precision =
      latestPrice < 0.000001
        ? 10
        : latestPrice < 0.0001
          ? 8
          : latestPrice < 0.01
            ? 6
            : latestPrice < 1
              ? 4
              : 2

    seriesRef.current.applyOptions({
      priceFormat: {
        type: "price",
        precision,
        minMove: 10 ** -precision,
      },
    })

    seriesRef.current.setData(
      data.map((bar) => ({
        time: bar.time as UTCTimestamp,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
      })),
    )
    volumeSeriesRef.current?.setData(
      data.map((bar) => ({
        time: bar.time as UTCTimestamp,
        value: bar.volume,
        color: bar.close >= bar.open ? "rgba(32,233,130,.4)" : "rgba(255,75,85,.4)",
      })),
    )

    if (data.length > 0) {
      chartRef.current?.timeScale().setVisibleLogicalRange({
        from: Math.max(0, data.length - 75),
        to: data.length + 2,
      })
    }
  }, [data])

  const lastBar = data[data.length - 1]
  const isUp = lastBar ? lastBar.close >= lastBar.open : true
  const ohlcColor = isUp ? "text-chad-green" : "text-[#ff4b55]"
  const changePct = lastBar ? ((lastBar.close - lastBar.open) / lastBar.open) * 100 : 0
  const changePctString = (changePct >= 0 ? "+" : "") + changePct.toFixed(2) + "%"

  const formatVal = (val: number) => {
    if (val < 0.0001) return val.toFixed(7)
    if (val < 0.01) return val.toFixed(5)
    return val.toFixed(4)
  }

  return (
    <div className="bg-[#05050d] border-b border-white/10">
      <div className="flex flex-wrap items-center gap-1.5 px-4 pt-2 text-[11px]">
        <span className="font-bold text-white">{symbol} · 1 · ChadWallet</span>
        {lastBar ? (
          <div className={cn("flex items-center gap-2", ohlcColor)}>
            <span>O${formatVal(lastBar.open)}</span>
            <span>H${formatVal(lastBar.high)}</span>
            <span>L${formatVal(lastBar.low)}</span>
            <span>C${formatVal(lastBar.close)}</span>
            <span className="font-semibold">({changePctString})</span>
          </div>
        ) : null}
      </div>
      <div ref={containerRef} className="w-full" />
    </div>
  )
}
