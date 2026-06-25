import { NextRequest } from "next/server"
import { z } from "zod"
import { loadHolders } from "@/lib/providers/trading"
import { mintSchema, parseParams, parseQuery, success } from "@/app/api/_utils"

const paramsSchema = z.object({
  mint: mintSchema,
})

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(25).optional().default(12),
})

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ mint: string }> },
) {
  const route = await parseParams(context.params, paramsSchema)
  if (!route.success) return route.response

  const query = parseQuery(request, querySchema)
  if (!query.success) return query.response

  const data = await loadHolders(route.data.mint, query.data.limit)
  return success(data)
}
