import { BACKEND_BASE_URL } from "@/lib/env";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get("access_token")?.value;
  const sessionId = request.cookies.get("sessionid")?.value;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  if (sessionId) {
    headers["Cookie"] = `sessionid=${sessionId}`;
  }

  try {
    const res = await fetch(`${BACKEND_BASE_URL}/api/session_key/`, {
      method: "GET",
      headers: headers,
      cache: "no-store",
    });

    const body = await res.text();

    const response = new NextResponse(body, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("Content-Type") || "application/json",
      },
    });

    const setCookieHeader = res.headers.get("set-cookie");
    if (setCookieHeader) {
      response.headers.set("Set-Cookie", setCookieHeader);
    }

    return response;

  } catch (err) {
    console.error("proxy error", err);
    return NextResponse.json(
      { message: "Upstream request failed" },
      { status: 502 }
    );
  }
}
