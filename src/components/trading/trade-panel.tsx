/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
"use client"

import { useEffect, useMemo, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ArrowLeftRight, ChevronDown, ShieldCheck, AlertTriangle, Settings2 } from "lucide-react"
import {
  useSignTransaction,
  useWallets as useSolanaWallets,
} from "@privy-io/react-auth/solana"
import { useAuth } from "@/components/auth-context"
import { cn, formatCurrency, formatNumber } from "@/lib/utils"
import { SOL_MINT, USDC_MINT } from "@/lib/mock-data"
import type {
  ExecutionPayload,
  PositionPayload,
  QuotePayload,
  TokenPayload,
} from "@/components/trading/types"

async function callApi<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init)
  const payload = (await response.json()) as {
    data: T | null
    error: { message: string } | null
  }

  if (!response.ok || payload.error || !payload.data) {
    throw new Error(payload.error?.message || "Request failed")
  }

  return payload.data
}

export function TradePanel({
  mint,
  token,
  position,
  solPosition,
  usdcPosition,
  onSuccess,
}: {
  mint: string
  token?: TokenPayload
  position?: PositionPayload
  solPosition?: PositionPayload
  usdcPosition?: PositionPayload
  onSuccess?: () => void
}) {
  const { authenticated, address, demoMode, getAccessToken, login } = useAuth()
  const queryClient = useQueryClient()
  
  const [side, setSide] = useState<"buy" | "sell">("buy")
  const [quoteMint, setQuoteMint] = useState(USDC_MINT)
  const [amount, setAmount] = useState("0")
  const [slippageInput, setSlippageInput] = useState("0.5") // 0.5% default
  const [review, setReview] = useState<QuotePayload | null>(null)
  
  const [reviewFetchedAt, setReviewFetchedAt] = useState<number | null>(null)
  const [secondsLeft, setSecondsLeft] = useState<number>(30)
  const [pendingBuildOrder, setPendingBuildOrder] = useState(false)
  const [isScamAcknowledged, setIsScamAcknowledged] = useState(false)

  // Reset scam warning acknowledgement when mint changes
  useEffect(() => {
    setIsScamAcknowledged(false)
  }, [mint])

  const inputMint = side === "buy" ? quoteMint : mint
  const outputMint = side === "buy" ? mint : quoteMint

  // Invalidate inputs on side, quoteMint, amount, or slippage changes
  useEffect(() => {
    setReview(null)
    setReviewFetchedAt(null)
    setSecondsLeft(30)
  }, [side, quoteMint, amount, slippageInput])

  // Count down quote expiry
  useEffect(() => {
    if (!review || !reviewFetchedAt) {
      setSecondsLeft(30)
      return
    }
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - reviewFetchedAt) / 1000)
      const left = 30 - elapsed
      if (left <= 0) {
        setSecondsLeft(0)
        clearInterval(interval)
      } else {
        setSecondsLeft(left)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [review, reviewFetchedAt])

  const isExpired = review ? secondsLeft <= 0 : false

  // Mutations
  const quoteMutation = useMutation({
    mutationFn: async (body: {
      inputMint: string
      outputMint: string
      amountUi: number
      slippageBps: number
    }) =>
      callApi<QuotePayload>("/api/trade/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: (data) => {
      setReview(data)
      setReviewFetchedAt(Date.now())
      setSecondsLeft(30)
    },
  })

  const orderMutation = useMutation({
    mutationFn: async (body: {
      inputMint: string
      outputMint: string
      amountUi: number
      slippageBps: number
      taker: string
    }) => {
      const token = await getAccessToken()
      return callApi<QuotePayload>("/api/trade/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      })
    },
    onSuccess: (data) => {
      setReview(data)
      setReviewFetchedAt(Date.now())
      setSecondsLeft(30)
    },
  })

  const executeMutation = useMutation({
    mutationFn: async (body: { requestId: string; signedTransaction: string }) => {
      const token = await getAccessToken()
      return callApi<ExecutionPayload>("/api/trade/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      })
    },
    onSuccess: () => {
      // Invalidate positions to refresh balances after successful trade
      void queryClient.invalidateQueries({ queryKey: ["position", address] })
      onSuccess?.()
    }
  })

  // Restore build order click after login
  useEffect(() => {
    if (authenticated && address && pendingBuildOrder) {
      setPendingBuildOrder(false)
      submitOrder()
    }
  }, [authenticated, address, pendingBuildOrder])

  const liveEnabled = review?.liveTradingEnabled ?? false
  const isBusy =
    quoteMutation.isPending || orderMutation.isPending || executeMutation.isPending

  // Get active user balance for the input asset
  const userBalance = useMemo(() => {
    if (side === "buy") {
      return quoteMint === USDC_MINT
        ? (usdcPosition?.position?.balance ?? 0)
        : (solPosition?.position?.balance ?? 0)
    } else {
      return position?.position?.balance ?? 0
    }
  }, [side, quoteMint, position, solPosition, usdcPosition])

  const inputAssetSymbol = useMemo(() => {
    if (side === "buy") {
      return quoteMint === USDC_MINT ? "USDC" : "SOL"
    } else {
      return token?.token.symbol ?? "TOKEN"
    }
  }, [side, quoteMint, token])

  const amountUi = parseFloat(amount)
  const isAmountValid = !isNaN(amountUi) && amountUi > 0
  const isSlippageValid = useMemo(() => {
    const s = parseFloat(slippageInput)
    return !isNaN(s) && s > 0 && s <= 50 // slippage must be positive and <= 50%
  }, [slippageInput])

  const hasInsufficientBalance = authenticated && isAmountValid && userBalance < amountUi

  const summaryNote = demoMode
    ? "Demo auth is active. Add Privy env vars for Apple/Google login."
    : authenticated
      ? "Authenticated wallet can request order payloads."
      : "Sign in to build order payloads and unlock execution review."

  // Preset buttons callback
  function handlePresetClick(val: string) {
    setAmount(val)
  }

  function handlePresetPercentClick(pct: number) {
    const bal = side === "sell" ? (position?.position?.balance ?? 0) : 0
    if (bal > 0) {
      setAmount((bal * pct).toFixed(4))
    }
  }

  const slippageBps = useMemo(() => {
    const s = parseFloat(slippageInput)
    return isNaN(s) ? 50 : Math.round(s * 100)
  }, [slippageInput])

  function submitQuote() {
    if (!isAmountValid || !isSlippageValid) return
    quoteMutation.mutate({
      inputMint,
      outputMint,
      amountUi,
      slippageBps,
    })
  }

  function submitOrder() {
    if (!isAmountValid || !isSlippageValid) return
    if (!authenticated || !address) {
      setPendingBuildOrder(true)
      login()
      return
    }

    orderMutation.mutate({
      inputMint,
      outputMint,
      amountUi,
      slippageBps,
      taker: address,
    })
  }

  function submitExecution(signedTransaction: string) {
    if (!review?.order.requestId) return
    executeMutation.mutate({
      requestId: review.order.requestId,
      signedTransaction,
    })
  }

  const isUnverified = token ? !token.token.verified : false
  const isActionBlocked = isUnverified && !isScamAcknowledged

  return (
    <aside id="trade-panel" className="m-3 scroll-mt-4 rounded-2xl border border-white/10 bg-[#05050d] p-3">
      <div className="sr-only">
        <div>
          <p className="text-sm font-semibold text-white">Trade panel</p>
          <p className="mt-1 text-xs leading-6 text-muted">{summaryNote}</p>
        </div>
        <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
          Solana
        </span>
      </div>

      <div className="mb-2.5 grid grid-cols-2 gap-2 rounded-xl bg-[#090914] border border-white/5 p-1">
        {(["buy", "sell"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setSide(mode)}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-semibold transition",
              side === mode
                ? mode === "buy"
                  ? "bg-chad-green text-[#03120c]"
                  : "bg-[#ff4b55] text-white"
                : "text-muted hover:bg-white/[0.04] hover:text-white",
            )}
          >
            {mode === "buy" ? "Buy" : "Sell"}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2.5">
        {/* Pay/Receive selector */}
        <div className="order-2 rounded-xl border border-white/8 bg-[#090914] p-2.5">
          <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted">
            <span>{side === "buy" ? "Pay with" : "Receive in"}</span>
            <div className="flex items-center gap-1 text-white">
              <span>{quoteMint === USDC_MINT ? "USDC" : "SOL"}</span>
              <ChevronDown className="size-3.5 text-muted" />
            </div>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => setQuoteMint(USDC_MINT)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-semibold transition",
                quoteMint === USDC_MINT
                  ? "bg-white text-[#020817]"
                  : "border border-white/10 bg-white/5 text-muted hover:text-white",
              )}
            >
              USDC
            </button>
            <button
              onClick={() => setQuoteMint(SOL_MINT)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-semibold transition",
                quoteMint === SOL_MINT
                  ? "bg-white text-[#020817]"
                  : "border border-white/10 bg-white/5 text-muted hover:text-white",
              )}
            >
              SOL
            </button>
          </div>
        </div>

        {/* Amount Input */}
        <div className="order-1 rounded-xl border border-white/5 bg-[#090914] p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-0.5">
              <span className="text-3xl font-bold text-muted">$</span>
              <input
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                inputMode="decimal"
                className="w-32 bg-transparent text-3xl font-bold text-white outline-none placeholder:text-white/25"
                placeholder="0"
              />
            </div>
            <div className="text-right">
              <span className="text-[11px] text-muted">Enter amount</span>
              <p className="text-[10px] text-muted font-mono mt-0.5">
                Bal: {formatNumber(userBalance, false)}
              </p>
            </div>
          </div>
          
          {/* Preset Buttons */}
          <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-white/5">
            <div className="flex flex-wrap gap-1">
              {side === "buy" ? (
                quoteMint === USDC_MINT ? (
                  ["10", "100", "500", "1000"].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handlePresetClick(preset)}
                      className="rounded bg-white/5 hover:bg-white/10 px-2.5 py-1 text-xs font-semibold text-white transition"
                    >
                      ${preset}
                    </button>
                  ))
                ) : (
                  ["0.1", "0.5", "1.0", "5.0"].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handlePresetClick(preset)}
                      className="rounded bg-white/5 hover:bg-white/10 px-2.5 py-1 text-xs font-semibold text-white transition"
                    >
                      {preset} SOL
                    </button>
                  ))
                )
              ) : (
                [0.25, 0.5, 0.75, 1.0].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => handlePresetPercentClick(pct)}
                    className="rounded bg-white/5 hover:bg-white/10 px-2.5 py-1 text-xs font-semibold text-white transition"
                  >
                    {pct * 100}%
                  </button>
                ))
              )}
            </div>
            <button 
              onClick={() => {
                const el = document.getElementById("slippage-container");
                if (el) el.classList.toggle("hidden");
              }}
              className="rounded bg-white/5 hover:bg-white/10 p-1 text-muted hover:text-white transition cursor-pointer"
              title="Slippage settings"
            >
              <Settings2 className="size-3.5" />
            </button>
          </div>
        </div>

        <div className="order-2 flex items-center justify-between text-[11px] text-muted px-1">
          <span>${formatNumber(userBalance, false)} available</span>
        </div>

        {/* Editable Slippage */}
        <div id="slippage-container" className="order-6 hidden rounded-xl border border-white/10 bg-[#090914] p-2.5">
          <div className="flex items-center justify-between text-[11px] text-muted mb-1.5">
            <span>Slippage Tolerance (%)</span>
            <span className="text-white font-mono">{parseFloat(slippageInput || "0").toFixed(2)}%</span>
          </div>
          <label className="flex items-center gap-2 bg-transparent border border-white/10 rounded-lg px-2.5 py-1.5">
            <ArrowLeftRight className="size-3.5 text-muted" />
            <input
              value={slippageInput}
              onChange={(e) => setSlippageInput(e.target.value)}
              placeholder="0.5"
              className="bg-transparent text-xs text-white outline-none w-full placeholder:text-white/20"
              inputMode="decimal"
            />
          </label>
          {!isSlippageValid && slippageInput !== "" && (
            <p className="text-[10px] text-chad-red mt-1">Slippage must be a positive percentage (max 50%).</p>
          )}
        </div>

        {/* Position display */}
        {position?.position && !position.position.unavailable ? (
          <div className="order-5 rounded-xl border border-white/8 bg-[#090914] p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">
              Wallet position
            </p>
            <div className="mt-1.5 flex items-end justify-between">
              <div>
                <p className="text-sm font-semibold text-white leading-tight">
                  {formatNumber(position.position.balance, false)}{" "}
                  {position.position.symbol}
                </p>
                <p className="text-[10px] text-muted mt-0.5 leading-none">
                  {formatCurrency(position.position.valueUsd)} ·{" "}
                  {position.position.portfolioPercentage.toFixed(2)}% of wallet
                </p>
              </div>
              <span className="rounded border border-white/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-muted">
                {position.source}
              </span>
            </div>
          </div>
        ) : position?.position?.unavailable ? (
          <div className="order-5 rounded-xl border border-chad-red/10 bg-[#120a0c] p-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#ff5a64]">Wallet position unavailable</p>
              <p className="text-[10px] text-muted mt-0.5">Solana RPC is unconfigured or failed</p>
            </div>
            <span className="rounded border border-chad-red/20 bg-chad-red/5 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-[#ff5a64]">
              RPC Down
            </span>
          </div>
        ) : null}

        {/* Validation Errors */}
        {hasInsufficientBalance && (
          <div className="order-4 rounded-xl border border-chad-red/25 bg-[#17090c] p-2.5 text-xs text-[#ff5a64] flex items-center gap-2">
            <AlertTriangle className="size-3.5 shrink-0 text-[#ff5a64]" />
            <span>Insufficient {inputAssetSymbol} balance for this transaction.</span>
          </div>
        )}

        {/* Mutation Errors */}
        {quoteMutation.error && (
          <div className="order-4 rounded-xl border border-chad-red/15 bg-chad-red/8 p-2.5 text-xs text-[#ff5a64]">
            Quote error: {quoteMutation.error.message}
          </div>
        )}
        {orderMutation.error && (
          <div className="order-4 rounded-xl border border-chad-red/15 bg-chad-red/8 p-2.5 text-xs text-[#ff5a64]">
            Order error: {orderMutation.error.message}
          </div>
        )}
        {executeMutation.error && (
          <div className="order-4 rounded-xl border border-chad-red/15 bg-chad-red/8 p-2.5 text-xs text-[#ff5a64]">
            Execution failed: {executeMutation.error.message}
          </div>
        )}

        {/* Actions */}
        <button
          onClick={submitQuote}
          disabled={isBusy || !isAmountValid || !isSlippageValid || hasInsufficientBalance || isActionBlocked}
          className={cn(
            "order-3 inline-flex h-11 w-full items-center justify-center rounded-xl font-bold text-xs transition disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
            side === "buy" 
              ? "bg-chad-green text-[#03120c] hover:brightness-105 shadow-[0_4px_12px_rgba(32,233,130,0.1)]" 
              : "bg-[#ff4b55] text-white hover:brightness-105 shadow-[0_4px_12px_rgba(255,75,85,0.1)]"
          )}
        >
          {quoteMutation.isPending ? "Fetching quote…" : `${side === "buy" ? "Buy" : "Sell"} ${token?.token.symbol ?? "token"}`}
        </button>

        <button
          onClick={submitOrder}
          disabled={isBusy || !isAmountValid || !isSlippageValid || hasInsufficientBalance || isActionBlocked}
          className="order-4 hidden h-10 w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xs font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          {orderMutation.isPending ? "Building order…" : "Build order"}
        </button>

        {/* Warning/Verified status display */}
        {token && (
          isUnverified ? (
            <div className="order-4 rounded-xl border border-[#ff4b55]/20 bg-[#17090c] p-2.5 text-xs">
              <div className="flex gap-2 items-start">
                <input 
                  type="checkbox" 
                  id="scam-warn-check" 
                  checked={isScamAcknowledged}
                  onChange={(e) => setIsScamAcknowledged(e.target.checked)}
                  className="mt-0.5 accent-[#ff4b55] rounded cursor-pointer" 
                />
                <label htmlFor="scam-warn-check" className="cursor-pointer select-none">
                  <span className="font-bold text-[#ff4b55] block">Unverified token — confirm the mint before trading.</span>
                  <span className="text-muted mt-0.5 block leading-normal">I understand the risks of trading this token.</span>
                </label>
              </div>
            </div>
          ) : token.token.verified ? (
            <div className="order-4 rounded-xl border border-chad-green/20 bg-[#091712] p-2.5 text-xs text-chad-green flex items-center gap-2">
              <ShieldCheck className="size-4 shrink-0 text-chad-green" />
              <span>Verified token — authenticity verified by Birdeye.</span>
            </div>
          ) : null
        )}

        <div className="order-5 flex items-center justify-between rounded-xl border border-white/8 px-3 py-1.5 text-xs text-muted bg-[#090914]/40">
          <span>◎ Solana token</span>
          <span>ⓘ</span>
        </div>

        {/* Quote Review */}
        {review ? (
          <div className="rounded-[28px] border border-white/10 bg-[#08101e] p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Quote review</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
                    review.source === "jupiter" ? "bg-chad-green/15 text-chad-green" : "bg-chad-blue/15 text-chad-blue"
                  )}>
                    {review.source === "jupiter" ? "LIVE JUPITER" : "DEMO QUOTE"}
                  </span>
                  <span className="text-[10px] text-muted">
                    {review.order.route.join(" → ")}
                  </span>
                </div>
              </div>
              
              {/* Expiry / Stale Indicators */}
              <span className={cn(
                "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider",
                isExpired ? "bg-chad-red/15 text-chad-red animate-pulse" : "bg-chad-mint/15 text-chad-mint"
              )}>
                {isExpired ? "Expired" : `${secondsLeft}s left`}
              </span>
            </div>

            <div className="space-y-3 text-sm">
              <Row
                label={`Pay ${review.inputSymbol}`}
                value={formatNumber(review.inputUiAmount, false)}
              />
              <Row
                label={`Receive ${review.outputSymbol}`}
                value={formatNumber(review.outputUiAmount, false)}
              />
              <Row
                label="Minimum received"
                value={formatNumber(review.minimumReceivedUi, false)}
              />
              <Row
                label="Price impact"
                value={`${review.order.priceImpactPct.toFixed(2)}%`}
              />
              <Row
                label="Estimated fees"
                value={formatCurrency(review.order.feesUsd)}
              />
            </div>

            <div className="mt-4 rounded-2xl border border-chad-blue/15 bg-chad-blue/8 p-3 text-xs leading-6 text-muted">
              <div className="mb-1 flex items-center gap-2 text-white">
                <ShieldCheck className="size-4 text-chad-mint" />
                Safe execution gating
              </div>
              Order and execute are intentionally separated. Review works for everyone,
              order requires an authenticated wallet address, and execution stays
              off unless the live flag is enabled and the connected wallet signs.
            </div>

            {liveEnabled && review.order.transaction && !isExpired ? (
              <PrivyExecutionButton
                address={address}
                transaction={review.order.transaction}
                pending={executeMutation.isPending}
                onExecute={submitExecution}
              />
            ) : (
              <div className="mt-4">
                <button
                  disabled
                  className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-white/5 border border-white/5 text-sm font-semibold text-muted cursor-not-allowed"
                >
                  {isExpired 
                    ? "Signing disabled (Expired)" 
                    : !review.order.transaction 
                      ? "Signing disabled (No Transaction Payload)" 
                      : review.source === "fallback" 
                        ? "Signing disabled (Demo Quote)" 
                        : "Signing disabled (Live Gating Off)"}
                </button>
              </div>
            )}

            {executeMutation.data ? (
              <a
                href={executeMutation.data.result.explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-chad-green/20 bg-chad-green/10 px-4 py-3 text-sm font-semibold text-chad-green"
              >
                View submitted transaction
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </aside>
  )
}

function PrivyExecutionButton({
  address,
  transaction,
  pending,
  onExecute,
}: {
  address?: string
  transaction: string
  pending: boolean
  onExecute: (signedTransaction: string) => void
}) {
  if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) return null

  return (
    <PrivyExecutionButtonInner
      address={address}
      transaction={transaction}
      pending={pending}
      onExecute={onExecute}
    />
  )
}

