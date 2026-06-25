import { NextRequest } from "next/server"
import { z } from "zod"
import { submitExecution } from "@/lib/providers/trading"
import { failure, parseBody, success } from "@/app/api/_utils"
import { verifyPrivyRequest } from "@/lib/server-auth"

const bodySchema = z.object({
  requestId: z.string().min(6),
  signedTransaction: z.string().min(20),
  lastValidBlockHeight: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const auth = await verifyPrivyRequest(request)
  if (!auth.authenticated) {
    return failure("unauthorized", "Sign in with Privy before executing a swap.", 401)
  }

  const parsed = await parseBody(request, bodySchema)
  if (!parsed.success) return parsed.response

  try {
    const result = await submitExecution(parsed.data)
    return success({
      result,
      source: "jupiter",
    })
  } catch (error) {
    return failure(
      "execution_disabled",
      error instanceof Error ? error.message : "Execution is unavailable.",
      403,
    )
  }
}
