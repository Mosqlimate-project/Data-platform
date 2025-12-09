import { NextRequest, NextResponse } from "next/server";
import { BACKEND_BASE_URL } from "@/lib/api";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");

  if (!email) {
    return NextResponse.json(
      { message: "Missing email parameter" },
      { status: 400 }
    );
  }

  const res = await fetch(
    `${BACKEND_BASE_URL}/api/user/check-email/?email=${encodeURIComponent(email)}`,
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
      { message: "Email already registered" },
      { status: 409 }
    );
  }

  return NextResponse.json({ available: true }, { status: 200 });
}
