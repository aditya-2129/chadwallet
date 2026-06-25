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
}: {
  direction: TickerDirection;
  tokens: TokenSummary[];
  label: string;
}) {
  const trackItems = useMemo(() => [...tokens, ...tokens], [tokens]);

  return (
    <div className="relative overflow-hidden border-y border-white/10 bg-[#07111e]/85">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <span className="flex shrink-0 items-center gap-2 rounded-full border border-chad-mint/20 bg-chad-mint/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-chad-mint">
          <span className="size-1.5 rounded-full bg-chad-mint" />
          {label}
        </span>
        <div className="group/ticker group-hover-paused relative min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div
            className={cn(
              "ticker-track flex w-max items-center gap-3 group-hover/ticker:[animation-play-state:paused] focus-within:[animation-play-state:paused]",
              direction === "left" ? "ticker-track-left" : "ticker-track-right",
            )}
          >
            {trackItems.map((token, index) => {
              const changePositive = token.change24h >= 0;

              return (
                <Link
                  key={`${token.mint}-${index}`}
                  href={`/trade/${token.mint}`}
                  className="group inline-flex min-w-[230px] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white transition hover:border-white/20 hover:bg-white/[0.06]"
                  aria-label={`Trade ${token.name} (${token.symbol})`}
                >
                  <TokenAvatar
                    symbol={token.symbol}
                    imageUrl={token.imageUrl}
                    className="size-9"
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
