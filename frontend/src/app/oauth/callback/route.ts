import { NextRequest, NextResponse } from "next/server";
import { setTokens } from "@/app/api/auth/setCookies";
import { BACKEND_BASE_URL } from "@/lib/api";

export async function GET(req: NextRequest) {
  const data = req.nextUrl.searchParams.get("data");

  if (!data) {
    return NextResponse.redirect(new URL("/oauth/login?error=missing_data", req.url));
  }

  try {
    const url = `${BACKEND_BASE_URL}/api/user/oauth/decode/?data=${encodeURIComponent(data)}`;

    const r = await fetch(url, {
      method: "GET",
      cache: "no-store",
    });

    if (!r.ok) {
      console.error(`OAuth Decode Failed: ${r.status}`);
      return NextResponse.redirect(new URL("/oauth/login?error=invalid_token", req.url));
    }

    const decoded = await r.json();
    const { access_token, refresh_token, next } = decoded;

    if (!access_token || !refresh_token) {
      console.error("OAuth Error: Missing tokens in backend response");
      return NextResponse.redirect(new URL("/oauth/login?error=missing_tokens", req.url));
    }

    const res = NextResponse.redirect(new URL(next || "/", req.url));

    setTokens(res, {
      accessToken: access_token,
      refreshToken: refresh_token,
    });

    return res;

  } catch (error) {
    console.error("OAuth Route Error:", error);
    return NextResponse.redirect(new URL("/oauth/login?error=server_error", req.url));
  }
}
