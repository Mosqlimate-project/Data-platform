import { NextResponse } from "next/server";

export function setTokens(
  res: NextResponse,
  {
    accessToken,
    refreshToken,
  }: { accessToken: string; refreshToken: string }
) {
  const isProd = process.env.NODE_ENV === "production";

  console.log(`--------------------> ${accessToken}`)
  console.log(refreshToken)
  res.cookies.set("access_token", accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 30,
  });

  res.cookies.set("refresh_token", refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}
