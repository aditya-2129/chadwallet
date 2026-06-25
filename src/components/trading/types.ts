import type {
  Holder,
  OhlcvBar,
  SwapExecutionResult,
  SwapOrder,
  TokenDetail,
  TokenSummary,
  TradeEvent,
  WalletPosition,
} from "@/lib/types"

export type SourceTag = "birdeye" | "alchemy" | "jupiter" | "fallback"

export type MarketPayload = {
  items: TokenSummary[]
  source: SourceTag
}

export type TokenPayload = {
  token: TokenDetail
  source: SourceTag
}

export type ChartPayload = {
  items: OhlcvBar[]
  source: SourceTag
}

export type TradesPayload = {
  items: TradeEvent[]
  source: SourceTag
}

export type HoldersPayload = {
  items: Holder[]
  source: SourceTag
}

export type PositionPayload = {
  position: WalletPosition | null
  source: SourceTag
}

export type QuotePayload = {
  order: SwapOrder
  inputSymbol: string
  outputSymbol: string
  inputUiAmount: number
  outputUiAmount: number
  minimumReceivedUi: number
  source: SourceTag
  liveTradingEnabled: boolean
  executable: boolean
}

export type ExecutionPayload = {
  result: SwapExecutionResult
  source: SourceTag
}
