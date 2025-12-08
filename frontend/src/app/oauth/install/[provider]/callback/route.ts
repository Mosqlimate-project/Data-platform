import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { provider: string } }
) {
  const data = req.nextUrl.searchParams.get("data");

  if (!data) {
    return NextResponse.redirect(new URL("/?error=missing_data", req.url));
  }

  try {
    const decodeToken = new URL("/api/auth/decode", req.url);
    decodeToken.searchParams.set("data", data);

    const r = await fetch(decodeToken, { cache: "no-store" });

    if (!r.ok) {
      return NextResponse.redirect(new URL("/?error=invalid_token", req.url));
    }

    const decoded = await r.json();
    const { next, action } = decoded;

    if (action === "github_app_installed") {
      const destination = next || "/";
      return NextResponse.redirect(new URL(destination, req.url));
    }

    return NextResponse.redirect(new URL("/", req.url));

  } catch (error) {
    console.error("Install Callback Error:", error);
    return NextResponse.redirect(new URL("/?error=server_error", req.url));
  }
}
