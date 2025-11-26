import { NextResponse } from "next/server";
import { BACKEND_BASE_URL } from "@/lib/api";
import { ADMIN_UIDKEY } from "@/lib/env";

export async function GET() {
  if (!ADMIN_UIDKEY) {
    return NextResponse.json({ message: "Server not configured" }, { status: 500 });
  }

  try {
    const upstream = await fetch(`${BACKEND_BASE_URL}/api/registry/models/`, {
      headers: {
        "X-UID-Key": ADMIN_UIDKEY,
      },
      cache: "no-store",
    });

    const data = await upstream.json();
    console.log(data)

    return NextResponse.json(data, { status: upstream.status });
  } catch (err) {
    console.error("proxy error", err);
    return NextResponse.json({ message: "Upstream request failed" }, { status: 502 });
  }
}
