import { NextRequest } from "next/server"
import { z } from "zod"
import { loadOrder } from "@/lib/providers/trading"
import { addressSchema, mintSchema, parseBody, success } from "@/app/api/_utils"
import { failure } from "@/app/api/_utils"
import { verifyPrivyRequest } from "@/lib/server-auth"
import { JupiterError } from "@/lib/providers/jupiter"

const bodySchema = z.object({
  inputMint: mintSchema,
  outputMint: mintSchema,
  amountUi: z.coerce.number().positive().max(1_000_000),
  slippageBps: z.coerce.number().int().min(5).max(2_000).default(100),
  taker: addressSchema,
})

export async function POST(request: NextRequest) {
  const auth = await verifyPrivyRequest(request)
  if (!auth.authenticated) {
    return failure("unauthorized", "Sign in with Privy before building an order.", 401)
  }

  const parsed = await parseBody(request, bodySchema)
  if (!parsed.success) return parsed.response

  try {
    const data = await loadOrder(parsed.data)
    return success(data)
  } catch (error) {
    console.error("API order route failed:", error)
    if (error instanceof JupiterError) {
      return failure(error.code, error.message, error.status)
    }
    return failure("provider_unavailable", error instanceof Error ? error.message : "Provider failed", 502)
  }
}
