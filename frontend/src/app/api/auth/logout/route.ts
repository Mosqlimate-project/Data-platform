import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });

  const isProd = process.env.NODE_ENV === "production";

  const cookieOptions = {
    path: "/",
    maxAge: 0,
    expires: new Date(0),
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    domain: isProd ? ".mosqlimate.org" : undefined,
  };

  response.cookies.set("access_token", "", cookieOptions);
  response.cookies.set("refresh_token", "", cookieOptions);

  return response;
}
