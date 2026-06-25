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

import { GET, POST } from "./route"

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
  recentTokens?: Array<{ token_mint: string; last_viewed_at: string }>
  profile?: { data: { wallet_address: string | null } | null; error: { message: string } | null }
  profileInsertError?: { message: string } | null
  recentUpsertError?: { message: string } | null
} = {}) {
  const profileUpdateChain = {
    eq: vi.fn().mockResolvedValue({ error: null }),
  }

  const profileSelectChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(options.profile ?? { data: null, error: null }),
    insert: vi.fn().mockResolvedValue({ error: options.profileInsertError ?? null }),
    update: vi.fn().mockReturnValue(profileUpdateChain),
  }

  const recentSelectChain = {
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({
      data: options.recentTokens ?? [],
      error: null,
    }),
  }

  const recentQuery = {
    select: vi.fn().mockReturnValue(recentSelectChain),
    upsert: vi.fn().mockResolvedValue({ error: options.recentUpsertError ?? null }),
  }

  const supabase = {
    from: vi.fn((table: string) => {
      if (table === "profiles") return profileSelectChain
      if (table === "recent_tokens") return recentQuery
      throw new Error(`Unexpected table: ${table}`)
    }),
  }

  return { supabase, profileSelectChain, recentQuery }
}

describe("recent tokens route", () => {
  const mint = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"
  const walletAddress = "11111111111111111111111111111111"

  it("rejects unauthenticated writes", async () => {
    mocks.verifyPrivyRequest.mockResolvedValue({
      authenticated: false,
      userId: null,
    })

    const response = await POST(makeRequest("http://localhost/api/recent-tokens", { mint }))

    expect(response.status).toBe(401)
    expect(mocks.getSupabaseAdmin).not.toHaveBeenCalled()
  })

  it("returns a disabled persistence payload when Supabase is unconfigured", async () => {
    mocks.verifyPrivyRequest.mockResolvedValue({
      authenticated: true,
      userId: "user-1",
    })
    mocks.getSupabaseAdmin.mockReturnValue(null)

    const response = await GET(makeRequest("http://localhost/api/recent-tokens"))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      data: {
        items: [],
        configured: false,
      },
      error: null,
    })
  })

  it("returns a persistence error when profile creation fails", async () => {
    const { supabase } = createSupabaseFixture({
      profile: { data: null, error: { message: "profile insert failed" } },
    })
    mocks.verifyPrivyRequest.mockResolvedValue({
      authenticated: true,
      userId: "user-1",
    })
    mocks.getSupabaseAdmin.mockReturnValue(supabase)

    const response = await POST(
      makeRequest("http://localhost/api/recent-tokens", {
        mint,
        walletAddress,
      }),
    )

    expect(response.status).toBe(502)
    await expect(response.json()).resolves.toMatchObject({
      data: null,
      error: {
        code: "persistence_error",
        message: "profile insert failed",
      },
    })
  })

  it("upserts recent tokens when configured", async () => {
    const { supabase, profileSelectChain, recentQuery } = createSupabaseFixture()
    mocks.verifyPrivyRequest.mockResolvedValue({
      authenticated: true,
      userId: "user-1",
    })
    mocks.getSupabaseAdmin.mockReturnValue(supabase)

    const response = await POST(
      makeRequest("http://localhost/api/recent-tokens", {
        mint,
        walletAddress,
      }),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      data: {
        mint,
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
    expect(recentQuery.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        token_mint: mint,
      }),
      { onConflict: "user_id,token_mint" },
    )
  })
})
