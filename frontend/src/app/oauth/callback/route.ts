import { NextRequest, NextResponse } from "next/server";
import { setTokens } from "@/app/api/auth/setCookies";
import { NEXT_PUBLIC_FRONTEND_URL, BACKEND_BASE_URL } from "@/lib/env";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const data = searchParams.get("data");

  if (!data) {
    return NextResponse.redirect(new URL("/oauth/login?error=missing_data", NEXT_PUBLIC_FRONTEND_URL));
  }

  const internalFetchUrl = `${BACKEND_BASE_URL}/api/user/oauth/decode/?data=${encodeURIComponent(data)}`;

  try {
    const r = await fetch(internalFetchUrl, {
      cache: "no-store",
      headers: { "Accept": "application/json" }
    });

    if (!r.ok) {
      console.error("Backend decode failed in OAuth Callback");
      return NextResponse.redirect(new URL("/oauth/login?error=invalid_token", NEXT_PUBLIC_FRONTEND_URL));
    }

    const decoded = await r.json();
    const { access_token, refresh_token, next } = decoded;

    if (!access_token || !refresh_token) {
      return NextResponse.redirect(new URL("/oauth/login?error=missing_tokens", NEXT_PUBLIC_FRONTEND_URL));
    }

    const destination = next || "/";
    const redirectUrl = new URL(destination, NEXT_PUBLIC_FRONTEND_URL);

    const res = NextResponse.redirect(redirectUrl);

    setTokens(res, {
      accessToken: access_token,
      refreshToken: refresh_token,
    });

    return res;

  } catch (error) {
    console.error("OAuth Callback Error:", error);
    return NextResponse.redirect(new URL("/oauth/login?error=server_error", NEXT_PUBLIC_FRONTEND_URL));
  }
}
