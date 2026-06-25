import { useMemo, useState } from "react"
import { ExternalLink } from "lucide-react"
import { shortenAddress, formatCurrency, formatNumber, formatRelativeTime } from "@/lib/utils"
import { cn } from "@/lib/utils"
import type { HoldersPayload, TokenPayload, TradesPayload } from "@/components/trading/types"

const tabs = ["holders", "trades", "info"] as const
type TabId = (typeof tabs)[number]



export function TokenTabs({
  token,
  trades,
  holders,
  tradesLoading,
  tradesError,
  tradesRefetch,
  holdersLoading,
  holdersError,
  holdersRefetch,
}: {
  token?: TokenPayload
  trades?: TradesPayload
  holders?: HoldersPayload
  tradesLoading?: boolean
  tradesError?: boolean
  tradesRefetch?: () => void
  holdersLoading?: boolean
  holdersError?: boolean
  holdersRefetch?: () => void
}) {
  const [tab, setTab] = useState<TabId>("holders")

  const items = useMemo(() => {
    if (!token) return []

    return [
      token.token.website
        ? { label: "Website", href: token.token.website }
        : null,
      token.token.twitter
        ? { label: "Twitter", href: token.token.twitter }
        : null,
    ].filter(Boolean) as Array<{ label: string; href: string }>
  }, [token])

  return (
    <section className="border-b border-white/10 bg-[#05050d]">
      <div className="flex h-10 items-center gap-6 border-b border-white/10 px-4">
        {tabs.map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={
              tab === item
                ? "h-full border-b-2 border-white px-1 text-xs font-semibold capitalize text-white"
                : "h-full px-1 text-xs capitalize text-muted transition hover:text-white"
            }
          >
            {item === "trades" ? "Swaps" : item === "info" ? "Thesis" : "Holders"}
          </button>
        ))}
      </div>

      <div className="p-3">
      {tab === "trades" ? (
        tradesLoading ? (
          <div className="space-y-2 animate-pulse py-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-white/5" />
            ))}
          </div>
        ) : tradesError ? (
          <div className="rounded-xl border border-chad-red/10 bg-[#120a0c] p-5 text-center">
            <p className="text-xs text-chad-red font-semibold">Failed to load trades</p>
            <button
              onClick={tradesRefetch}
              className="mt-2.5 rounded-lg bg-chad-red/15 hover:bg-chad-red/20 px-3 py-1 text-xs text-white transition"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="scrollbar-thin max-h-[480px] overflow-y-auto pr-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/5 text-muted text-[10px] uppercase font-semibold">
                  <th className="pb-1.5">Trader</th>
                  <th className="pb-1.5">Side</th>
                  <th className="pb-1.5 text-right">Size</th>
                  <th className="pb-1.5 text-right">Price</th>
                  <th className="pb-1.5 text-right">Time</th>
                </tr>
              </thead>
              <tbody>
                {trades?.items.map((trade) => {
                  const isBuy = trade.side === "buy"
                  return (
                    <tr key={trade.signature} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="py-2 pr-2">
                        <div className="flex items-center gap-2">
                          <div className="size-6 rounded-full bg-white/10 flex items-center justify-center font-bold text-[9px] text-muted">
                            Tx
                          </div>
                          <div>
                            <p className="font-semibold text-white leading-none">{shortenAddress(trade.wallet, 6)}</p>
                            <a 
                              href={`https://solscan.io/tx/${trade.signature}`} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-[10px] text-chad-blue hover:underline leading-none mt-1 block"
                            >
                              View Tx
                            </a>
                          </div>
                        </div>
                      </td>
                      <td className="py-2">
                        <span className={cn(
                          "rounded px-1.5 py-0.5 text-[9px] font-bold",
                          isBuy ? "bg-chad-green/10 text-chad-green" : "bg-chad-red/10 text-[#ff4b55]"
                        )}>
                          {trade.side.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2 text-right font-medium">
                        <p className="text-white leading-none">{formatCurrency(trade.valueUsd)}</p>
                        <p className="text-[10px] text-muted leading-none mt-1">{formatNumber(trade.tokenAmount)} tokens</p>
                      </td>
                      <td className="py-2 text-right font-mono text-white/90">
                        {formatCurrency(trade.price)}
                      </td>
                      <td className="py-2 text-right text-muted font-mono">
                        {formatRelativeTime(trade.timestamp)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      ) : null}

      {tab === "holders" ? (
        holdersLoading ? (
          <div className="space-y-2 animate-pulse py-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-white/5" />
            ))}
          </div>
        ) : holdersError ? (
          <div className="rounded-xl border border-chad-red/10 bg-[#120a0c] p-5 text-center">
            <p className="text-xs text-chad-red font-semibold">Failed to load holders</p>
            <button
              onClick={holdersRefetch}
              className="mt-2.5 rounded-lg bg-chad-red/15 hover:bg-chad-red/20 px-3 py-1 text-xs text-white transition"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="scrollbar-thin max-h-[480px] overflow-y-auto pr-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/5 text-muted text-[10px] uppercase font-semibold">
                  <th className="pb-1.5">Holder</th>
                  <th className="pb-1.5 text-right">Position</th>
                  <th className="pb-1.5 text-right">Supply %</th>
                </tr>
              </thead>
              <tbody>
                {holders?.items.map((holder) => {
                  const valueUsd = holder.balance * (token?.token.price ?? 0)

                  return (
                    <tr key={`${holder.rank}-${holder.address}`} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="py-2 pr-2">
                        <div className="flex items-center gap-2">
                          <div className="size-6 rounded-full bg-white/10 flex items-center justify-center font-bold text-[9px] text-muted">
                            #{holder.rank}
                          </div>
                          <div>
                            <p className="font-semibold text-white leading-none">{shortenAddress(holder.address, 6)}</p>
                            <a 
                              href={`https://solscan.io/account/${holder.address}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-chad-blue hover:underline leading-none mt-1 block"
                            >
                              View Account
                            </a>
                          </div>
                        </div>
                      </td>
                      <td className="py-2 text-right font-medium">
                        <p className="text-white leading-none">{formatCurrency(valueUsd)}</p>
                        <p className="text-[10px] text-muted leading-none mt-1">{formatNumber(holder.balance)} tokens</p>
                      </td>
                      <td className="py-2 text-right font-semibold text-white">
                        {holder.percentage.toFixed(2)}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      ) : null}

      {tab === "info" && token ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-white/8 bg-white/[0.015] p-3">
            <p className="mb-1 text-xs font-semibold text-white">About</p>
            <p className="text-xs leading-5 text-muted">
              {token.token.description || "No project description supplied by the market feed yet."}
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-white/8 bg-white/[0.015] p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted">
                Supply
              </p>
              <p className="mt-1 text-sm font-semibold text-white">
                {token.token.supply ? formatNumber(token.token.supply) : "—"}
              </p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.015] p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted">
                Data source
              </p>
              <p className="mt-1 text-sm font-semibold text-white">
                {token.source}
              </p>
            </div>
          </div>

          {items.length ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {items.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white transition hover:border-white/20 hover:bg-white/10"
                >
                  {item.label}
                  <ExternalLink className="size-3 text-muted" />
                </a>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      </div>
    </section>
  )
}
