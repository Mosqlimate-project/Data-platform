import { NextRequest, NextResponse } from "next/server";
import { setTokens } from "@/app/api/auth/setCookies";

export async function GET(req: NextRequest) {
  const data = req.nextUrl.searchParams.get("data");

  if (!data) {
    return NextResponse.redirect(new URL("/oauth/login?error=missing_data", req.url));
  }

  const decodeToken = new URL("/api/auth/decode", req.url);
  decodeToken.searchParams.set("data", data);

  try {
    const r = await fetch(decodeToken, { cache: "no-store" });

    if (!r.ok) {
      return NextResponse.redirect(new URL("/oauth/login?error=invalid_token", req.url));
    }

    const decoded = await r.json();
    const { access_token, refresh_token, next } = decoded;

    if (!access_token || !refresh_token) {
      return NextResponse.redirect(new URL("/oauth/login?error=missing_tokens", req.url));
    }

    const destination = next || "/";
    const res = NextResponse.redirect(new URL(destination, req.url));

    setTokens(res, {
      accessToken: access_token,
      refreshToken: refresh_token,
    });

    return res;

  } catch (error) {
    console.error("Callback Error:", error);
    return NextResponse.redirect(new URL("/oauth/login?error=server_error", req.url));
  }
}
