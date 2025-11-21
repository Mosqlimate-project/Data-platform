import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const data = searchParams.get("data");

  if (!data) {
    return NextResponse.redirect(new URL("/register?error=missing_data", request.url));
  }

  const target = new URL(`/register?data=${encodeURIComponent(data)}`, request.url);
  return NextResponse.redirect(target);
}
