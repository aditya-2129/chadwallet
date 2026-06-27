import type { OhlcvBar } from "@/lib/types"

export type TradingViewResolution = "1" | "5" | "15" | "60" | "240" | "1D" | "D"
export type BackendChartInterval = "1m" | "5m" | "15m" | "1H" | "4H" | "1D"

export type TradingViewBar = {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

export type LibrarySymbolInfo = {
  ticker: string
  name: string
  full_name: string
  description: string
  type: "crypto"
  session: "24x7"
  timezone: "Etc/UTC"
  exchange: "ChadWallet"
  listed_exchange: "ChadWallet"
  format: "price"
  minmov: number
  pricescale: number
  has_intraday: boolean
  has_daily: boolean
  has_weekly_and_monthly: boolean
  supported_resolutions: string[]
  intraday_multipliers: string[]
  daily_multipliers: string[]
  volume_precision: number
  data_status: "streaming"
}

export type DatafeedConfiguration = {
  supported_resolutions: string[]
  supports_group_request: boolean
  supports_marks: boolean
  supports_timescale_marks: boolean
  supports_time: boolean
  exchanges: Array<{ value: string; name: string; desc: string }>
  symbols_types: Array<{ name: string; value: string }>
}

export type PeriodParams = {
  from: number
  to: number
  countBack?: number
  firstDataRequest?: boolean
}

export type HistoryMetadata = {
  noData?: boolean
}

export type DatafeedErrorCallback = (reason: string) => void
export type HistoryCallback = (bars: TradingViewBar[], meta: HistoryMetadata) => void
export type ResolveCallback = (symbolInfo: LibrarySymbolInfo) => void
export type SearchSymbolsCallback = (symbols: unknown[]) => void
export type RealtimeCallback = (bar: TradingViewBar) => void

export type ChadWalletDatafeed = {
  onReady(callback: (configuration: DatafeedConfiguration) => void): void
  searchSymbols(
    userInput: string,
    exchange: string,
    symbolType: string,
    onResult: SearchSymbolsCallback,
  ): void
  resolveSymbol(
    symbolName: string,
    onResolve: ResolveCallback,
    onError: DatafeedErrorCallback,
  ): void
  getBars(
    symbolInfo: LibrarySymbolInfo,
    resolution: string,
    periodParams: PeriodParams,
    onHistory: HistoryCallback,
    onError: DatafeedErrorCallback,
  ): void
  subscribeBars(
    symbolInfo: LibrarySymbolInfo,
    resolution: string,
    onRealtime: RealtimeCallback,
    subscriberUID: string,
  ): void
  unsubscribeBars(subscriberUID: string): void
}

export type ChartPayload = {
  items: OhlcvBar[]
  source: string
}

export type TokenPayload = {
  token: {
    mint: string
    name: string
    symbol: string
    price: number
  }
  source: string
}

export type TradingViewWidgetOptions = {
  container: HTMLElement
  library_path: string
  datafeed: ChadWalletDatafeed
  symbol: string
  interval: string
  locale: string
  timezone: "Etc/UTC"
  autosize: boolean
  theme: "dark"
  toolbar_bg: string
  loading_screen: { backgroundColor: string; foregroundColor: string }
  enabled_features?: string[]
  disabled_features?: string[]
  overrides?: Record<string, string | number | boolean>
}

export type TradingViewWidgetInstance = {
  remove(): void
}

export type TradingViewGlobal = {
  widget(options: TradingViewWidgetOptions): TradingViewWidgetInstance
}
