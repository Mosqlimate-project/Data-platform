import { NextRequest, NextResponse } from "next/server";
import { BACKEND_BASE_URL } from "@/lib/env";
import { ADMIN_UIDKEY } from "@/lib/env";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = new URLSearchParams();
  const params = ["category", "adm_level"];

  params.forEach((key) => {
    const value = searchParams.get(key);
    if (value) {
      query.append(key, value);
    }
  });

  try {
    const res = await fetch(
      `${BACKEND_BASE_URL}/api/vis/dashboard/diseases/?${query.toString()}`,
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
        { error: "Failed to fetch diseases" },
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
