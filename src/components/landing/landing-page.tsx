"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Download,
  Menu,
  X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AuthButton } from "@/components/auth-button";
import { TokenTickerStrip } from "@/components/landing/token-ticker-strip";
import type { TokenSummary } from "@/lib/types";

type TrendingResponse = {
  data: { items: TokenSummary[]; source: string } | null;
  error: { message: string } | null;
};

const heroToken = "So11111111111111111111111111111111111111112";

function MobileMenu({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="lg:hidden">
      <div
        className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        id="landing-mobile-menu"
        className="fixed inset-x-4 top-16 z-50 rounded-2xl border border-white/10 bg-[#060510]/95 p-4 shadow-2xl shadow-black/40"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <span className="text-sm font-semibold text-white">Menu</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 p-2 text-white transition hover:bg-white/10"
            aria-label="Close menu"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-4 flex flex-col gap-3">
          <AuthButton className="w-full justify-center" />
          <a
            href="https://apps.apple.com/us/app/chadwallet/id6757367474"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 py-3 text-sm text-white hover:bg-white/10 transition"
          >
            <Download className="size-4" />
            <span>App Store</span>
          </a>
          <a
            href="https://play.google.com/store/apps/details?id=xyz.chadwallet.www"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 py-3 text-sm text-white hover:bg-white/10 transition"
          >
            <Download className="size-4" />
            <span>Google Play</span>
          </a>
        </div>
      </div>
    </div>
  );
}

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  const { data: trendingTokens = [] } = useQuery<TokenSummary[]>({
    queryKey: ["landing-trending"],
    queryFn: async () => {
      const res = await fetch("/api/tokens/trending?limit=24");
      const json: TrendingResponse = await res.json();
      return json.data?.items ?? [];
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  // Split tokens into two groups for top vs bottom tickers
  const midpoint = Math.ceil(trendingTokens.length / 2);
  const topTokens = trendingTokens.slice(0, midpoint);
  const bottomTokens = trendingTokens.slice(midpoint);

  return (
    <div className="relative isolate flex min-h-svh flex-col overflow-x-hidden bg-[#060510] text-white">
      {/* ═══════════════════ HEADER ═══════════════════ */}
      <header className="hidden items-center justify-between px-5 pt-3 h-13 lg:flex">
        <Link
          href="/"
          aria-label="ChadWallet home"
          className="flex items-center gap-2.5 text-white"
        >
          <Image
            src="/brand/logo-light.png"
            alt="ChadWallet"
            width={34}
            height={34}
            className="size-8 rounded-lg bg-white p-0.5"
            priority
          />
          <span className="text-lg font-black tracking-[-0.03em]">
            chadwallet
          </span>
        </Link>

        <div className="flex gap-2">
          <a
            href="https://apps.apple.com/us/app/chadwallet/id6757367474"
            target="_blank"
            rel="noreferrer"
            aria-label="Download on the App Store"
            className="flex h-10 items-center gap-1.5 rounded-md bg-white/20 px-3 backdrop-blur-md transition hover:opacity-90 hover:ring-1 hover:ring-white/40 hover:backdrop-blur-sm"
          >
            <svg viewBox="0 0 384 512" fill="currentColor" className="h-5 w-4 shrink-0 -mt-px">
              <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-27.1-46.8-42.2-83.2-45.6-34.2-3.3-71.6 20.1-85.3 20.1-14.5 0-47.3-19.1-72.9-19.1C63.4 140.4 0 187.2 0 275.4c0 26.2 4.8 53.3 14.4 81.2 12.8 36.6 59 126.2 107.2 124.7 24.8-.6 42.4-17.8 75.2-17.8 31.7 0 48.1 17.8 75.9 17.8 48.7-.8 90.3-82.6 102.5-119.3-65.2-30.7-61.5-90-61.5-93.3zm-56.6-164.2c27.3-32.4 24.8-62.1 24-72.5-24 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
            </svg>
            <div className="flex flex-col leading-none">
              <span className="text-[7px] font-normal uppercase tracking-wider text-white/70">Download on the</span>
              <span className="text-[13px] font-semibold leading-tight">App Store</span>
            </div>
          </a>
          <a
            href="https://play.google.com/store/apps/details?id=xyz.chadwallet.www"
            target="_blank"
            rel="noreferrer"
            aria-label="Get it on Google Play"
            className="flex h-10 items-center gap-1.5 rounded-md bg-white/20 px-3 backdrop-blur-md transition hover:opacity-90 hover:ring-1 hover:ring-white/40 hover:backdrop-blur-sm"
          >
            <svg viewBox="0 0 512 512" fill="currentColor" className="h-4.5 w-4 shrink-0">
              <path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8zM104.6 499l280.8-161.2-60.1-60.1L104.6 499z"/>
            </svg>
            <div className="flex flex-col leading-none">
              <span className="text-[7px] font-normal uppercase tracking-wider text-white/70">GET IT ON</span>
              <span className="text-[13px] font-semibold leading-tight">Google Play</span>
            </div>
          </a>
          <AuthButton />
        </div>
      </header>

      {/* Mobile header */}
      <header className="flex items-center justify-between px-4 pt-3 lg:hidden">
        <Link
          href="/"
          aria-label="ChadWallet home"
          className="flex items-center gap-2 text-white"
        >
          <Image
            src="/brand/logo-light.png"
            alt="ChadWallet"
            width={30}
            height={30}
            className="size-7 rounded-lg bg-white p-0.5"
            priority
          />
          <span className="text-base font-black tracking-[-0.03em]">
            chadwallet
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="inline-flex size-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="landing-mobile-menu"
        >
          <Menu className="size-5" />
        </button>
        <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      </header>

      {/* ═══════════════════ TOP TOKEN BANNER ═══════════════════ */}
      {topTokens.length > 0 && (
        <TokenTickerStrip
          direction="left"
          tokens={topTokens}
          label="Trending"
        />
      )}

      {/* ═══════════════════ MAIN ═══════════════════ */}
      <main className="flex flex-1 flex-col items-center justify-center w-full h-full">
        {/* Space background — uses plain img + w-full like fomo (no fill/object-cover to avoid zooming in) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/space-bg.webp"
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          className="absolute top-0 left-0 w-full -z-10 pointer-events-none select-none"
        />

        {/* ── Hero ── */}
        <div className="flex flex-col items-center gap-5 lg:gap-8">
          {/* Text block */}
          <div className="flex flex-col items-center gap-2 text-center px-6 pt-10 lg:pt-20">
            {/* Large brand name — scaled down vs fomo since 'chadwallet' (10 chars) is wider than 'fomo' (4 chars) */}
            <h1 className="text-[clamp(3.5rem,10vw,9rem)] font-black leading-[0.85] tracking-[-0.03em] text-white drop-shadow-[0_4px_32px_rgba(234,237,255,0.08)]">
              chadwallet
            </h1>
            {/* Subtitle */}
            <h2 className="text-[24px] leading-6 text-[#EAEDFF] text-center tracking-tighter lg:text-[32px] lg:leading-10">
              where chads become legends.
            </h2>
            {/* Tagline */}
            <p className="text-[#D1D8FF99] text-center tracking-tight lg:text-[22px] lg:leading-6">
              From memecoins to viral tokens, trade any crypto in seconds.
            </p>
          </div>

          {/* CTA buttons — mobile: Start trading + Download app */}
          <div className="flex flex-col sm:flex-row gap-2 lg:hidden w-full px-6 max-w-xs items-stretch justify-center">
            <Link
              href={`/trade/${heroToken}`}
              className="z-2 flex h-12 items-center justify-center rounded-xl bg-[#606AF780] text-center text-base font-bold backdrop-blur-md border border-white/10 transition-colors duration-150 hover:bg-[#606AF7CC]"
            >
              Start trading
            </Link>
            <a
              href="#download"
              className="z-2 flex h-12 items-center justify-center rounded-xl border border-white/10 bg-white/12 text-center text-base font-bold backdrop-blur-md"
            >
              Download app
            </a>
          </div>

          {/* CTA buttons — desktop: Start trading + Download app */}
          <div className="hidden gap-3 lg:flex">
            <Link
              href={`/trade/${heroToken}`}
              className="group z-2 hidden items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[#606AF780] px-3 py-3 text-lg font-bold backdrop-blur-md transition-colors duration-150 hover:bg-[#606AF7CC] lg:flex w-50"
            >
              <span>Start trading</span>
              <div className="flex items-center overflow-hidden w-0 opacity-0 group-hover:w-7 group-hover:opacity-100 transition-all duration-150 ease-out">
                <ArrowRight className="size-5 ml-2 shrink-0" />
              </div>
            </Link>
            <a
              href="#download"
              className="group z-2 flex items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/12 text-lg font-bold backdrop-blur-md transition-colors duration-150 hover:bg-white/20 w-50"
            >
              <div className="flex items-center overflow-hidden w-0 opacity-0 group-hover:w-7 group-hover:opacity-100 transition-all duration-150 ease-out">
                <Download className="size-5 mr-2 shrink-0" />
              </div>
              <span>Download app</span>
            </a>
          </div>
        </div>

        {/* Astronaut — mobile */}
        <Image
          src="/brand/astronaut-mobile.webp"
          alt=""
          width={600}
          height={600}
          className="lg:hidden -mt-16 animate-[float_10s_ease-in-out_infinite]"
        />
        {/* Astronaut — desktop */}
        <Image
          src="/brand/astronaut.webp"
          alt=""
          width={760}
          height={760}
          className="hidden lg:block h-130 -mt-20 object-contain animate-[float_4s_ease-in-out_infinite]"
          priority
        />

        {/* ── "Trade from anywhere" section — desktop ── */}
        <div className="hidden lg:flex flex-col items-center py-20 px-8 gap-4">
          <div className="font-mono font-bold text-[#606af7] tracking-wider text-sm uppercase">NOW AVAILABLE ON WEB</div>
          <h2 className="text-[clamp(2.5rem,5.5vw,4.25rem)] font-black leading-[1.05] tracking-[-0.03em] text-white text-center">
            trade from anywhere.<br />never lose a beat.
          </h2>
          <p className="text-[#EAEDFF99] text-[22px] tracking-tight text-center max-w-2xl">
            Open a trade on your phone, close it on your desktop — all in one app.
          </p>
          
          <div className="relative mt-12 w-full max-w-[1050px] flex justify-center">
            {/* Desktop Mockup Monitor Frame with CSS Stand */}
            <div className="w-[78%] flex flex-col items-center relative">
              {/* Monitor Screen & Bezel */}
              <div className="w-full overflow-hidden rounded-[20px] border-[10px] border-[#181822] bg-[#090914] shadow-[0_30px_70px_rgba(0,0,0,0.8)] p-0.5 relative z-10 transition-all duration-300 hover:border-[#20202c]">
                <Image
                  src="/brand/trading-desktop.png"
                  alt="ChadWallet Desktop Web Interface"
                  width={1920}
                  height={1080}
                  className="w-full rounded-[10px] object-cover"
                  priority
                />
              </div>
              
              {/* Monitor Neck (Trapezoid) */}
              <div className="w-24 h-16 bg-gradient-to-b from-[#181822] via-[#242432] to-[#121218] -mt-1.5 relative z-0 [clip-path:polygon(15%_0%,_85%_0%,_100%_100%,_0%_100%)] shadow-inner" />
              
              {/* Monitor Base */}
              <div className="w-48 h-3 bg-gradient-to-r from-[#20202c] via-[#2c2c3e] to-[#20202c] rounded-b-[12px] shadow-[0_6px_12px_rgba(0,0,0,0.5)] relative z-0 -mt-0.5" />
            </div>
            
            {/* Mobile Mockup Overlay (iPhone style) */}
            <div className="absolute -right-8 -bottom-10 w-[24%] z-20 transition-all duration-500 hover:scale-[1.04] animate-[float_5s_ease-in-out_infinite]">
              <div className="relative border-[5px] border-[#181822] bg-[#090914] rounded-[34px] shadow-[0_20px_50px_rgba(0,0,0,0.95)] p-0.5 overflow-hidden rotate-[4deg] hover:rotate-0 transition-transform duration-300">
                {/* iPhone Dynamic Island notch */}
                <div className="absolute top-2.5 left-1/2 -translate-x-1/2 h-3.5 w-18 bg-black rounded-full z-20" />
                {/* Speaker slit */}
                <div className="absolute top-1 left-1/2 -translate-x-1/2 h-0.5 w-6 bg-neutral-800 rounded-full z-20" />
                
                {/* Inner Screen */}
                <div className="rounded-[28px] overflow-hidden border border-white/5 bg-[#090914]">
                  <Image
                    src="/brand/trading-mobile.png"
                    alt="ChadWallet Mobile Interface"
                    width={390}
                    height={844}
                    className="w-full object-cover aspect-[9/19.5]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── "Trade from anywhere" section — mobile ── */}
        <div className="flex lg:hidden flex-col items-center py-12 px-6 gap-3 text-center w-full">
          <div className="font-mono font-bold text-[#606af7] tracking-wider text-xs uppercase">NOW AVAILABLE ON WEB</div>
          <h2 className="text-3xl sm:text-4xl font-black leading-tight tracking-[-0.03em] text-white">
            trade from anywhere.<br />never lose a beat.
          </h2>
          <p className="text-[#D1D8FF99] text-base tracking-tight max-w-md">
            Open a trade on your phone, close it on your desktop — all in one app.
          </p>
          
          <div className="relative mt-8 w-full max-w-[480px] flex justify-center mb-10">
            {/* Desktop Mockup Card with bezel */}
            <div className="w-[82%] overflow-hidden rounded-[16px] border-[6px] border-[#181822] bg-[#090914] shadow-xl p-0.5">
              <Image
                src="/brand/trading-desktop.png"
                alt="ChadWallet Desktop Web Interface"
                width={960}
                height={540}
                className="w-full rounded-[10px] object-cover"
                loading="lazy"
              />
            </div>
            
            {/* Mobile Mockup Overlay */}
            <div className="absolute -right-2 -bottom-8 w-[28%]">
              <div className="relative border-[3px] border-[#181822] bg-[#090914] rounded-[18px] shadow-[0_15px_30px_rgba(0,0,0,0.8)] p-0.5 overflow-hidden rotate-[4deg]">
                {/* Dynamic Island */}
                <div className="absolute top-1.5 left-1/2 -translate-x-1/2 h-1.5 w-8 bg-black rounded-full z-20" />
                <div className="rounded-[14px] overflow-hidden border border-white/5">
                  <Image
                    src="/brand/trading-mobile.png"
                    alt="ChadWallet Mobile Interface"
                    width={195}
                    height={422}
                    className="w-full object-cover aspect-[9/19.5]"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Feature cards section ── */}
        <div className="pt-8 lg:py-2 px-3 lg:px-20 flex flex-col self-stretch min-[500px]:self-center gap-13 max-w-[1250px]">
          {/* Section heading — desktop only */}
          <div className="hidden lg:flex flex-col gap-3">
            <h2 className="text-[60px] tracking-tighter leading-15">never miss out again</h2>
            <p className="text-[#EAEDFF99] leading-6 text-[28px]">the only social-first trading app for chads</p>
          </div>

          <div className="flex flex-col gap-3 lg:gap-6">
            {/* Row 1 */}
            <div className="flex flex-col lg:flex-row gap-3 lg:gap-6 items-start">
              {/* Leaderboard */}
              <div className="group flex-1 min-w-0 pt-8 pb-0 rounded-[24px] flex flex-col overflow-hidden border border-white/5 hover:border-white/12 transition-all duration-300 bg-[#0e0e16] h-[430px] lg:h-[450px]">
                <div className="font-mono text-xs uppercase tracking-wider text-[#606af7] px-8 font-bold">LEADERBOARD</div>
                <h3 className="text-[26px] leading-[1.15] font-black tracking-tight text-white px-8 mt-1">become a legend, top the leaderboard</h3>
                <div className="relative w-full flex-1 mt-6 flex justify-end items-end overflow-hidden">
                  <div className="w-[85%] h-[92%] mx-auto rounded-t-[20px] border-x border-t border-white/10 bg-[#090914] pt-2.5 px-2.5 shadow-2xl transition-all duration-300 group-hover:translate-y-[-6px] group-hover:border-white/15">
                    <div className="w-full h-full rounded-t-[12px] overflow-hidden relative">
                      <Image loading="lazy" src="/brand/portfolio.png" alt="Leaderboard preview" fill className="object-cover object-top transition-transform duration-300 group-hover:scale-[1.02]" sizes="(max-width: 1024px) 100vw, 33vw" />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Feed */}
              <div className="group flex-1 min-w-0 pt-8 pb-0 rounded-[24px] flex flex-col overflow-hidden border border-white/5 hover:border-white/12 transition-all duration-300 bg-[#0c162b] h-[430px] lg:h-[450px]">
                <div className="font-mono text-xs uppercase tracking-wider text-[#606af7] px-8 font-bold">FEED</div>
                <h3 className="text-[26px] leading-[1.15] font-black tracking-tight text-white px-8 mt-1">discover and follow top traders</h3>
                <div className="relative w-full flex-1 mt-6 overflow-hidden">
                  <Image loading="lazy" src="/brand/kol.png" alt="Social feed preview" fill className="object-cover object-top transition-transform duration-500 group-hover:scale-105" sizes="(max-width: 1024px) 100vw, 33vw" />
                </div>
              </div>
              
              {/* Alerts */}
              <div className="group flex-1 min-w-0 pt-8 pb-0 rounded-[24px] flex flex-col overflow-hidden border border-white/5 hover:border-white/12 transition-all duration-300 bg-[#0d0d15] h-[430px] lg:h-[450px]">
                <div className="font-mono text-xs uppercase tracking-wider text-[#606af7] px-8 font-bold">ALERTS</div>
                <h3 className="text-[26px] leading-[1.15] font-black tracking-tight text-white px-8 mt-1">real time notifications for what the best are buying</h3>
                <div className="relative w-full flex-1 mt-6 px-4 flex items-end overflow-hidden">
                  <div className="w-full h-[92%] rounded-t-[16px] border-x border-t border-white/10 bg-[#090914] overflow-hidden shadow-2xl transition-all duration-300 group-hover:translate-y-[-6px] group-hover:border-white/15 relative">
                    <Image loading="lazy" src="/brand/buy-sell.png" alt="Alerts preview" fill className="object-cover object-top transition-transform duration-300 group-hover:scale-[1.02]" sizes="(max-width: 1024px) 100vw, 33vw" />
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2 */}
            <div className="flex flex-col lg:flex-row gap-3 lg:gap-6 items-start">
              {/* Easy Onboarding */}
              <div className="group flex-1 min-w-0 pt-8 pb-0 rounded-[24px] flex flex-col overflow-hidden border border-white/5 hover:border-white/12 transition-all duration-300 bg-[#0a161e] h-[430px] lg:h-[450px]">
                <div className="font-mono text-xs uppercase tracking-wider text-[#606af7] px-8 font-bold">EASY ONBOARDING</div>
                <h3 className="text-[26px] leading-[1.15] font-black tracking-tight text-white px-8 mt-1">create an account in an instant</h3>
                <div className="relative w-full flex-1 mt-6 flex justify-end items-end overflow-hidden">
                  <div className="w-[85%] h-[92%] mx-auto rounded-t-[20px] border-x border-t border-white/10 bg-[#090914] pt-2.5 px-2.5 shadow-2xl transition-all duration-300 group-hover:translate-y-[-6px] group-hover:border-white/15">
                    <div className="w-full h-full rounded-t-[12px] overflow-hidden relative">
                      <Image loading="lazy" src="/brand/splash.png" alt="Sign in preview" fill className="object-cover object-top transition-transform duration-300 group-hover:scale-[1.02]" sizes="(max-width: 1024px) 100vw, 33vw" />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Zero Complexity */}
              <div className="group flex-1 min-w-0 pt-8 pb-0 rounded-[24px] flex flex-col overflow-hidden border border-white/5 hover:border-white/12 transition-all duration-300 bg-[#0c1220] h-[430px] lg:h-[450px]">
                <div className="font-mono text-xs uppercase tracking-wider text-[#606af7] px-8 font-bold">ZERO COMPLEXITY</div>
                <h3 className="text-[26px] leading-[1.15] font-black tracking-tight text-white px-8 mt-1">multichain &amp; gasless</h3>
                <div className="relative w-full flex-1 mt-6 overflow-hidden">
                  <Image loading="lazy" src="/brand/token.png" alt="Assets preview" fill className="object-cover object-top transition-transform duration-500 group-hover:scale-105" sizes="(max-width: 1024px) 100vw, 33vw" />
                </div>
              </div>
              
              {/* One Click to Buy */}
              <div className="group flex-1 min-w-0 pt-8 pb-0 rounded-[24px] flex flex-col overflow-hidden border border-white/5 hover:border-white/12 transition-all duration-300 bg-[#0b162c] h-[430px] lg:h-[450px]">
                <div className="font-mono text-xs uppercase tracking-wider text-[#606af7] px-8 font-bold">ONE CLICK TO BUY</div>
                <h3 className="text-[26px] leading-[1.15] font-black tracking-tight text-white px-8 mt-1">fund with apple pay &amp; credit cards</h3>
                <div className="relative w-full flex-1 mt-6 overflow-hidden">
                  <Image loading="lazy" src="/brand/launch.png" alt="Apple Pay preview" fill className="object-cover object-top transition-transform duration-500 group-hover:scale-105" sizes="(max-width: 1024px) 100vw, 33vw" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── CTA / spinning circles section ── */}
        <div id="download" className="relative self-stretch flex items-center justify-center py-40 lg:py-0">
          <Image
            loading="lazy"
            src="/brand/legends.webp"
            alt=""
            fill
            className="absolute inset-0 w-full h-full bottom-0 object-cover"
          />
          {/* Top fade */}
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#060510] to-transparent" />
          {/* Bottom fade */}
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#060510] to-transparent" />

          <div className="px-8 w-[80vw]">
            <div className="flex flex-col justify-center items-center aspect-square relative">
              <div className="flex flex-col gap-3 lg:gap-6 items-center w-[70vw] relative z-10">
                <h2 className="text-[40px] leading-10 lg:text-[60px] lg:leading-15 tracking-tighter text-center">
                  a trading app<br />for the rest of us
                </h2>
                <p className="lg:text-[22px] text-[#D1D8FF99] lg:leading-7 tracking-tight text-center">
                  join 500,000 traders making their name on ChadWallet
                </p>
                <div className="pt-6">
                  {/* Mobile CTA */}
                  <div className="flex gap-2 lg:hidden">
                    <a
                      href="https://apps.apple.com/us/app/chadwallet/id6757367474"
                      target="_blank"
                      rel="noreferrer"
                      className="z-2 rounded-xl border border-white/10 bg-white/12 px-6 py-3 text-center text-lg font-bold backdrop-blur-md w-50"
                    >
                      Download app
                    </a>
                  </div>
                  {/* Desktop CTA */}
                  <div className="hidden gap-3 lg:flex">
                    <Link
                      href={`/trade/${heroToken}`}
                      className="group z-2 hidden items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[#606AF780] py-3 text-lg font-bold backdrop-blur-md transition-colors duration-150 hover:bg-[#606AF7CC] lg:flex w-50"
                    >
                      <span>Start trading</span>
                      <div className="flex items-center overflow-hidden w-0 opacity-0 group-hover:w-7 group-hover:opacity-100 transition-all duration-150 ease-out">
                        <ArrowRight className="size-5 ml-2 shrink-0" />
                      </div>
                    </Link>
                    <a
                      href="https://apps.apple.com/us/app/chadwallet/id6757367474"
                      target="_blank"
                      rel="noreferrer"
                      className="group z-2 flex items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/12 text-lg font-bold backdrop-blur-md transition-colors duration-150 hover:bg-white/20 w-50"
                    >
                      <div className="flex items-center overflow-hidden w-0 opacity-0 group-hover:w-7 group-hover:opacity-100 transition-all duration-150 ease-out">
                        <Download className="size-5 mr-2 shrink-0" />
                      </div>
                      <span>Download app</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Spinning circles */}
              <Image
                loading="lazy"
                src="/brand/inner-circle.webp"
                alt=""
                width={600}
                height={600}
                className="absolute inset-0 m-auto z-1 w-[35vw] lg:w-[30vw] animate-[spin_30s_linear_infinite_reverse]"
              />
              <Image
                loading="lazy"
                src="/brand/outer-circle.webp"
                alt=""
                width={800}
                height={800}
                className="absolute inset-0 m-auto z-1 w-screen lg:w-[55vw] lg:max-w-[1100px] animate-[spin_45s_linear_infinite]"
              />
            </div>
          </div>
        </div>
      </main>

      {/* ═══════════════════ BOTTOM TOKEN BANNER ═══════════════════ */}
      {bottomTokens.length > 0 && (
        <TokenTickerStrip
          direction="right"
          tokens={bottomTokens}
          label="Gainers"
        />
      )}

      {/* ═══════════════════ FOOTER ═══════════════════ */}
      <footer className="px-10 pt-8 pb-12 flex flex-col lg:flex-row gap-10 items-start justify-between">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <Link href="/" aria-label="ChadWallet home" className="flex items-center gap-2 text-white">
              <Image
                src="/brand/logo-light.png"
                alt="ChadWallet"
                width={34}
                height={34}
                className="size-8 rounded-lg bg-white p-0.5"
              />
              <span className="text-lg font-black tracking-[-0.03em]">chadwallet</span>
            </Link>
            <div className="text-2xl text-[#D1D8FF99] leading-7 tracking-tighter">
              where chads become legends.
            </div>
          </div>
          <div className="text-[#D1D8FF55] hidden lg:block">
            © 2026 ChadWallet Inc.
          </div>
        </div>

        <div className="flex items-start flex-col lg:flex-row gap-8 lg:gap-2">
          <div className="flex flex-col items-start gap-2 min-w-40">
            <div className="text-[#D1D8FF55] font-mono text-sm">ABOUT</div>
            <Link href="/trade" className="text-sm hover:text-[#D1D8FF99]">Trade</Link>
            <Link href="/#features" className="text-sm hover:text-[#D1D8FF99]">Features</Link>
          </div>
          <div className="flex flex-col items-start gap-2 min-w-40">
            <div className="text-[#D1D8FF55] font-mono text-sm">SOCIAL</div>
            <a href="https://x.com/chadwallet" className="text-sm hover:text-[#D1D8FF99]" target="_blank" rel="noopener noreferrer">X/Twitter</a>
          </div>
          <div className="flex flex-col items-start gap-2 min-w-40">
            <div className="text-[#D1D8FF55] font-mono text-sm">LEGAL</div>
            <Link href="/privacy" className="text-sm hover:text-[#D1D8FF99]">Privacy Policy</Link>
            <Link href="/terms" className="text-sm hover:text-[#D1D8FF99]">Terms of Service</Link>
          </div>
        </div>

        <div className="text-[#D1D8FF55] block lg:hidden">
          © 2026 ChadWallet Inc.
        </div>
      </footer>
    </div>
  );
}
