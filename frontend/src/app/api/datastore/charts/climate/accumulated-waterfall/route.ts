import { NextRequest, NextResponse } from "next/server";
import { ADMIN_UIDKEY } from "@/lib/env";
import { BACKEND_BASE_URL } from "@/lib/env";

export async function GET(request: NextRequest) {
  if (!ADMIN_UIDKEY) {
    return NextResponse.json({ message: "Server not configured" }, { status: 500 });
  }

  const searchParams = request.nextUrl.searchParams;
  const geocode = searchParams.get("geocode");
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  try {
    const res = await fetch(
      `${BACKEND_BASE_URL}/api/datastore/charts/climate/accumulated-waterfall/?geocode=${geocode}&start=${start}&end=${end}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-UID-Key": ADMIN_UIDKEY,
        },
        cache: "no-store",
      }
    );

    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
    });
  } catch (err) {
    console.error("proxy error", err);
    return NextResponse.json({ message: "Upstream request failed" }, { status: 502 });
  }
}
