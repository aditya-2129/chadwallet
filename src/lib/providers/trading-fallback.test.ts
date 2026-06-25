import { describe, expect, it } from "vitest"
import { DEFAULT_TOKEN_MINT, USDC_MINT } from "@/lib/mock-data"
import {
  buildFallbackQuote,
  getFallbackTokenSummary,
} from "@/lib/providers/trading-fallback"

describe("trading fallback", () => {
  it("models USDC as a one-dollar quote asset", () => {
    expect(getFallbackTokenSummary(USDC_MINT)).toMatchObject({
      symbol: "USDC",
      price: 1,
    })
  })

  it("returns a correctly labeled USDC to token route", () => {
    const quote = buildFallbackQuote({
      inputMint: USDC_MINT,
      outputMint: DEFAULT_TOKEN_MINT,
      amountUi: 250,
      slippageBps: 100,
    })

    expect(quote.route).toEqual(["USDC", "ChadRouter", "BONK"])
    expect(Number(quote.outputAmount)).toBeGreaterThan(10_000_000)
  })
})
