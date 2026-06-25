import { z } from "zod";
import { loadTokenDetail } from "@/lib/providers/trading";
import { mintSchema, parseParams, success } from "@/app/api/_utils";

const paramsSchema = z.object({ mint: mintSchema });

export async function GET(
  _request: Request,
  context: { params: Promise<{ mint: string }> },
) {
  const parsed = await parseParams(context.params, paramsSchema);
  if (!parsed.success) return parsed.response;
  return success(await loadTokenDetail(parsed.data.mint));
}
