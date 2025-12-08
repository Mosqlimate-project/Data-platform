import { NextRequest, NextResponse } from "next/server";
import { BACKEND_BASE_URL } from "@/lib/api";

export async function GET(
  req: NextRequest,
  { params }: { params: { provider: string } }
) {
  const next = req.nextUrl.searchParams.get("next") || "/";

  const accessToken = req.cookies.get("access_token")?.value;

  if (!accessToken) {
    const returnTo = next || "/";
    const response = NextResponse.redirect(new URL(returnTo, req.url));

    response.cookies.set("requires_auth", "true", {
      path: "/",
      maxAge: 10,
      httpOnly: false,
    });

    return response;
  }

  try {
    const res = await fetch(
      `${BACKEND_BASE_URL}/api/user/oauth/install/${params.provider}/?next=${encodeURIComponent(next)}`,
      {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      console.error("Install Init Failed:", await res.text());
      return NextResponse.redirect(new URL("/?error=install_init_failed", req.url));
    }

    const data = await res.json();

    return NextResponse.redirect(new URL(data.url));

  } catch (error) {
    console.error("Install Proxy Error:", error);
    return NextResponse.redirect(new URL("/?error=server_error", req.url));
  }
}
