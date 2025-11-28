import { NextRequest, NextResponse } from "next/server";
import { setTokens } from "@/app/api/_auth/setCookies";
import { BACKEND_BASE_URL } from "@/lib/api";

export async function GET(req: NextRequest) {
  const data = req.nextUrl.searchParams.get("data");

  if (!data) {
    return NextResponse.json({ message: "Missing data" }, { status: 400 });
  }

  const url = `${BACKEND_BASE_URL}/api/user/oauth/decode/?data=${encodeURIComponent(data)}`;

  const r = await fetch(url);
  if (!r.ok) {
    return NextResponse.json(
      { message: "Invalid or expired data" },
      { status: 400 }
    );
  }

  const decoded = await r.json();
  const { access_token, refresh_token } = decoded;

  if (!access_token || !refresh_token) {
    return NextResponse.json(
      { message: "Missing OAuth tokens" },
      { status: 400 }
    );
  }

  const res = NextResponse.redirect(new URL("/", req.url));

  setTokens(res, {
    accessToken: access_token,
    refreshToken: refresh_token,
  });

  return res;
}
