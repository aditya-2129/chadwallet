import { NextRequest } from "next/server"
import { z } from "zod"
import { loadPosition } from "@/lib/providers/trading"
import {
  addressSchema,
  mintSchema,
  parseParams,
  parseQuery,
  success,
} from "@/app/api/_utils"

const paramsSchema = z.object({
  mint: mintSchema,
})

const querySchema = z.object({
  address: addressSchema,
})

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ mint: string }> },
) {
  const route = await parseParams(context.params, paramsSchema)
  if (!route.success) return route.response

  const query = parseQuery(request, querySchema)
  if (!query.success) return query.response

  const data = await loadPosition(query.data.address, route.data.mint)
  return success(data)
}
