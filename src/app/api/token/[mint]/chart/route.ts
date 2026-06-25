import { NextRequest } from "next/server"
import { z } from "zod"
import { loadChart } from "@/lib/providers/trading"
import { mintSchema, parseParams, parseQuery, success } from "@/app/api/_utils"

const paramsSchema = z.object({
  mint: mintSchema,
})

const querySchema = z.object({
  interval: z
    .enum(["1m", "5m", "15m", "1H", "4H", "1D"])
    .optional()
    .default("15m"),
  limit: z.coerce.number().int().min(12).max(240).optional().default(96),
})

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ mint: string }> },
) {
  const route = await parseParams(context.params, paramsSchema)
  if (!route.success) return route.response

  const query = parseQuery(request, querySchema)
  if (!query.success) return query.response

  const data = await loadChart(
    route.data.mint,
    query.data.interval,
    query.data.limit,
  )
  return success(data)
}
