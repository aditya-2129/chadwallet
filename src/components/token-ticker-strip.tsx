"use client";

import Link from "next/link";
import { useMemo } from "react";
import { TokenAvatar } from "@/components/token-avatar";
import type { TokenSummary } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

type TickerDirection = "left" | "right";

export function TokenTickerStrip({
  direction,
  tokens,
  label,
  compact = false,
  className,
}: {
  direction: TickerDirection;
  tokens: TokenSummary[];
  label: string;
  compact?: boolean;
  className?: string;
}) {
  const trackItems = useMemo(() => [...tokens, ...tokens], [tokens]);

  if (tokens.length === 0) return null;

  return (
    <div
      className={cn(
        "relative overflow-hidden border-y border-white/10 bg-[#07111e]/85",
        className,
      )}
    >
      <div
        className={cn(
          "mx-auto flex items-center gap-4 px-4 sm:px-6 lg:px-8",
          compact ? "max-w-none py-2" : "max-w-7xl py-3",
        )}
      >
        <span
          className={cn(
            "flex shrink-0 items-center gap-2 rounded-full border border-chad-mint/20 bg-chad-mint/10 font-semibold uppercase tracking-[0.28em] text-chad-mint",
            compact ? "px-2.5 py-1 text-[10px]" : "px-3 py-1 text-[11px]",
          )}
        >
          <span className="size-1.5 rounded-full bg-chad-mint" />
          {label}
        </span>
        <div className="group/ticker group-hover-paused relative min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div
            className={cn(
              "ticker-track flex w-max items-center group-hover/ticker:[animation-play-state:paused] focus-within:[animation-play-state:paused]",
              compact ? "gap-2" : "gap-3",
              direction === "left" ? "ticker-track-left" : "ticker-track-right",
            )}
          >
            {trackItems.map((token, index) => {
              const changePositive = token.change24h >= 0;

              return (
                <Link
                  key={`${token.mint}-${index}`}
                  href={`/trade/${token.mint}`}
                  className={cn(
                    "group inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] text-sm text-white transition hover:border-white/20 hover:bg-white/[0.06]",
                    compact ? "min-w-[200px] px-2.5 py-2" : "min-w-[230px] px-3 py-2.5",
                  )}
                  aria-label={`Trade ${token.name} (${token.symbol})`}
                >
                  <TokenAvatar
                    symbol={token.symbol}
                    imageUrl={token.imageUrl}
                    className={compact ? "size-8" : "size-9"}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold">{token.symbol}</span>
                      {token.verified ? (
                        <span className="rounded-full border border-chad-mint/20 bg-chad-mint/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-chad-mint">
                          Verified
                        </span>
                      ) : null}
                    </div>
                    <div className="truncate text-xs text-muted">{token.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatCurrency(token.price)}</div>
                    <div
                      className={cn(
                        "text-xs font-medium",
                        changePositive ? "text-chad-green" : "text-chad-red",
                      )}
                    >
                      {changePositive ? "+" : "-"}
                      {Math.abs(token.change24h).toFixed(2)}%
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
