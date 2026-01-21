import { NextRequest, NextResponse } from "next/server";
import { BACKEND_BASE_URL } from "@/lib/env";

export async function GET(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  const token = request.cookies.get("access_token")?.value;

  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { provider } = params;

  try {
    const res = await fetch(`${BACKEND_BASE_URL}/api/user/repositories/${provider}/`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return NextResponse.json(
        { message: errorData.message || "Failed to fetch repositories" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);

  } catch (error) {
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
