import { NextResponse } from "next/server";
import { BACKEND_BASE_URL } from "@/lib/env";
import { cookies } from "next/headers";

export async function GET(
  request: Request,
  { params }: { params: { predict_id: string } }
) {
  const { predict_id } = params;
  const ADMIN_UIDKEY = process.env.ADMIN_UIDKEY;

  if (!ADMIN_UIDKEY) {
    return NextResponse.json({ message: "Server not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(`${BACKEND_BASE_URL}/api/registry/predictions/${predict_id}/`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-UID-Key": ADMIN_UIDKEY,
      },
    });

    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("GET proxy error:", err);
    return NextResponse.json({ message: "Upstream request failed" }, { status: 502 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { predict_id: string } }
) {
  const { predict_id } = params;
  const cookieStore = cookies();

  const accessToken = cookieStore.get("access_token")?.value;
  const sessionId = cookieStore.get("sessionid")?.value;

  if (!accessToken && !sessionId) {
    return NextResponse.json({ message: "Unauthorized: No tokens found" }, { status: 401 });
  }

  const authHeaders: HeadersInit = {};
  if (accessToken) authHeaders["Authorization"] = `Bearer ${accessToken}`;
  if (sessionId) authHeaders["Cookie"] = `sessionid=${sessionId}`;

  try {
    const keyRes = await fetch(`${BACKEND_BASE_URL}/api/user/api-key/`, {
      method: "GET",
      headers: authHeaders,
    });

    if (!keyRes.ok) {
      return NextResponse.json({ message: "Failed to retrieve API Key" }, { status: keyRes.status });
    }

    const { api_key } = await keyRes.json();

    const res = await fetch(`${BACKEND_BASE_URL}/api/registry/predictions/${predict_id}/`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "X-UID-Key": api_key,
      },
    });

    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("DELETE proxy error:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
