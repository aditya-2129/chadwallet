import { NextRequest } from "next/server"
import { z } from "zod"
import { loadMarket } from "@/lib/providers/trading"
import { parseQuery, success } from "@/app/api/_utils"

const querySchema = z.object({
  q: z.string().trim().max(64).optional().default(""),
  limit: z.coerce.number().int().min(1).max(24).optional().default(12),
})

export async function GET(request: NextRequest) {
  const parsed = parseQuery(request, querySchema)
  if (!parsed.success) return parsed.response

  const data = await loadMarket(parsed.data.q, parsed.data.limit)
  return success(data)
}
