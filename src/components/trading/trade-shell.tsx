/* eslint-disable react-hooks/set-state-in-effect */
"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  AlertTriangle,
  Check,
  Copy,
  Search,
  Star,
} from "lucide-react"
import { MarketSidebar } from "@/components/trading/market-sidebar"
import { TradingViewAdvancedChart } from "@/components/trading/tradingview-advanced-chart"
import { TokenTabs } from "@/components/trading/token-tabs"
import { TradePanel } from "@/components/trading/trade-panel"
import { TokenAvatar } from "@/components/token-avatar"
import { AuthButton } from "@/components/auth-button"
import { useAuth } from "@/components/auth-context"
import { cn, formatCurrency, shortenAddress } from "@/lib/utils"
import { SOL_MINT, USDC_MINT } from "@/lib/mock-data"
import type {
  HoldersPayload,
  MarketPayload,
  PositionPayload,
  TokenPayload,
  TradesPayload,
} from "@/components/trading/types"

async function readApi<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  const payload = (await response.json()) as {
    data: T | null
    error: { message: string } | null
  }

  if (!response.ok || payload.error || !payload.data) {
    throw new Error(payload.error?.message || "Request failed")
  }

  return payload.data
}

export function TradeShell({ mint }: { mint: string }) {
  const { authenticated, address, getAccessToken, login } = useAuth()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [isPageVisible, setIsPageVisible] = useState(true)
  const [mintCopied, setMintCopied] = useState(false)
  const [pendingWatchlist, setPendingWatchlist] = useState<{ mint: string; watched: boolean } | null>(null)
  const [isMobileTradeOpen, setIsMobileTradeOpen] = useState(false)

  // Track page visibility to suspend/resume polling
  useEffect(() => {
    function handleVisibilityChange() {
      setIsPageVisible(document.visibilityState === "visible")
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 200)
    return () => window.clearTimeout(timer)
  }, [search])

  const marketQuery = useQuery({
    queryKey: ["market", debouncedSearch],
    queryFn: () =>
      readApi<MarketPayload>(
        `/api/market?${new URLSearchParams({
          q: debouncedSearch,
          limit: "12",
        }).toString()}`,
      ),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  const tokenQuery = useQuery({
    queryKey: ["token", mint],
    queryFn: () => readApi<TokenPayload>(`/api/token/${mint}`),
    staleTime: 30 * 1000,
    refetchInterval: isPageVisible ? 30 * 1000 : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  const tradesQuery = useQuery({
    queryKey: ["trades", mint],
    queryFn: () => readApi<TradesPayload>(`/api/token/${mint}/trades?limit=18`),
    staleTime: 30 * 1000,
    refetchInterval: isPageVisible ? 30 * 1000 : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  const holdersQuery = useQuery({
    queryKey: ["holders", mint],
    queryFn: () => readApi<HoldersPayload>(`/api/token/${mint}/holders?limit=12`),
    staleTime: 5 * 60 * 1000,
    refetchInterval: isPageVisible ? 5 * 60 * 1000 : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  const positionQuery = useQuery({
    queryKey: ["position", address, mint],
    enabled: authenticated && Boolean(address),
    queryFn: () =>
      readApi<PositionPayload>(
        `/api/token/${mint}/position?${new URLSearchParams({
          address: address ?? "",
        }).toString()}`,
      ),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  const solPositionQuery = useQuery({
    queryKey: ["position", address, SOL_MINT],
    enabled: authenticated && Boolean(address),
    queryFn: () =>
      readApi<PositionPayload>(
        `/api/token/${SOL_MINT}/position?${new URLSearchParams({
          address: address ?? "",
        }).toString()}`,
      ),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  const usdcPositionQuery = useQuery({
    queryKey: ["position", address, USDC_MINT],
    enabled: authenticated && Boolean(address),
    queryFn: () =>
      readApi<PositionPayload>(
        `/api/token/${USDC_MINT}/position?${new URLSearchParams({
          address: address ?? "",
        }).toString()}`,
      ),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  const watchlistQuery = useQuery({
    queryKey: ["watchlist", address],
    enabled: authenticated && Boolean(address),
    queryFn: async () => {
      const token = await getAccessToken()
      return readApi<{ items: string[]; configured: boolean }>("/api/watchlist", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  const watchlistMutation = useMutation({
    mutationFn: async ({ tokenMint, watched }: { tokenMint: string; watched: boolean }) => {
      const token = await getAccessToken()
      const url = watched
        ? `/api/watchlist?${new URLSearchParams({ mint: tokenMint }).toString()}`
        : "/api/watchlist"
      return readApi<{ mint: string; watched: boolean; configured: boolean }>(url, {
        method: watched ? "DELETE" : "POST",
        headers: {
          ...(watched ? {} : { "Content-Type": "application/json" }),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: watched
          ? undefined
          : JSON.stringify({ mint: tokenMint, walletAddress: address }),
      })
    },
    onMutate: ({ tokenMint, watched }) => {
      queryClient.setQueryData<{ items: string[]; configured: boolean }>(
        ["watchlist", address],
        (current) => ({
          configured: current?.configured ?? false,
          items: watched
            ? (current?.items ?? []).filter((item) => item !== tokenMint)
            : [...new Set([...(current?.items ?? []), tokenMint])],
        }),
      )
    },
    onSettled: (result, error) => {
      if (error || result?.configured) {
        void queryClient.invalidateQueries({ queryKey: ["watchlist", address] })
      }
    },
  })

  // Restore watchlist click after successful Privy login
  useEffect(() => {
    if (authenticated && address && pendingWatchlist) {
      watchlistMutation.mutate({
        tokenMint: pendingWatchlist.mint,
        watched: pendingWatchlist.watched,
      })
      setPendingWatchlist(null)
    }
  }, [authenticated, address, pendingWatchlist, watchlistMutation])

  useEffect(() => {
    if (!authenticated || !address) return

    void (async () => {
      const token = await getAccessToken()
      await fetch("/api/recent-tokens", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ mint, walletAddress: address }),
      })
    })()
  }, [address, authenticated, getAccessToken, mint])

  const token = tokenQuery.data?.token
  const watchlist = useMemo(
    () => new Set(watchlistQuery.data?.items ?? []),
    [watchlistQuery.data?.items],
  )
  const priceDeltaClass = token && token.change24h >= 0 ? "text-chad-green" : "text-chad-red"

  const handleCopyMint = () => {
    navigator.clipboard.writeText(mint)
    setMintCopied(true)
    setTimeout(() => setMintCopied(false), 2000)
  }

  const handleToggleWatchlist = (tokenMint: string) => {
    const watched = watchlist.has(tokenMint)
    if (!authenticated || !address) {
      setPendingWatchlist({ mint: tokenMint, watched })
      login()
      return
    }

    watchlistMutation.mutate({ tokenMint, watched })
  }

  return (
    <div className="min-h-screen bg-[#05050d] pb-24 lg:pb-0">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#05050d]/92 backdrop-blur-xl">
        {/* Mobile Header: visible below lg */}
        <div className="flex lg:hidden h-14 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/brand/logo-light.png"
              alt="ChadWallet"
              width={28}
              height={28}
              className="size-7 rounded-full bg-white p-1"
              priority
            />
            <span className="text-base font-black tracking-[-0.05em] text-white">
              chadwallet
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <AuthButton />
          </div>
        </div>

        {/* Desktop Header: visible lg and up */}
        <div className="hidden lg:grid h-[60px] lg:grid-cols-[240px_minmax(0,1fr)_320px] xl:grid-cols-[260px_minmax(0,1fr)_340px] 2xl:grid-cols-[280px_minmax(0,1fr)_360px] items-center">
          <Link href="/" className="flex shrink-0 items-center gap-2 px-4">
            <Image
              src="/brand/logo-light.png"
              alt="ChadWallet"
              width={32}
              height={32}
              className="size-8 rounded-full bg-white p-1"
              priority
            />
            <span className="text-lg font-black tracking-[-0.05em] text-white">
              chadwallet
            </span>
          </Link>

          <div className="flex justify-center w-full px-2">
            <label className="flex-1 max-w-[420px] h-8 flex items-center gap-2 rounded-lg border border-white/8 bg-[#090914] px-3">
              <Search className="size-3.5 text-muted" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search for tokens or traders..."
                className="w-full bg-transparent text-xs text-white outline-none placeholder:text-muted"
              />
              <span className="rounded bg-white/5 px-2 py-0.5 text-[9px] font-medium text-muted whitespace-nowrap">
                Paste /
              </span>
            </label>
          </div>

          <div className="flex shrink-0 items-center justify-end gap-3 px-4">
            <div className="hidden h-9 flex-col items-end justify-center rounded-lg border border-white/8 bg-[#090914] px-3.5 text-right lg:flex leading-tight shrink-0 select-none">
              <p className="text-xs font-semibold text-white">
                $0.00 <span className="text-[10px] text-muted font-normal ml-0.5">cash</span>
              </p>
              <p className="text-[10px] text-chad-blue hover:underline cursor-pointer">
                Deposit more
              </p>
            </div>
            <AuthButton />
          </div>
        </div>
      </header>

      <div className="relative mx-auto">
        <div className="grid lg:grid-cols-[240px_minmax(0,1fr)_320px] xl:grid-cols-[260px_minmax(0,1fr)_340px] 2xl:grid-cols-[280px_minmax(0,1fr)_360px]">
          <MarketSidebar
            mint={mint}
            market={marketQuery.data}
            watchlist={watchlist}
            onToggleWatchlist={handleToggleWatchlist}
            watchlistPending={
              watchlistMutation.isPending
                ? watchlistMutation.variables?.tokenMint
                : undefined
            }
          />

          <main className="order-1 min-w-0 border-x border-white/10 lg:order-2">
            <section className="border-b border-white/10 px-4 py-2 bg-[#05050d]">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <TokenAvatar
                    symbol={token?.symbol ?? "??"}
                    imageUrl={token?.imageUrl}
                    className="size-10 text-xs"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-base font-bold text-white leading-none">
                        {token?.symbol ?? "Loading"}
                      </h2>
                      <button
                        type="button"
                        onClick={() => handleToggleWatchlist(mint)}
                        disabled={
                          watchlistMutation.isPending &&
                          watchlistMutation.variables?.tokenMint === mint
                        }
                        title={watchlist.has(mint) ? "Remove from watchlist" : "Add to watchlist"}
                        aria-label={watchlist.has(mint) ? "Remove from watchlist" : "Add to watchlist"}
                        className="inline-flex items-center justify-center rounded-full text-muted transition hover:text-white disabled:cursor-wait disabled:opacity-50"
                      >
                        <Star
                          className={cn(
                            "size-3.5",
                            watchlist.has(mint) && "fill-chad-mint text-chad-mint",
                          )}
                        />
                      </button>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted">
                      <span className="font-mono">
                        {shortenAddress(mint, 4)}
                      </span>
                      <button
                        onClick={handleCopyMint}
                        className="inline-flex items-center gap-1 rounded bg-white/5 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-chad-mint transition hover:bg-white/10"
                        title="Copy mint address"
                      >
                        {mintCopied ? <Check className="size-2" /> : <Copy className="size-2" />}
                        {mintCopied ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 lg:gap-2 overflow-x-auto scrollbar-none py-1 max-w-full -mx-4 px-4 lg:overflow-x-visible lg:flex-wrap lg:mx-0 lg:px-0 flex-nowrap lg:flex-wrap">
                  <MetricCard
                    label="Market cap"
                    value={token ? formatCurrency(token.marketCap, true) : "—"}
                  />
                  <MetricCard
                    label="Price"
                    value={token ? formatCurrency(token.price) : "—"}
                  />
                  <MetricCard
                    label="24H change"
                    value={`${token && token.change24h >= 0 ? "▲ " : "▼ "}${Math.abs(token?.change24h ?? 0).toFixed(2)}%`}
                    tone={token && token.change24h >= 0 ? "positive" : "negative"}
                  />
                  <MetricCard
                    label="24H Vol."
                    value={token ? formatCurrency(token.volume24h, true) : "—"}
                  />
                  <MetricCard
                    label="Liquidity"
                    value={token ? formatCurrency(token.liquidity, true) : "—"}
                  />
                </div>
              </div>
            </section>

            <div className="hidden">
            {/* Token Detail Loading/Error Boundary */}
            {tokenQuery.isPending ? (
              <section className="glass rounded-[28px] p-5 animate-pulse">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="size-14 rounded-full bg-white/5" />
                    <div className="space-y-2">
                      <div className="h-6 bg-white/5 rounded w-24" />
                      <div className="h-4 bg-white/5 rounded w-44" />
                    </div>
                  </div>
                  <div className="h-10 bg-white/5 rounded w-28" />
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-20 bg-white/5 rounded-[24px]" />
                  ))}
                </div>
              </section>
            ) : tokenQuery.isError ? (
              <section className="rounded-[28px] border border-chad-red/20 bg-[#17090c] p-6 text-center shadow-xl">
                <AlertTriangle className="size-8 text-chad-red mx-auto mb-3" />
                <h3 className="text-base font-bold text-white">Failed to load token details</h3>
                <p className="text-xs text-muted mt-1 max-w-md mx-auto">
                  {tokenQuery.error?.message || "Birdeye server error or invalid token address."}
                </p>
                <button
                  onClick={() => tokenQuery.refetch()}
                  className="mt-4 rounded-xl bg-chad-red/15 hover:bg-chad-red/25 px-4 py-2 text-xs font-semibold text-white transition"
                >
                  Retry loading details
                </button>
              </section>
            ) : (
              <section className="glass rounded-[20px] p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-4">
                    <TokenAvatar
                      symbol={token?.symbol ?? "??"}
                      imageUrl={token?.imageUrl}
                      className="size-14 text-base"
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-2xl font-black text-white">
                          {token?.symbol ?? "Loading"}
                        </h2>
                        {token?.verified && (
                          <span className="rounded-full bg-chad-green/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-chad-green">
                            Verified
                          </span>
                        )}
                        <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-muted">
                          {tokenQuery.data?.source ?? "…"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted">
                        {token?.name ?? "Pulling token profile…"}
                      </p>
                      
                      {/* Copyable Mint Address Button */}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[11px] font-mono text-muted">
                          Mint: {shortenAddress(mint, 6)}
                        </span>
                        <button
                          onClick={handleCopyMint}
                          className="inline-flex items-center gap-1 rounded bg-white/5 hover:bg-white/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-chad-mint transition"
                          title="Copy mint address"
                        >
                          {mintCopied ? <Check className="size-2.5" /> : <Copy className="size-2.5" />}
                          {mintCopied ? "Copied" : "Copy"}
                        </button>
                      </div>
                      
                      <p className="mt-2 max-w-2xl text-xs leading-5 text-muted">
                        {token?.description ||
                          "Streaming token overview, market velocity, and wallet-aware order review in one focused trade view."}
                      </p>
                    </div>
                  </div>

                  <div className="text-left lg:text-right">
                    <p className="text-3xl font-black text-white">
                      {token ? formatCurrency(token.price) : "—"}
                    </p>
                    <p className={cn("mt-2 text-sm font-semibold", priceDeltaClass)}>
                      {token && token.change24h >= 0 ? "+" : ""}
                      {token?.change24h.toFixed(2) ?? "0.00"}% · 24h
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  <MetricCard
                    label="Liquidity"
                    value={token ? formatCurrency(token.liquidity, true) : "—"}
                  />
                  <MetricCard
                    label="Market cap"
                    value={token ? formatCurrency(token.marketCap, true) : "—"}
                  />
                  <MetricCard
                    label="Volume 24h"
                    value={token ? formatCurrency(token.volume24h, true) : "—"}
                  />
                  <MetricCard
                    label="Price momentum"
                    value={
                      token
                        ? `${token.priceChanges.h1 >= 0 ? "+" : ""}${token.priceChanges.h1.toFixed(2)}% / 1h`
                        : "—"
                    }
                  />
                </div>
              </section>
            )}
            </div>

            <section>
              <TradingViewAdvancedChart
                mint={mint}
                symbol={token?.symbol ?? "TOKEN"}
              />
            </section>
            <TokenTabs
              token={tokenQuery.data}
              trades={tradesQuery.data}
              holders={holdersQuery.data}
              tradesLoading={tradesQuery.isPending}
              tradesError={tradesQuery.isError}
              tradesRefetch={() => tradesQuery.refetch()}
              holdersLoading={holdersQuery.isPending}
              holdersError={holdersQuery.isError}
              holdersRefetch={() => holdersQuery.refetch()}
            />
          </main>

          <div className="order-3 min-w-0 hidden lg:block">
            <TradePanel
              mint={mint}
              token={tokenQuery.data}
              position={positionQuery.data}
              solPosition={solPositionQuery.data}
              usdcPosition={usdcPositionQuery.data}
            />
            <TokenInsightPanel
              token={tokenQuery.data}
              trades={tradesQuery.data}
            />
          </div>
        </div>
      </div>
      <button
        onClick={() => setIsMobileTradeOpen(true)}
        className="fixed inset-x-4 bottom-4 z-40 flex h-14 items-center justify-center rounded-2xl bg-chad-green font-semibold text-[#03120c] shadow-[0_12px_40px_rgba(32,233,130,.28)] lg:hidden cursor-pointer"
      >
        Buy or sell {token?.symbol ?? "token"}
      </button>

      {isMobileTradeOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm lg:hidden">
          <div className="absolute inset-0 -z-10" onClick={() => setIsMobileTradeOpen(false)} />
          <div className="relative max-h-[90vh] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-[#05050d] p-4 shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/20" onClick={() => setIsMobileTradeOpen(false)} />
            <button 
              onClick={() => setIsMobileTradeOpen(false)} 
              className="absolute right-4 top-4 text-muted hover:text-white text-lg p-2 cursor-pointer"
              title="Close panel"
            >
              ✕
            </button>
            <div className="mt-2">
              <TradePanel
                mint={mint}
                token={tokenQuery.data}
                position={positionQuery.data}
                solPosition={solPositionQuery.data}
                usdcPosition={usdcPositionQuery.data}
                onSuccess={() => setIsMobileTradeOpen(false)}
              />
              <TokenInsightPanel
                token={tokenQuery.data}
                trades={tradesQuery.data}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MetricCard({
  label,
  value,
  tone,
  className,
}: {
  label: string
  value: string
  tone?: "positive" | "negative"
  className?: string
}) {
  return (
    <div className={cn("rounded-lg border border-white/5 bg-[#0a0a14] px-2.5 py-1 min-w-[70px] xl:min-w-[85px] text-center shrink-0", className)}>
      <p className="text-[10px] text-muted font-medium uppercase tracking-wider">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-xs font-semibold text-white",
          tone === "positive" && "text-chad-green",
          tone === "negative" && "text-[#ff4b55]",
        )}
      >
        {value}
      </p>
    </div>
  )
}

function TokenInsightPanel({
  token,
  trades,
}: {
  token?: TokenPayload
  trades?: TradesPayload
}) {
  const buys = trades?.items.filter((trade) => trade.side === "buy") ?? []
  const sells = trades?.items.filter((trade) => trade.side === "sell") ?? []
  const buyVolume = buys.reduce((sum, trade) => sum + trade.valueUsd, 0)
  const sellVolume = sells.reduce((sum, trade) => sum + trade.valueUsd, 0)
  const totalCount = Math.max(buys.length + sells.length, 1)
  const totalVolume = Math.max(buyVolume + sellVolume, 1)

  const distinctBuyers = new Set(buys.map(t => t.wallet)).size
  const distinctSellers = new Set(sells.map(t => t.wallet)).size
  const totalUsers = Math.max(distinctBuyers + distinctSellers, 1)

  return (
    <section className="m-3 rounded-2xl border border-white/10 bg-[#05050d] p-3">
      <h3 className="text-sm font-semibold text-white">
        About {token?.token.symbol ?? "token"}
      </h3>
      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">
        {token?.token.description || "No description supplied by the project creators yet."}
      </p>

      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {[
          ["5M", token?.token.priceChanges.m5],
          ["1H", token?.token.priceChanges.h1],
          ["4H", token?.token.priceChanges.h6],
          ["1D", token?.token.priceChanges.h24],
        ].map(([label, change]) => {
          const value = Number(change ?? 0)
          return (
            <div key={String(label)} className="rounded-lg border border-white/5 bg-[#090914] p-1.5 text-center">
              <p className="text-[10px] text-muted font-medium uppercase tracking-wider">{label}</p>
              <p className={cn("mt-0.5 text-xs font-semibold", value >= 0 ? "text-chad-green" : "text-[#ff4b55]")}>
                {value >= 0 ? "▲" : "▼"} {Math.abs(value).toFixed(2)}%
              </p>
            </div>
          )
        })}
      </div>

      <FlowRow
        left={`${buys.length} buys`}
        right={`${sells.length} sells`}
        leftPercent={(buys.length / totalCount) * 100}
        leftColor="bg-chad-green"
        rightColor="bg-[#ff4b55]"
      />
      <FlowRow
        left={`${formatCurrency(buyVolume, true)} vol.`}
        right={`${formatCurrency(sellVolume, true)} vol.`}
        leftPercent={(buyVolume / totalVolume) * 100}
        leftColor="bg-[#ff6534]"
        rightColor="bg-[#ff4b55]"
      />
      <FlowRow
        left={`${distinctBuyers} buyers`}
        right={`${distinctSellers} sellers`}
        leftPercent={(distinctBuyers / totalUsers) * 100}
        leftColor="bg-chad-green"
        rightColor="bg-[#ff4b55]"
      />

      <div className="mt-4 flex justify-center">
        <button
          type="button"
          disabled
          title="View more coming soon"
          aria-label="View more coming soon"
          className="rounded-full bg-white/5 px-4 py-1 text-xs font-semibold text-white/70 opacity-60 cursor-not-allowed"
        >
          View more
        </button>
      </div>
    </section>
  )
}

function FlowRow({
  left,
  right,
  leftPercent,
  leftColor = "bg-chad-green",
  rightColor = "bg-[#ff4b55]",
}: {
  left: string
  right: string
  leftPercent: number
  leftColor?: string
  rightColor?: string
}) {
  return (
    <div className="mt-3.5">
      <div className="mb-1 flex justify-between text-xs font-semibold text-white">
        <span>{left}</span><span>{right}</span>
      </div>
      <div className="flex h-1.5 gap-1 overflow-hidden rounded-full bg-white/5">
        <span className={cn("rounded-full", leftColor)} style={{ width: `${leftPercent}%` }} />
        <span className={cn("flex-1 rounded-full", rightColor)} />
      </div>
    </div>
  )
}
