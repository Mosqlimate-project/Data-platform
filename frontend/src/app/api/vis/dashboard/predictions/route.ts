import { NextRequest, NextResponse } from "next/server";
import { BACKEND_BASE_URL, FRONTEND_SECRET, ADMIN_UIDKEY } from "@/lib/env";

export async function GET(request: NextRequest) {
  const secret = request.headers.get("x-internal-secret")
  const searchParams = request.nextUrl.searchParams;
  const query = new URLSearchParams();
  const params = ["case_definition", "sprint", "category", "adm_level", "disease", "country", "state", "city"];

  if (!FRONTEND_SECRET || secret !== FRONTEND_SECRET) {
    return NextResponse.json({ message: "Unauthorized [f]" }, { status: 401 });
  }

  params.forEach((key) => {
    const values = searchParams.getAll(key);
    values.forEach((value) => {
      if (value) {
        query.append(key, value);
      }
    });
  });

  try {
    const res = await fetch(
      `${BACKEND_BASE_URL}/api/vis/dashboard/predictions/?${query.toString()}`,
      {
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "X-UID-Key": ADMIN_UIDKEY,
        },
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch predictions" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
