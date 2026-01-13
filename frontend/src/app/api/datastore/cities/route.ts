import { NextRequest, NextResponse } from "next/server";
import { BACKEND_BASE_URL } from "@/lib/api";
import { ADMIN_UIDKEY } from "@/lib/env";

export async function GET(request: NextRequest) {
  if (!ADMIN_UIDKEY) {
    return NextResponse.json({ message: "Server not configured" }, { status: 500 });
  }

  const searchParams = request.nextUrl.searchParams;

  try {
    const upstreamUrl = new URL(`${BACKEND_BASE_URL}/api/datastore/cities/`);

    upstreamUrl.search = searchParams.toString();

    const upstream = await fetch(upstreamUrl.toString(), {
      headers: {
        "Content-Type": "application/json",
        "X-UID-Key": ADMIN_UIDKEY,
      },
      cache: "no-store",
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { message: "Upstream error" },
        { status: upstream.status }
      );
    }

    const data = await upstream.json();
    return NextResponse.json(data);

  } catch (err) {
    console.error("Cities proxy error:", err);
    return NextResponse.json({ message: "Upstream request failed" }, { status: 502 });
  }
}
