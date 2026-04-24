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

  const { searchParams } = request.nextUrl;

  const ufs = searchParams.getAll("uf");

  const url = new URL(`${BACKEND_BASE_URL}/api/maps/states`);

  if (ufs.length > 0) {
    ufs.forEach(uf => url.searchParams.append("uf", uf));
  }

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-UID-Key": ADMIN_UIDKEY,
      },
      next: { revalidate: 1586400 },
    });

    if (!res.ok) {
      const errorData = await res.text();
      return new NextResponse(errorData, { status: res.status });
    }

    const data = await res.json();

    const formattedFeatures = data.features.map((feature: any) => ({
      ...feature,
      geometry: typeof feature.geometry === "string"
        ? JSON.parse(feature.geometry)
        : feature.geometry,
    }));

    return NextResponse.json({
      type: "FeatureCollection",
      features: formattedFeatures,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
      }
    });
  } catch (err) {
    console.error("Proxy error for state boundaries:", err);
    return NextResponse.json({ message: "Upstream request failed" }, { status: 502 });
  }
}
