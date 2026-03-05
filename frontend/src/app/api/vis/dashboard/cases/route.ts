import { NextRequest, NextResponse } from "next/server";
import { BACKEND_BASE_URL, FRONTEND_SECRET, ADMIN_UIDKEY } from "@/lib/env";

export async function GET(request: NextRequest) {
  const secret = request.headers.get("x-internal-secret")
  const searchParams = request.nextUrl.searchParams;
  const query = new URLSearchParams();

  if (!FRONTEND_SECRET || secret !== FRONTEND_SECRET) {
    return NextResponse.json({ message: "Unauthorized [f]" }, { status: 401 });
  }

  const params = [
    "sprint",
    "case_definition",
    "disease",
    "start",
    "end",
    "adm_level",
    "adm_1",
    "adm_2",
  ];

  params.forEach((key) => {
    const value = searchParams.get(key);
    if (value !== null && value !== "") {
      query.append(key, value);
    }
  });

  try {
    const url = `${BACKEND_BASE_URL}/api/vis/dashboard/cases/?${query.toString()}`;

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        "X-UID-Key": ADMIN_UIDKEY,
      },
      cache: "no-store"
    });

    if (!response.ok) {
      const errorDetails = await response.json().catch(() => null);
      return NextResponse.json(
        { error: "Failed to fetch data from backend", details: errorDetails },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
