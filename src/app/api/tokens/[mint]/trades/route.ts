import { NextRequest } from "next/server";
import { z } from "zod";
import { loadTrades } from "@/lib/providers/trading";
import { mintSchema, parseParams, parseQuery, success } from "@/app/api/_utils";

const paramsSchema = z.object({ mint: mintSchema });
const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(18),
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ mint: string }> },
) {
  const params = await parseParams(context.params, paramsSchema);
  if (!params.success) return params.response;
  const query = parseQuery(request, querySchema);
  if (!query.success) return query.response;
  return success(await loadTrades(params.data.mint, query.data.limit));
}
