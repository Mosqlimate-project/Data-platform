import { NextResponse, type NextRequest } from "next/server";
import { verifyUser } from "@/app/api/auth/verify";

const publicPaths = [
  "/oauth/login",
  "/oauth/register",
  "/oauth/callback",
  "/api/auth",
  "/api/me",
  "/_next",
  "/favicon.ico",
  "/public",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic =
    pathname === "/" ||
    publicPaths.some((path) => pathname.startsWith(path));

  if (isPublic) {
    return NextResponse.next();
  }

  const user = await verifyUser(request);

  if (!user) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  const response = NextResponse.next();

  if (user.headers) {
    const setCookie = user.headers.get("set-cookie");
    if (setCookie) {
      response.headers.set("set-cookie", setCookie);
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
