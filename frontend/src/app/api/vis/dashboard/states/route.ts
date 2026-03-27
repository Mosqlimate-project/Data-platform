import { NextRequest, NextResponse } from "next/server";
import { BACKEND_BASE_URL, FRONTEND_SECRET } from "@/lib/env";

export async function GET(request: NextRequest) {
  const secret = request.headers.get("x-internal-secret");
  const token = request.cookies.get("access_token")?.value;

  const searchParams = request.nextUrl.searchParams;
  const query = new URLSearchParams();
  const params = ["sprint", "category", "adm_level", "disease", "country"];

  if (!FRONTEND_SECRET || secret !== FRONTEND_SECRET) {
    return NextResponse.json({ message: "Unauthorized [f]" }, { status: 401 });
  }

  params.forEach((key) => {
    const value = searchParams.get(key);
    if (value) {
      query.append(key, value);
    }
  });

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(
      `${BACKEND_BASE_URL}/api/vis/dashboard/states/?${query.toString()}`,
      {
        cache: "no-store",
        headers: headers,
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch states" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("States proxy error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
