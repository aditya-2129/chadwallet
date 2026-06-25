import { NextRequest } from "next/server"
import { z } from "zod"
import {
  addressSchema,
  failure,
  mintSchema,
  parseBody,
  success,
} from "@/app/api/_utils"
import { verifyPrivyRequest } from "@/lib/server-auth"
import { ensureProfileExists } from "@/lib/supabase-persistence"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

const bodySchema = z.object({
  mint: mintSchema,
  walletAddress: addressSchema.optional(),
})

export async function GET(request: NextRequest) {
  const auth = await verifyPrivyRequest(request)
  if (!auth.authenticated || !auth.userId) {
    return failure("unauthorized", "Sign in to view recent tokens.", 401)
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) return success({ items: [], configured: false })

  const { data, error } = await supabase
    .from("recent_tokens")
    .select("token_mint,last_viewed_at")
    .eq("user_id", auth.userId)
    .order("last_viewed_at", { ascending: false })
    .limit(20)

  if (error) return failure("persistence_error", error.message, 502)
  return success({ items: data ?? [], configured: true })
}

export async function POST(request: NextRequest) {
  const auth = await verifyPrivyRequest(request)
  if (!auth.authenticated || !auth.userId) {
    return failure("unauthorized", "Sign in to save recent tokens.", 401)
  }

  const parsed = await parseBody(request, bodySchema)
  if (!parsed.success) return parsed.response

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    return success({ mint: parsed.data.mint, configured: false })
  }

  // Ensure user profile exists prior to inserting recent token (prevents foreign key errors)
  const profileStatus = await ensureProfileExists(supabase, auth.userId, parsed.data.walletAddress)
  if (!profileStatus.success) {
    return failure("persistence_error", profileStatus.error || "Failed to sync user profile", 502)
  }

  const { error } = await supabase.from("recent_tokens").upsert(
    {
      user_id: auth.userId,
      token_mint: parsed.data.mint,
      last_viewed_at: new Date().toISOString(),
    },
    { onConflict: "user_id,token_mint" },
  )

  if (error) return failure("persistence_error", error.message, 502)
  return success({ mint: parsed.data.mint, configured: true })
}
