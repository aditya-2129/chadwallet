import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { mintSchema } from "@/app/api/_utils"
import { getBirdeyeTrades, mapInterval } from "@/lib/providers/birdeye"
import { JupiterError } from "@/lib/providers/jupiter"
import { getAlchemyPositions } from "@/lib/providers/alchemy"
import { loadPosition } from "@/lib/providers/trading"

// Mock fetch globally for provider tests
const originalFetch = global.fetch

describe("Solana Address Validation", () => {
  it("validates correct Solana mint addresses", () => {
    const validMint = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"
    expect(mintSchema.safeParse(validMint).success).toBe(true)
  })

  it("rejects invalid Solana mint addresses", () => {
    const invalidMint = "InvalidAddressName"
    expect(mintSchema.safeParse(invalidMint).success).toBe(false)
  })
})

describe("Birdeye Interval Mapping", () => {
  it("maps frontend intervals to valid Birdeye parameters", () => {
    expect(mapInterval("1m")).toBe("1m")
    expect(mapInterval("5m")).toBe("5m")
    expect(mapInterval("15m")).toBe("15m")
    expect(mapInterval("1h")).toBe("1H")
    expect(mapInterval("1H")).toBe("1H")
    expect(mapInterval("4h")).toBe("4H")
    expect(mapInterval("4H")).toBe("4H")
    expect(mapInterval("1d")).toBe("1D")
    expect(mapInterval("1D")).toBe("1D")
  })
})

describe("Birdeye Trade Mapping", () => {
  beforeEach(() => {
    process.env.BIRDEYE_API_KEY = "mock-birdeye-key"
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      headers: {
        get: () => null,
      },
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            items: [
              {
                base: {
                  symbol: "BONK",
                  address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
                  uiAmount: 1250000,
                },
                quote: {
                  symbol: "SOL",
                  address: "So11111111111111111111111111111111111111112",
                  uiAmount: 0.42,
                },
                tokenPrice: 3.36e-7,
                blockUnixTime: 1710000000,
                owner: "8C3mQ9n5dQ2v9m8j4r1x2n7p5s6t4u8v9w0x1y2z3a",
                side: "buy",
              },
              {
                base: {
                  symbol: "SOL",
                  address: "So11111111111111111111111111111111111111112",
                  uiAmount: 0.21,
                },
                quote: {
                  symbol: "BONK",
                  address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
                  uiAmount: 625000,
                },
                tokenPrice: 3.36e-7,
                blockUnixTime: 1710000060,
                owner: "9D4nQ9n5dQ2v9m8j4r1x2n7p5s6t4u8v9w0x1y2z3b",
                side: "sell",
              },
            ],
          },
        }),
    })
  })

  afterEach(() => {
    global.fetch = originalFetch
    delete process.env.BIRDEYE_API_KEY
  })

  it("maps Birdeye's nested trade payload into trade events", async () => {
    const trades = await getBirdeyeTrades("DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", 2)

    expect(trades).toHaveLength(2)
    expect(trades[0]).toMatchObject({
      signature: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263-0",
      side: "buy",
      tokenAmount: 1250000,
      valueUsd: 0.42,
      price: 3.36e-7,
      wallet: "8C3mQ9n5dQ2v9m8j4r1x2n7p5s6t4u8v9w0x1y2z3a",
      timestamp: 1710000000000,
    })
    expect(trades[1]).toMatchObject({
      signature: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263-1",
      side: "sell",
      tokenAmount: 625000,
      valueUsd: 0.21,
      price: 3.36e-7,
      wallet: "9D4nQ9n5dQ2v9m8j4r1x2n7p5s6t4u8v9w0x1y2z3b",
      timestamp: 1710000060000,
    })
  })
})

describe("Jupiter Error Mapping & Request Validation", () => {
  it("correctly identifies unsupported-token errors", () => {
    const error = new JupiterError("token_not_tradable", "Token is not tradable on Jupiter", 400)
    expect(error.code).toBe("token_not_tradable")
    expect(error.status).toBe(400)
  })

  it("correctly identifies no-route errors", () => {
    const error = new JupiterError("no_route", "No route found for token swap", 400)
    expect(error.code).toBe("no_route")
  })

  it("correctly identifies invalid amount errors", () => {
    const error = new JupiterError("invalid_amount", "The trade amount is invalid", 400)
    expect(error.code).toBe("invalid_amount")
  })

  it("identifies rate limit errors", () => {
    const error = new JupiterError("rate_limited", "Rate limit exceeded", 429)
    expect(error.code).toBe("rate_limited")
    expect(error.status).toBe(429)
  })
})

describe("Slippage and Balance Validation", () => {
  const checkSlippage = (input: string) => {
    const s = parseFloat(input)
    return !isNaN(s) && s > 0 && s <= 50
  }

  it("validates correct slippage percentages", () => {
    expect(checkSlippage("0.5")).toBe(true)
    expect(checkSlippage("1.0")).toBe(true)
    expect(checkSlippage("5.0")).toBe(true)
  })

  it("rejects zero, negative or excessive slippage percentages", () => {
    expect(checkSlippage("0")).toBe(false)
    expect(checkSlippage("-0.5")).toBe(false)
    expect(checkSlippage("51.0")).toBe(false)
  })

  const hasInsufficientBalance = (amountInput: string, balance: number) => {
    const amount = parseFloat(amountInput)
    if (isNaN(amount) || amount <= 0) return false
    return balance < amount
  }

  it("flags insufficient balances", () => {
    expect(hasInsufficientBalance("250", 100)).toBe(true)
    expect(hasInsufficientBalance("1.5", 0.5)).toBe(true)
  })

  it("permits trades within user balance limit", () => {
    expect(hasInsufficientBalance("50", 100)).toBe(false)
    expect(hasInsufficientBalance("0.1", 1.0)).toBe(false)
  })
})

describe("Alchemy RPC Wallet Balance Normalization", () => {
  beforeEach(() => {
    process.env.ALCHEMY_SOLANA_RPC_URL = "https://solana-mainnet.g.alchemy.com/v2/mock-key"
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it("maps SOL and token balances correctly from JSON-RPC responses", async () => {
    global.fetch = vi.fn().mockImplementation((url, init) => {
      const body = JSON.parse(init.body)
      if (body.method === "getBalance") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ jsonrpc: "2.0", id: 1, result: { value: 1500000000 } }), // 1.5 SOL
        })
      }
      if (body.method === "getTokenAccountsByOwner") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            jsonrpc: "2.0",
            id: 1,
            result: {
              value: [
                {
                  account: {
                    data: {
                      parsed: {
                        info: {
                          mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", // BONK
                          tokenAmount: { decimals: 5, uiAmount: 5000000 },
                        },
                      },
                    },
                  },
                },
              ],
            },
          }),
        })
      }
      return Promise.reject("Unknown mock RPC call")
    })

    const positions = await getAlchemyPositions("DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263")
    expect(positions).not.toBeNull()
    const solPosition = positions?.find((p) => p.symbol === "SOL")
    expect(solPosition?.balance).toBe(1.5)
  })
})

describe("Fallback Source Label Gating", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_PRIVY_APP_ID = "mock-privy-id"
    process.env.ALCHEMY_SOLANA_RPC_URL = "" // unconfigured RPC URL
  })

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_PRIVY_APP_ID
  })

  it("excludes demo balances when live Privy authentication is active", async () => {
    const result = await loadPosition("mock-wallet-address", "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263")
    expect(result.source).toBe("alchemy")
    expect(result.position?.unavailable).toBe(true)
  })
})
