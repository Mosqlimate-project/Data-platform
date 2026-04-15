import { NextRequest, NextResponse } from "next/server";
import { ADMIN_UIDKEY, BACKEND_BASE_URL, FRONTEND_SECRET } from "@/lib/env";

export async function GET(request: NextRequest) {
  const secret = request.headers.get("x-internal-secret");

  if (!ADMIN_UIDKEY) {
    return NextResponse.json({ message: "Server not configured" }, { status: 500 });
  }

  if (!FRONTEND_SECRET || secret !== FRONTEND_SECRET) {
    return NextResponse.json({ message: "Unauthorized [f]" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const disease = searchParams.get("disease");
  const uf = searchParams.get("uf");
  const year = searchParams.get("year");

  if (!disease || !uf) {
    return NextResponse.json({ message: "Missing required parameters: disease and uf" }, { status: 400 });
  }

  const backendUrl = new URL(`${BACKEND_BASE_URL}/api/datastore/episcanner/`);
  backendUrl.searchParams.set("disease", disease);
  backendUrl.searchParams.set("uf", uf);
  if (year) backendUrl.searchParams.set("year", year);

  try {
    const res = await fetch(backendUrl.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-UID-Key": ADMIN_UIDKEY,
      },
      cache: "no-store",
    });

    const body = await res.text();

    return new NextResponse(body, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("Content-Type") || "application/json"
      },
    });
  } catch (err) {
    console.error("Proxy error for episcanner:", err);
    return NextResponse.json({ message: "Upstream request failed" }, { status: 502 });
  }
}
