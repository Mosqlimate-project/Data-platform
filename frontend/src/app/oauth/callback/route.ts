import { NextRequest, NextResponse } from "next/server";
import { setTokens } from "@/app/api/auth/setCookies";
import { FRONTEND_URL, FRONTEND_PORT } from "@/lib/env";

export async function GET(req: NextRequest) {
  const data = req.nextUrl.searchParams.get("data");

  if (!data) {
    return NextResponse.redirect(new URL("/oauth/login?error=missing_data", FRONTEND_URL));
  }

  const internalFetchUrl = `http://frontend:${FRONTEND_PORT}/api/auth/decode?data=${encodeURIComponent(data)}`;

  try {
    const r = await fetch(internalFetchUrl, { cache: "no-store" });

    if (!r.ok) {
      return NextResponse.redirect(new URL("/oauth/login?error=invalid_token", FRONTEND_URL));
    }

    const decoded = await r.json();
    const { access_token, refresh_token, next } = decoded;

    if (!access_token || !refresh_token) {
      return NextResponse.redirect(new URL("/oauth/login?error=missing_tokens", FRONTEND_URL));
    }

    const destination = next || "/";
    const res = NextResponse.redirect(new URL(destination, FRONTEND_URL));

    setTokens(res, {
      accessToken: access_token,
      refreshToken: refresh_token,
    });

    return res;

  } catch (error) {
    console.error("Callback Error:", error);
    return NextResponse.redirect(new URL("/oauth/login?error=server_error", FRONTEND_URL));
  }
}
