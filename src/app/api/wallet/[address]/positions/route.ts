import { NextRequest } from "next/server";
import { z } from "zod";
import { loadPosition } from "@/lib/providers/trading";
import {
  addressSchema,
  mintSchema,
  parseParams,
  parseQuery,
  success,
} from "@/app/api/_utils";
import { DEFAULT_TOKEN_MINT } from "@/lib/mock-data";

const paramsSchema = z.object({ address: addressSchema });
const querySchema = z.object({ mint: mintSchema.optional() });

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ address: string }> },
) {
  const params = await parseParams(context.params, paramsSchema);
  if (!params.success) return params.response;
  const query = parseQuery(request, querySchema);
  if (!query.success) return query.response;
  return success(
    await loadPosition(
      params.data.address,
      query.data.mint ?? DEFAULT_TOKEN_MINT,
    ),
  );
}
