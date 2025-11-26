import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const access = req.cookies.get("access_token");
  const refresh = req.cookies.get("refresh_token");

  const res = NextResponse.next();

  if (!access && !refresh) {
    res.cookies.set("requires_auth", "1", { path: "/" });
  } else {
    res.cookies.delete("requires_auth");
  }

  return res;
}

export const config = {
  matcher: ["/profile/:path*"],
};
