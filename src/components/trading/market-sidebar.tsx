"use client"

import Link from "next/link"
import { Bell, ChevronLeft, Star } from "lucide-react"
import { TokenAvatar } from "@/components/token-avatar"
import { cn, formatCurrency } from "@/lib/utils"
import type { MarketPayload } from "@/components/trading/types"

export function MarketSidebar({
  mint,
  market,
  watchlist,
  onToggleWatchlist,
  watchlistPending,
}: {
  mint: string
  market?: MarketPayload
  search: string
  onSearchChange: (value: string) => void
  watchlist: Set<string>
  onToggleWatchlist: (mint: string) => void
  watchlistPending?: string
}) {
  return (
    <aside className="scrollbar-thin hidden lg:block lg:order-1 h-[calc(100vh-100px)] overflow-y-auto bg-[#05050d] border-r border-white/10">
      <div className="sticky top-0 z-10 border-b border-white/10 bg-[#05050d]">
        <div className="flex h-10 items-center gap-1 px-3 text-xs">
          <span className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-muted hover:text-white cursor-pointer">
            <Bell className="size-3" /> Alerts
          </span>
          <span className="rounded-lg bg-white/[0.06] px-2.5 py-1.5 font-semibold text-white">Tokens</span>
          <span className="rounded-lg px-2 py-1.5 text-muted hover:text-white cursor-pointer">Leaderboard</span>
          <span className="rounded-lg px-2 py-1.5 text-muted hover:text-white cursor-pointer">Feed</span>
          <ChevronLeft className="ml-auto size-4 text-muted hover:text-white cursor-pointer" />
        </div>
        <div className="flex gap-1.5 overflow-hidden px-3 pb-2 pt-1 border-t border-white/5">
          {["Watchlist", "Crypto", "Trending", "Most held", "Graduated"].map((item) => (
            <span
              key={item}
              className={cn(
                "shrink-0 rounded-md border border-white/5 px-2 py-1 text-[10px] cursor-pointer transition",
                item === "Trending"
                  ? "bg-white/10 font-semibold text-white"
                  : "text-muted hover:text-white hover:bg-white/5",
              )}
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="px-2 py-1">
        {!market
          ? Array.from({ length: 10 }, (_, index) => (
              <div key={index} className="mb-1 h-[50px] animate-pulse rounded-lg bg-white/[0.02]" />
            ))
          : market.items.map((token) => {
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
                  <Link href={`/trade/${token.mint}`} className="flex min-w-0 flex-1 items-center gap-2">
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

      <div className="sticky bottom-0 mx-2 mb-2 flex h-9 items-center border border-white/8 bg-[#090914] rounded-lg text-[11px] text-muted overflow-hidden">
        <button className="flex-1 flex items-center justify-center gap-1.5 h-full hover:bg-white/5 transition border-r border-white/8">
          <span>▤</span> Split bottom
        </button>
        <button className="flex-1 flex items-center justify-center gap-1.5 h-full hover:bg-white/5 transition">
          <span>◫</span> Split right
        </button>
      </div>
    </aside>
  )
}
