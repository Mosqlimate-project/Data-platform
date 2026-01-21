import { BACKEND_BASE_URL } from "@/lib/env";
import { ADMIN_UIDKEY } from "@/lib/env";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = new URLSearchParams();

  const params = [
    "sprint",
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
