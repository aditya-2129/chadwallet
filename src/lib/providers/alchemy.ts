/* eslint-disable @typescript-eslint/no-explicit-any */
import { SOL_MINT, fallbackTokens } from "@/lib/mock-data"
import type { WalletPosition } from "@/lib/types"

function getRpcUrl() {
  return process.env.ALCHEMY_SOLANA_RPC_URL
}

async function callRpc(method: string, params: any[]) {
  const rpcUrl = getRpcUrl()
  if (!rpcUrl) return null

  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Solana RPC request failed (${response.status})`)
  }

  const payload = await response.json()
  if (payload.error) {
    throw new Error(`Solana RPC error: ${payload.error.message}`)
  }

  return payload.result
}

export async function getAlchemyPositions(address: string): Promise<WalletPosition[] | null> {
  const rpcUrl = getRpcUrl()
  if (!rpcUrl) return null

  let solLamports = 0
  let tokenAccounts: any[] = []

  try {
    const [solResult, tokenAccountsResult, token2022AccountsResult] = await Promise.all([
      callRpc("getBalance", [address]),
      callRpc("getTokenAccountsByOwner", [
        address,
        { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
        { encoding: "jsonParsed" },
      ]),
      callRpc("getTokenAccountsByOwner", [
        address,
        { programId: "TokenzQdBNbXtcaP53XgT7u9n555ESPJbTFr45175UR" },
        { encoding: "jsonParsed" },
      ]).catch(() => ({ value: [] })),
    ])

    solLamports = solResult?.value ?? 0
    const legacyList = tokenAccountsResult?.value ?? []
    const token2022List = token2022AccountsResult?.value ?? []
    tokenAccounts = [...legacyList, ...token2022List]
  } catch (error) {
    console.error("Alchemy Solana RPC fetch failed:", error)
    return null
  }

  const solBalance = solLamports / 1e9
  const positions: Array<{ mint: string; symbol: string; balance: number; valueUsd: number }> = []

  positions.push({
    mint: SOL_MINT,
    symbol: "SOL",
    balance: solBalance,
    valueUsd: 0,
  })

  for (const accountInfo of tokenAccounts) {
    const parsedInfo = accountInfo.account?.data?.parsed?.info
    const mint = parsedInfo?.mint
    const tokenAmount = parsedInfo?.tokenAmount
    const balance = tokenAmount?.uiAmount

    if (mint && typeof balance === "number" && balance > 0) {
      if (mint === SOL_MINT) {
        // Skip duplicate SOL accounts if any (should not happen, but to be safe)
        continue
      }
      const summary = fallbackTokens.find((t) => t.mint === mint)
      const symbol = summary?.symbol ?? mint.slice(0, 4).toUpperCase()

      positions.push({
        mint,
        symbol,
        balance,
        valueUsd: 0,
      })
    }
  }

  const mints = positions.map((p) => p.mint)
  const prices = new Map<string, number>()

  for (const p of positions) {
    const summary = fallbackTokens.find((t) => t.mint === p.mint)
    if (summary) {
      prices.set(p.mint, summary.price)
    } else {
      prices.set(p.mint, 0)
    }
  }

  const birdeyeApiKey = process.env.BIRDEYE_API_KEY
  if (birdeyeApiKey && mints.length > 0) {
    try {
      const url = `https://public-api.birdeye.so/defi/multi_price?list_address=${encodeURIComponent(mints.join(","))}`
      const response = await fetch(url, {
        headers: {
          accept: "application/json",
          "X-API-KEY": birdeyeApiKey,
          "x-chain": "solana",
        },
        cache: "no-store",
      })
      if (response.ok) {
        const payload = await response.json()
        const data = payload?.data ?? {}
        for (const mint of mints) {
          const entry = data[mint]
          if (entry && typeof entry.value === "number") {
            prices.set(mint, entry.value)
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch live prices from Birdeye for positions:", error)
    }
  }

  const positionsWithValuation = positions.map((p) => {
    const price = prices.get(p.mint) ?? 0
    return {
      ...p,
      valueUsd: p.balance * price,
      portfolioPercentage: 0,
    }
  })

  const totalValue = positionsWithValuation.reduce((sum, p) => sum + p.valueUsd, 0)

  const finalPositions = positionsWithValuation.map((p) => ({
    ...p,
    portfolioPercentage: totalValue > 0 ? (p.valueUsd / totalValue) * 100 : 0,
  }))

  return finalPositions
}
