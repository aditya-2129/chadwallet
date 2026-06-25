import { PrivyClient } from "@privy-io/node";
import type { NextRequest } from "next/server";

export async function verifyPrivyRequest(request: NextRequest) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;

  // Credentials are optional in assessment/demo mode.
  if (!appId || !appSecret) {
    return { authenticated: true, demoMode: true, userId: "demo-user" };
  }

  const authorization = request.headers.get("authorization");
  const bearerToken = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : null;
  const token = bearerToken || request.cookies.get("privy-token")?.value;

  if (!token) {
    return { authenticated: false, demoMode: false, userId: null };
  }

  try {
    const client = new PrivyClient({ appId, appSecret });
    const claims = await client.utils().auth().verifyAccessToken(token);
    return {
      authenticated: true,
      demoMode: false,
      userId: claims.user_id,
    };
  } catch {
    return { authenticated: false, demoMode: false, userId: null };
  }
}
