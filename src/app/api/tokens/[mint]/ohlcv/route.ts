import { NextRequest } from "next/server";
import { z } from "zod";
import { loadChart } from "@/lib/providers/trading";
import { mintSchema, parseParams, parseQuery, success } from "@/app/api/_utils";

const paramsSchema = z.object({ mint: mintSchema });
const querySchema = z.object({
  interval: z.enum(["1m", "5m", "15m", "1H", "4H", "1D"]).default("15m"),
  limit: z.coerce.number().int().min(20).max(300).default(96),
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ mint: string }> },
) {
  const params = await parseParams(context.params, paramsSchema);
  if (!params.success) return params.response;
  const query = parseQuery(request, querySchema);
  if (!query.success) return query.response;
  return success(
    await loadChart(params.data.mint, query.data.interval, query.data.limit),
  );
}
