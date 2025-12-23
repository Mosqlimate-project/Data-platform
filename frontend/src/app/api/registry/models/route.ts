import { NextResponse } from "next/server";
import { BACKEND_BASE_URL } from "@/lib/api";
import { ADMIN_UIDKEY } from "@/lib/env";

export async function GET() {
  if (!ADMIN_UIDKEY) {
    return NextResponse.json({ message: "Server not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(`${BACKEND_BASE_URL}/api/registry/models/thumbnails/`, {
      headers: {
        "Content-Type": "application/json",
        "X-UID-Key": ADMIN_UIDKEY,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { message: "Upstream error" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);

  } catch (err) {
    console.error("Models proxy error:", err);
    return NextResponse.json({ message: "Upstream request failed" }, { status: 502 });
  }
}
