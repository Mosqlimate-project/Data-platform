import { NEXT_PUBLIC_FRONTEND_URL } from "@/lib/env";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const data = searchParams.get("data");

  const target = new URL("/register", NEXT_PUBLIC_FRONTEND_URL);

  if (!data) {
    target.searchParams.set("error", "missing_data");
  } else {
    target.searchParams.set("data", data);
  }

  return NextResponse.redirect(target);
}
