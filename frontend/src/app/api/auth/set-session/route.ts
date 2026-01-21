import { NextRequest, NextResponse } from "next/server";
import { setTokens } from "@/app/api/auth/setCookies";
import { BACKEND_BASE_URL } from "@/lib/env";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const res = await fetch(`${BACKEND_BASE_URL}/api/user/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const data = await res.json();

  const response = NextResponse.json({ ok: true });
  setTokens(response, {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  });

  return response;
}
