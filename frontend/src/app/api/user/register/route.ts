import { BACKEND_BASE_URL } from "@/lib/env";
import { NextResponse } from "next/server";
import { setTokens } from "@/app/api/auth/setCookies";

export async function POST(req: Request) {
  const form = await req.formData();

  const body = {
    username: form.get("username"),
    password: form.get("password"),
    email: form.get("email"),
    first_name: form.get("first_name"),
    last_name: form.get("last_name"),
    homepage_url: form.get("homepage_url"),
    oauth_data: form.get("oauth_data") || null,
  };

  const res = await fetch(`${BACKEND_BASE_URL}/api/user/register/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return new NextResponse(await res.text(), { status: res.status });
  }

  const data = await res.json();

  const response = NextResponse.json({ ok: true });

  setTokens(response, {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  });

  return response;
}
