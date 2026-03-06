import { JWT_TOKEN_EXPIRE_MINUTES, JWT_REFRESH_TOKEN_EXPIRE_DAYS } from "@/lib/env";
import { NextResponse } from "next/server";

const ACCESS_MAX_AGE = 60 * JWT_TOKEN_EXPIRE_MINUTES;
const REFRESH_MAX_AGE = 60 * 60 * 24 * JWT_REFRESH_TOKEN_EXPIRE_DAYS;

export function setTokens(
  res: NextResponse,
  {
    accessToken,
    refreshToken,
  }: { accessToken: string; refreshToken: string }
) {
  const isProd = process.env.NODE_ENV === "production";

  const commonOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    domain: isProd ? ".mosqlimate.org" : undefined,
  };

  res.cookies.set("access_token", accessToken, {
    ...commonOptions,
    maxAge: ACCESS_MAX_AGE,
  });

  res.cookies.set("refresh_token", refreshToken, {
    ...commonOptions,
    maxAge: REFRESH_MAX_AGE,
  });
}
