"use client";

import { useState, useEffect } from "react";
import { LogOut, Copy, Check, AlertTriangle } from "lucide-react";
import { useAuth } from "@/components/auth-context";
import { cn, shortenAddress } from "@/lib/utils";

export function AuthButton({ className }: { className?: string }) {
  const { ready, authenticated, login, logout, address, solBalance, authError, setAuthError, demoMode } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isTimeout, setIsTimeout] = useState(false);

  useEffect(() => {
    if (ready) return;
    const timer = setTimeout(() => {
      setIsTimeout(true);
    }, 6000);
    return () => clearTimeout(timer);
  }, [ready]);

  const handleCopy = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!ready) {
    if (isTimeout) {
      return (
        <button
          onClick={() => window.location.reload()}
          className={cn(
            "h-9 rounded-lg border border-chad-red/30 bg-[#1a0c0e] px-4 text-xs font-bold text-chad-red hover:bg-[#251013] transition cursor-pointer",
            className,
          )}
        >
          Connection Timeout. Retry?
        </button>
      );
    }
    return (
      <button
        className={cn(
          "h-9 rounded-lg border border-white/10 bg-white/5 px-4 text-xs text-muted",
          className,
        )}
        disabled
      >
        Connecting…
      </button>
    );
  }

  if (!authenticated) {
    return (
      <div className="relative">
        <button
          onClick={login}
          className={cn(
            "inline-flex h-10 items-center justify-center rounded-lg bg-[#12111a] ring ring-white/10 px-5 text-sm font-bold text-white transition hover:bg-[#1a1928] cursor-pointer shrink-0",
            className,
          )}
        >
          Login
        </button>

        {authError && (
          <div className="absolute right-0 top-11 w-64 rounded-xl border border-chad-red/25 bg-[#17090c] p-3 text-xs text-[#ff5a64] shadow-2xl z-50 flex items-start gap-2 animate-pulse">
            <AlertTriangle className="size-4 shrink-0 text-chad-red mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-white">Auth error</p>
              <p className="text-[11px] leading-4 text-muted mt-0.5">{authError}</p>
            </div>
            <button
              onClick={() => setAuthError(null)}
              className="text-muted hover:text-white text-sm font-bold leading-none cursor-pointer"
            >
              &times;
            </button>
          </div>
        )}
      </div>
    );
  }

  const solPrice = 147.0;
  const usdValue = typeof solBalance === "number" ? solBalance * solPrice : 0.00;
  const formattedUsd = usdValue > 0 ? `$${usdValue.toFixed(2)}` : "$0.00";

  return (
    <div className="flex items-center gap-3">
      {demoMode && (
        <div className="h-9 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 flex flex-col justify-center items-center leading-none text-center shrink-0 select-none">
          <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wider">Demo</span>
          <span className="text-[8px] text-amber-500/80 uppercase font-medium mt-0.5">Fallback</span>
        </div>
      )}
      <div className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className={cn(
            "flex h-9 items-center gap-2.5 rounded-lg border border-white/8 bg-[#090914] px-3 text-left outline-none transition cursor-pointer hover:bg-white/[0.02] select-none shrink-0",
            className,
          )}
        >
          <div className="flex flex-col items-end leading-tight">
            <span className="text-xs font-semibold text-white">{formattedUsd}</span>
            <span className="text-[10px] text-muted font-mono">{address ? shortenAddress(address, 4) : "--"}</span>
          </div>
          <div className="size-6 rounded-full bg-[#ff6534] flex items-center justify-center font-bold text-[9px] text-white border border-white/10 relative overflow-hidden select-none">
            <span className="text-white text-[8px] tracking-tighter">CW</span>
            <span className="absolute bottom-0 right-0 size-1.5 rounded-full bg-chad-green border border-[#05050d]" />
          </div>
        </button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-white/10 bg-[#08101e] p-3 shadow-2xl z-50">
            <p className="text-[10px] uppercase tracking-wider text-muted mb-2 px-2 font-semibold">Account Menu</p>
            
            <div className="rounded-xl bg-white/[0.03] p-2.5 mb-3 border border-white/5">
              <p className="text-[10px] text-muted uppercase tracking-wider">Solana Address</p>
              <div className="flex items-center justify-between gap-2 mt-1.5">
                <span className="text-xs text-white/95 truncate font-mono max-w-[130px]">
                  {address}
                </span>
                <button
                  onClick={handleCopy}
                  className="inline-flex size-7 items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-chad-mint transition"
                  title="Copy address"
                >
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                </button>
              </div>
              <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-xs text-muted">
                <span>SOL Balance:</span>
                <span className="text-white font-semibold">
                  {typeof solBalance === "number" ? solBalance.toFixed(4) : "—"} SOL
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                setMenuOpen(false);
                logout();
              }}
              className="flex w-full items-center justify-between rounded-xl bg-chad-red/10 hover:bg-chad-red/20 px-3 py-2 text-xs font-semibold text-[#ff5a64] transition"
            >
              <span>Sign out</span>
              <LogOut className="size-3.5" />
            </button>
          </div>
        </>
      )}

      {authError && (
        <div className="absolute right-0 top-13 w-64 rounded-xl border border-chad-red/25 bg-[#17090c] p-3 text-xs text-[#ff5a64] shadow-2xl z-50 flex items-start gap-2">
          <AlertTriangle className="size-4 shrink-0 text-chad-red mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-white">Auth warning</p>
            <p className="text-[11px] leading-4 text-muted mt-0.5">{authError}</p>
          </div>
          <button
            onClick={() => setAuthError(null)}
            className="text-muted hover:text-white text-sm font-bold leading-none"
          >
            &times;
          </button>
        </div>
      )}
      </div>
    </div>
  );
}
