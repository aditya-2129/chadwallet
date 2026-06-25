import { NextRequest, NextResponse } from "next/server"
import { z, type ZodType } from "zod"
import bs58 from "bs58"
import type { ApiError, ApiResponse } from "@/lib/types"

const solanaAddressSchema = z
  .string()
  .min(32)
  .max(44)
  .refine((value) => {
    try {
      return bs58.decode(value).length === 32
    } catch {
      return false
    }
  }, "Must be a valid Solana address.")

export const mintSchema = solanaAddressSchema
export const addressSchema = solanaAddressSchema

export function success<T>(data: T, status = 200) {
  return NextResponse.json<ApiResponse<T>>(
    {
      data,
      error: null,
    },
    { status },
  )
}

export function failure(code: string, message: string, status = 400) {
  const error: ApiError = { code, message }

  return NextResponse.json<ApiResponse<null>>(
    {
      data: null,
      error,
    },
    { status },
  )
}

export async function parseBody<T>(
  request: NextRequest,
  schema: ZodType<T>,
): Promise<{ success: true; data: T } | { success: false; response: Response }> {
  try {
    const json = await request.json()
    const parsed = schema.safeParse(json)

    if (!parsed.success) {
      return {
        success: false,
        response: failure("validation_error", z.prettifyError(parsed.error), 400),
      }
    }

    return {
      success: true,
      data: parsed.data,
    }
  } catch {
    return {
      success: false,
      response: failure("invalid_json", "Request body must be valid JSON.", 400),
    }
  }
}

export function parseQuery<T>(
  request: NextRequest,
  schema: ZodType<T>,
): { success: true; data: T } | { success: false; response: Response } {
  const entries = Object.fromEntries(request.nextUrl.searchParams.entries())
  const parsed = schema.safeParse(entries)

  if (!parsed.success) {
    return {
      success: false,
      response: failure("validation_error", z.prettifyError(parsed.error), 400),
    }
  }

  return {
    success: true,
    data: parsed.data,
  }
}

export async function parseParams<T>(
  paramsPromise: Promise<unknown>,
  schema: ZodType<T>,
): Promise<{ success: true; data: T } | { success: false; response: Response }> {
  const resolved = await paramsPromise
  const parsed = schema.safeParse(resolved)

  if (!parsed.success) {
    return {
      success: false,
      response: failure("validation_error", z.prettifyError(parsed.error), 400),
    }
  }

  return {
    success: true,
    data: parsed.data,
  }
}
