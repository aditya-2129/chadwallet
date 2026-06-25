import { NextRequest } from "next/server"
import { z } from "zod"
import { loadQuote } from "@/lib/providers/trading"
import { failure, mintSchema, parseBody, success } from "@/app/api/_utils"
import { JupiterError } from "@/lib/providers/jupiter"

const bodySchema = z.object({
  inputMint: mintSchema,
  outputMint: mintSchema,
  amountUi: z.coerce.number().positive().max(1_000_000),
  slippageBps: z.coerce.number().int().min(5).max(2_000).default(100),
})

export async function POST(request: NextRequest) {
  const parsed = await parseBody(request, bodySchema)
  if (!parsed.success) return parsed.response

  try {
    const data = await loadQuote(parsed.data)
    return success(data)
  } catch (error) {
    console.error("API quote route failed:", error)
    if (error instanceof JupiterError) {
      return failure(error.code, error.message, error.status)
    }
    return failure("provider_unavailable", error instanceof Error ? error.message : "Provider failed", 502)
  }
}
