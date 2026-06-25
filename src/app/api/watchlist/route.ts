import { NextRequest } from "next/server"
import { z } from "zod"
import {
  addressSchema,
  failure,
  mintSchema,
  parseBody,
  parseQuery,
  success,
} from "@/app/api/_utils"
import { verifyPrivyRequest } from "@/lib/server-auth"
import { ensureProfileExists } from "@/lib/supabase-persistence"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

const bodySchema = z.object({
  mint: mintSchema,
  walletAddress: addressSchema.optional(),
})
const querySchema = z.object({ mint: mintSchema })

export async function GET(request: NextRequest) {
  const auth = await verifyPrivyRequest(request)
  if (!auth.authenticated || !auth.userId) {
    return failure("unauthorized", "Sign in to view your watchlist.", 401)
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) return success({ items: [], configured: false })

  const { data, error } = await supabase
    .from("watchlist_items")
    .select("token_mint")
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false })

  if (error) return failure("persistence_error", error.message, 502)
  return success({
    items: (data ?? []).map((item) => item.token_mint),
    configured: true,
  })
}

export async function POST(request: NextRequest) {
  const auth = await verifyPrivyRequest(request)
  if (!auth.authenticated || !auth.userId) {
    return failure("unauthorized", "Sign in to update your watchlist.", 401)
  }

  const parsed = await parseBody(request, bodySchema)
  if (!parsed.success) return parsed.response

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    return success({ mint: parsed.data.mint, watched: true, configured: false })
  }

  // Ensure user profile exists prior to inserting watchlist item (prevents foreign key errors)
  const profileStatus = await ensureProfileExists(supabase, auth.userId, parsed.data.walletAddress)
  if (!profileStatus.success) {
    return failure("persistence_error", profileStatus.error || "Failed to sync user profile", 502)
  }

  const { error } = await supabase.from("watchlist_items").upsert(
    {
      user_id: auth.userId,
      token_mint: parsed.data.mint,
    },
    { onConflict: "user_id,token_mint" },
  )

  if (error) return failure("persistence_error", error.message, 502)
  return success({ mint: parsed.data.mint, watched: true, configured: true })
}

export async function DELETE(request: NextRequest) {
  const auth = await verifyPrivyRequest(request)
  if (!auth.authenticated || !auth.userId) {
    return failure("unauthorized", "Sign in to update your watchlist.", 401)
  }

  const parsed = parseQuery(request, querySchema)
  if (!parsed.success) return parsed.response

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    return success({ mint: parsed.data.mint, watched: false, configured: false })
  }

  const { error } = await supabase
    .from("watchlist_items")
    .delete()
    .eq("user_id", auth.userId)
    .eq("token_mint", parsed.data.mint)

  if (error) return failure("persistence_error", error.message, 502)
  return success({ mint: parsed.data.mint, watched: false, configured: true })
}