function PrivyExecutionButtonInner({
  address,
  transaction,
  pending,
  onExecute,
}: {
  address?: string
  transaction: string
  pending: boolean
  onExecute: (signedTransaction: string) => void
}) {
  const { ready, wallets } = useSolanaWallets()
  const { signTransaction } = useSignTransaction()
  const [signing, setSigning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const wallet = wallets.find((candidate) => candidate.address === address) ?? wallets[0]

  async function signAndExecute() {
    if (!wallet) return

    setSigning(true)
    setError(null)
    try {
      const transactionBytes = base64ToBytes(transaction)
      const result = await signTransaction({
        transaction: transactionBytes,
        wallet,
        chain: "solana:mainnet",
      })
      onExecute(bytesToBase64(result.signedTransaction))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Wallet signature was rejected.")
    } finally {
      setSigning(false)
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <button
        onClick={signAndExecute}
        disabled={!ready || !wallet || signing || pending}
        className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-chad-green text-sm font-semibold text-[#03120c] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {signing ? "Awaiting signature…" : pending ? "Submitting…" : "Sign and execute"}
      </button>
      {!wallet && ready ? (
        <p className="text-xs leading-5 text-chad-red">
          No connected Solana wallet is available. Reconnect through Privy and try again.
        </p>
      ) : null}
      {error ? <p className="text-xs leading-5 text-chad-red">{error}</p> : null}
    </div>
  )
}

function base64ToBytes(value: string) {
  const binary = window.atob(value)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

function bytesToBase64(value: Uint8Array) {
  let binary = ""
  for (const byte of value) binary += String.fromCharCode(byte)
  return window.btoa(binary)
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  )
}
