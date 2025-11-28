import { NextRequest, NextResponse } from "next/server";
import { setTokens } from "@/app/api/_auth/setCookies";

export async function GET(req: NextRequest) {
  const access = req.nextUrl.searchParams.get("access_token");
  const refresh = req.nextUrl.searchParams.get("refresh_token");

  if (!access || !refresh) {
    return NextResponse.json(
      { message: "Missing OAuth tokens" },
      { status: 400 }
    );
  }

  const res = NextResponse.redirect(new URL("/", req.url));

  setTokens(res, {
    accessToken: access,
    refreshToken: refresh,
  });

  return res;
}
