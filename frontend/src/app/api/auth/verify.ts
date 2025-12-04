import { NextRequest } from "next/server";
import { parseToken } from "./parseToken";
import { FRONTEND_URL } from "@/lib/env";

export type VerifyResult = {
  user: any;
  headers?: Headers;
} | null;

export async function verifyUser(req: NextRequest): Promise<VerifyResult> {
  const accessToken = req.cookies.get("access_token")?.value;
  const refreshToken = req.cookies.get("refresh_token")?.value;

  if (accessToken) {
    const user = await parseToken(accessToken);
    if (user) return { user };
  }

  if (!refreshToken) return null;

  try {
    const res = await fetch(`${FRONTEND_URL}/api/auth/refresh`, {
      method: "GET",
      headers: {
        Cookie: `refresh_token=${refreshToken}`,
      },
      cache: "no-store",
    });

    if (!res.ok) return null;

    const data = await res.json();
    const userRefresh = await parseToken(data.access_token);

    if (!userRefresh) return null;

    const newHeaders = new Headers();
    const setCookieHeader = res.headers.get("set-cookie");
    if (setCookieHeader) {
      newHeaders.set("set-cookie", setCookieHeader);
    }

    return {
      user: userRefresh,
      headers: newHeaders
    };

  } catch (error) {
    console.error("Middleware refresh error:", error);
    return null;
  }
}
