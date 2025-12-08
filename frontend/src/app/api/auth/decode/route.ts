import { NextRequest, NextResponse } from "next/server";
import { BACKEND_BASE_URL } from "@/lib/api";

export async function GET(req: NextRequest) {
  const data = req.nextUrl.searchParams.get("data");

  if (!data) {
    return NextResponse.json({ message: "Missing data parameter" }, { status: 400 });
  }

  try {
    const res = await fetch(`${BACKEND_BASE_URL}/api/user/oauth/decode/?data=${encodeURIComponent(data)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ message: "Invalid or expired token" }, { status: 400 });
    }

    const decoded = await res.json();
    return NextResponse.json(decoded, { status: 200 });

  } catch (error) {
    console.error("Decode Proxy Error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
