import { NextResponse, type NextRequest } from "next/server";
import { verifyUser } from "@/app/api/auth/verify";
import { FRONTEND_PREFIX } from "./lib/env";

const publicPaths = [
  "/oauth/login",
  "/oauth/register",
  "/oauth/callback",
  "/api/auth",
  "/api/me",
  "/api/session-key",
  "/api/user/register",
  "/api/user/check-username",
  "/api/user/check-email",
  "/api/registry/models",
  "/api/registry/model",
  "/api/registry/predictions",
  "/api/users/api-key",
  "/api/datastore/charts",
  "/api/datastore/cities",
  "/api/maps/cities",
  "/api/vis/dashboard",
  "/models",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-internal-secret", process.env.FRONTEND_SECRET || "");

  const isPublic =
    pathname === FRONTEND_PREFIX ||
    pathname === "/" ||
    publicPaths.some((path) => pathname.startsWith(path));

  if (isPublic) {
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  const user = await verifyUser(request);

  if (!user) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  if (user.headers) {
    const setCookieValue = user.headers.get("set-cookie");
    if (setCookieValue) {
      response.headers.append("set-cookie", setCookieValue);
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
