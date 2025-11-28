import { NextRequest, NextResponse } from "next/server";
import { BACKEND_BASE_URL } from "@/lib/api";
import { setTokens } from "./setCookies";

export async function GET(req: NextRequest) {
  const refresh = req.cookies.get("refresh_token")?.value;
  if (!refresh) return NextResponse.json({ ok: false }, { status: 401 });

  const res = await fetch(`${BACKEND_BASE_URL}/api/user/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });

  if (!res.ok) return NextResponse.json({ ok: false }, { status: 401 });

  const data = await res.json();

  const response = NextResponse.json(
    { access_token: data.access_token },
    { status: 200 }
  );

  setTokens(response, {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  });

  return response;
}
