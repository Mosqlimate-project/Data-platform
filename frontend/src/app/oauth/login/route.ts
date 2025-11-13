import { NextRequest, NextResponse } from "next/server";
import { oauthDecode } from "@/lib/api/auth";

export async function GET(req: NextRequest) {
  const data = req.nextUrl.searchParams.get("data");

  if (!data) {
    return NextResponse.json({ message: "Missing data" }, { status: 400 });
  }

  const res = await oauthDecode(data);

  if (res.access_token && res.refresh_token) {
    const redirectUrl = new URL("/", req.url);
    redirectUrl.hash = `access_token=${res.access_token}&refresh_token=${res.refresh_token}`;
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.json({ message: "Unexpected OAuth response" }, { status: 400 });
}
