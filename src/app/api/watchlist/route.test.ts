import { describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  verifyPrivyRequest: vi.fn(),
  getSupabaseAdmin: vi.fn(),
}))

vi.mock("@/lib/server-auth", () => ({
  verifyPrivyRequest: mocks.verifyPrivyRequest,
}))

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}))

import { DELETE, GET, POST } from "./route"

function makeRequest(url: string, body?: unknown) {
  return {
    nextUrl: new URL(url),
    json: async () => body,
    headers: new Headers(),
    cookies: {
      get: () => undefined,
    },
  } as unknown as Parameters<typeof GET>[0]
}

function createSupabaseFixture(options: {
  watchlistItems?: string[]
  profile?: { data: { wallet_address: string | null } | null; error: { message: string } | null }
  profileInsertError?: { message: string } | null
  watchlistUpsertError?: { message: string } | null
  watchlistDeleteError?: { message: string } | null
} = {}) {
  const profileSelectChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(options.profile ?? { data: null, error: null }),
    insert: vi.fn().mockResolvedValue({ error: options.profileInsertError ?? null }),
    update: vi.fn(),
  }

  const profileUpdateChain = {
    eq: vi.fn().mockResolvedValue({ error: null }),
  }
  profileSelectChain.update = vi.fn().mockReturnValue(profileUpdateChain)

  const watchlistSelectChain = {
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({
      data: (options.watchlistItems ?? []).map((token_mint) => ({ token_mint })),
      error: null,
    }),
  }

  const watchlistDeleteChain2 = {
    eq: vi.fn().mockResolvedValue({ error: options.watchlistDeleteError ?? null }),
  }
  const watchlistDeleteChain1 = {
    eq: vi.fn().mockReturnValue(watchlistDeleteChain2),
  }

  const watchlistQuery = {
    select: vi.fn().mockReturnValue(watchlistSelectChain),
    upsert: vi.fn().mockResolvedValue({ error: options.watchlistUpsertError ?? null }),
    delete: vi.fn().mockReturnValue(watchlistDeleteChain1),
  }

  const supabase = {
    from: vi.fn((table: string) => {
      if (table === "profiles") return profileSelectChain
      if (table === "watchlist_items") return watchlistQuery
      throw new Error(`Unexpected table: ${table}`)
    }),
  }

  return { supabase, profileSelectChain, profileUpdateChain, watchlistQuery }
}

describe("watchlist route", () => {
  const mint = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"
  const walletAddress = "11111111111111111111111111111111"

  it("rejects unauthenticated reads", async () => {
    mocks.verifyPrivyRequest.mockResolvedValue({
      authenticated: false,
      userId: null,
    })

    const response = await GET(makeRequest("http://localhost/api/watchlist"))

    expect(response.status).toBe(401)
    expect(mocks.getSupabaseAdmin).not.toHaveBeenCalled()
  })

  it("returns a disabled persistence payload when Supabase is unconfigured", async () => {
    mocks.verifyPrivyRequest.mockResolvedValue({
      authenticated: true,
      userId: "user-1",
    })
    mocks.getSupabaseAdmin.mockReturnValue(null)

    const response = await POST(
      makeRequest("http://localhost/api/watchlist", { mint, walletAddress }),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      data: {
        mint,
        watched: true,
        configured: false,
      },
      error: null,
    })
  })

  it("creates a profile before writing a watchlist item when configured", async () => {
    const { supabase, profileSelectChain, watchlistQuery } = createSupabaseFixture()
    mocks.verifyPrivyRequest.mockResolvedValue({
      authenticated: true,
      userId: "user-1",
    })
    mocks.getSupabaseAdmin.mockReturnValue(supabase)

    const response = await POST(
      makeRequest("http://localhost/api/watchlist", { mint, walletAddress }),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      data: {
        mint,
        watched: true,
        configured: true,
      },
      error: null,
    })
    expect(profileSelectChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        privy_user_id: "user-1",
        wallet_address: walletAddress,
      }),
    )
    expect(watchlistQuery.upsert).toHaveBeenCalledWith(
      {
        user_id: "user-1",
        token_mint: mint,
      },
      { onConflict: "user_id,token_mint" },
    )
  })

  it("supports deleting a watchlist item with query validation", async () => {
    const { supabase } = createSupabaseFixture()
    mocks.verifyPrivyRequest.mockResolvedValue({
      authenticated: true,
      userId: "user-1",
    })
    mocks.getSupabaseAdmin.mockReturnValue(supabase)

    const response = await DELETE(makeRequest(`http://localhost/api/watchlist?mint=${mint}`))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      data: {
        mint,
        watched: false,
        configured: true,
      },
      error: null,
    })
  })
})
