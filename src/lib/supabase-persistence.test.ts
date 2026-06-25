import { describe, expect, it, vi } from "vitest"
import { ensureProfileExists } from "@/lib/supabase-persistence"

function createSupabaseFixture(options: {
  profile?: { data: { wallet_address: string | null } | null; error: { message: string } | null }
  insertError?: { message: string } | null
  updateError?: { message: string } | null
} = {}) {
  const profile = options.profile ?? { data: null, error: null }
  const updateChain = {
    eq: vi.fn().mockResolvedValue({ error: options.updateError ?? null }),
  }
  const profileQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(profile),
    insert: vi.fn().mockResolvedValue({ error: options.insertError ?? null }),
    update: vi.fn().mockReturnValue(updateChain),
  }
  const supabase = {
    from: vi.fn().mockReturnValue(profileQuery),
  }

  return { supabase, profileQuery, updateChain }
}

describe("ensureProfileExists", () => {
  it("creates a profile when one does not exist", async () => {
    const { supabase, profileQuery } = createSupabaseFixture()

    await expect(ensureProfileExists(supabase, "user-1", "  wallet-1  ")).resolves.toEqual({
      success: true,
    })

    expect(profileQuery.insert).toHaveBeenCalledWith({
      privy_user_id: "user-1",
      wallet_address: "wallet-1",
      updated_at: expect.any(String),
    })
  })

  it("updates an existing profile when the wallet address changes", async () => {
    const { supabase, profileQuery, updateChain } = createSupabaseFixture({
      profile: { data: { wallet_address: "old-wallet" }, error: null },
    })

    await expect(ensureProfileExists(supabase, "user-1", "new-wallet")).resolves.toEqual({
      success: true,
    })

    expect(profileQuery.insert).not.toHaveBeenCalled()
    expect(profileQuery.update).toHaveBeenCalledWith({
      wallet_address: "new-wallet",
      updated_at: expect.any(String),
    })
    expect(updateChain.eq).toHaveBeenCalledWith("privy_user_id", "user-1")
  })

  it("does not update the profile when the wallet address is unchanged", async () => {
    const { supabase, profileQuery } = createSupabaseFixture({
      profile: { data: { wallet_address: "same-wallet" }, error: null },
    })

    await expect(ensureProfileExists(supabase, "user-1", "same-wallet")).resolves.toEqual({
      success: true,
    })

    expect(profileQuery.insert).not.toHaveBeenCalled()
    expect(profileQuery.update).not.toHaveBeenCalled()
  })

  it("surfaces lookup errors", async () => {
    const { supabase } = createSupabaseFixture({
      profile: { data: null, error: { message: "lookup failed" } },
    })

    await expect(ensureProfileExists(supabase, "user-1")).resolves.toEqual({
      success: false,
      error: "lookup failed",
    })
  })
})
