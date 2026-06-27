"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Star } from "lucide-react"
import { TokenAvatar } from "@/components/token-avatar"
import { cn, formatCurrency } from "@/lib/utils"
import type { MarketPayload } from "@/components/trading/types"

type MarketFilter = "trending" | "gainers" | "largest" | "watchlist"

const marketFilters: Array<{ id: MarketFilter; label: string }> = [
  { id: "trending", label: "Trending" },
  { id: "gainers", label: "Gainers" },
  { id: "largest", label: "Market cap" },
  { id: "watchlist", label: "Watchlist" },
]

function isMarketFilter(value: string | null): value is MarketFilter {
  return marketFilters.some((filter) => filter.id === value)
}

export function MarketSidebar({
  mint,
  market,
  watchlist,
  onToggleWatchlist,
  watchlistPending,
}: {
  mint: string
  market?: MarketPayload
  watchlist: Set<string>
  onToggleWatchlist: (mint: string) => void
  watchlistPending?: string
}) {
  const searchParams = useSearchParams()
  const listParam = searchParams.get("list")
  const filter: MarketFilter = isMarketFilter(listParam) ? listParam : "trending"

  const updateFilter = (nextFilter: MarketFilter) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("list", nextFilter)
    window.history.pushState(null, "", `?${params.toString()}`)
  }

  const tokenHref = (tokenMint: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("list", filter)
    return `/trade/${tokenMint}?${params.toString()}`
  }

  const filteredTokens = (() => {
    const items = [...(market?.items ?? [])]

    if (filter === "watchlist") {
      return items.filter((token) => watchlist.has(token.mint))
    }
    if (filter === "gainers") {
      return items
        .filter((token) => token.change24h > 0)
        .sort((a, b) => b.change24h - a.change24h)
    }
    if (filter === "largest") {
      return items.sort((a, b) => b.marketCap - a.marketCap)
    }

    return items.sort(
      (a, b) =>
        (a.rank ?? Number.MAX_SAFE_INTEGER) -
        (b.rank ?? Number.MAX_SAFE_INTEGER),
    )
  })()

  return (
    <aside className="scrollbar-thin sticky top-[60px] hidden h-[calc(100vh-60px)] self-start overflow-y-auto bg-[#05050d] border-r border-white/10 lg:order-1 lg:block">
      <div className="sticky top-0 z-10 border-b border-white/10 bg-[#05050d]">
        <div className="flex h-10 items-center justify-between px-3">
          <h2 className="text-xs font-semibold text-white">Tokens</h2>
          <span className="text-[10px] uppercase tracking-wider text-muted">
            {market?.source ?? "loading"}
          </span>
        </div>
        <div className="flex gap-1.5 overflow-hidden px-3 pb-2 pt-1 border-t border-white/5">
          {marketFilters.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => updateFilter(item.id)}
              aria-pressed={filter === item.id}
              className={cn(
                "shrink-0 rounded-md border border-white/5 px-2 py-1 text-[10px] transition",
                filter === item.id
                  ? "bg-white/10 font-semibold text-white"
                  : "text-muted hover:bg-white/5 hover:text-white",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-2 py-1">
        {!market
          ? Array.from({ length: 10 }, (_, index) => (
              <div key={index} className="mb-1 h-[50px] animate-pulse rounded-lg bg-white/[0.02]" />
            ))
          : filteredTokens.length === 0
            ? (
                <div className="px-3 py-8 text-center">
                  <p className="text-xs font-semibold text-white">
                    {filter === "watchlist" ? "Your watchlist is empty" : "No tokens found"}
                  </p>
                  <p className="mt-1 text-[10px] leading-4 text-muted">
                    {filter === "watchlist"
                      ? "Use the star beside a token to add it here."
                      : "Try another market filter or search."}
                  </p>
                </div>
              )
            : filteredTokens.map((token) => {
              const active = token.mint === mint
              const watched = watchlist.has(token.mint)
              return (
                <div
                  key={token.mint}
                  className={cn(
                    "group mb-0.5 flex items-center rounded-lg px-2 py-1 transition border",
                    active 
                      ? "bg-[#10101e] border-chad-blue/30 shadow-[0_0_8px_rgba(38,151,243,0.1)]" 
                      : "border-transparent hover:bg-white/[0.03]",
                  )}
                >
                  <Link href={tokenHref(token.mint)} className="flex min-w-0 flex-1 items-center gap-2">
                    <TokenAvatar symbol={token.symbol} imageUrl={token.imageUrl} className="size-8 text-[10px]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-white leading-tight">{token.symbol}</p>
                      <p className="truncate text-[10px] text-muted leading-tight mt-0.5">{formatCurrency(token.price)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-white leading-tight">
                        {formatCurrency(token.marketCap, true)} MC
                      </p>
                      <p className={cn("text-[10px] font-semibold leading-tight mt-0.5", token.change24h >= 0 ? "text-chad-green" : "text-[#ff4b55]")}>
                        {token.change24h >= 0 ? "▲" : "▼"} {Math.abs(token.change24h).toFixed(2)}%
                      </p>
                    </div>
                  </Link>
                  <button
                    type="button"
                    aria-label={`${watched ? "Remove" : "Add"} ${token.symbol} ${watched ? "from" : "to"} watchlist`}
                    onClick={() => onToggleWatchlist(token.mint)}
                    disabled={watchlistPending === token.mint}
                    className="ml-1 hidden size-6 items-center justify-center text-muted group-hover:flex hover:text-white"
                  >
                    <Star className={cn("size-3", watched && "fill-chad-mint text-chad-mint")} />
                  </button>
                </div>
              )
            })}
      </div>
    </aside>
  )
}
