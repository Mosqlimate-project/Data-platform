import { NextRequest, NextResponse } from "next/server";
import { BACKEND_BASE_URL } from "@/lib/api";

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username");

  if (!username) {
    return NextResponse.json(
      { message: "Missing username parameter" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(
      `${BACKEND_BASE_URL}/api/user/check-username/?username=${encodeURIComponent(
        username
      )}`,
      { cache: "no-store" }
    );

    if (!res.ok) {
      return NextResponse.json(
        { message: "Backend error" },
        { status: 500 }
      );
    }

    const { available } = await res.json();

    if (!available) {
      return NextResponse.json(
        { message: "Username already taken" },
        { status: 409 }
      );
    }

    return NextResponse.json({ available: true }, { status: 200 });
  } catch (err) {
    console.error("check-username proxy error:", err);

    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
