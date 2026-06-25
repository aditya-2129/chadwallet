import { afterEach, describe, expect, it } from "vitest"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

afterEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl
  process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey
})

describe("getSupabaseAdmin", () => {
  it("returns null when persistence is unconfigured", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = ""
    process.env.SUPABASE_SERVICE_ROLE_KEY = " "

    expect(getSupabaseAdmin()).toBeNull()
  })

  it("creates a client when both credentials are present", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key"

    expect(getSupabaseAdmin()).not.toBeNull()
  })
})
