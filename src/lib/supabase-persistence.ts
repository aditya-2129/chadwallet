/* eslint-disable @typescript-eslint/no-explicit-any */

function normalizeWalletAddress(walletAddress?: string) {
  const trimmed = walletAddress?.trim()
  return trimmed ? trimmed : undefined
}

export async function ensureProfileExists(
  supabase: any,
  userId: string,
  walletAddress?: string,
): Promise<{ success: boolean; error?: string }> {
  const normalizedWalletAddress = normalizeWalletAddress(walletAddress)

  const { data: profile, error: selectError } = await supabase
    .from("profiles")
    .select("privy_user_id, wallet_address")
    .eq("privy_user_id", userId)
    .maybeSingle()

  if (selectError) {
    return { success: false, error: selectError.message }
  }

  const timestamp = new Date().toISOString()

  if (!profile) {
    const { error: insertError } = await supabase.from("profiles").insert({
      privy_user_id: userId,
      wallet_address: normalizedWalletAddress ?? null,
      updated_at: timestamp,
    })

    if (insertError) {
      return { success: false, error: insertError.message }
    }
  } else if (normalizedWalletAddress && profile.wallet_address !== normalizedWalletAddress) {
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        wallet_address: normalizedWalletAddress,
        updated_at: timestamp,
      })
      .eq("privy_user_id", userId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }
  }

  return { success: true }
}
