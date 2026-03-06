import { NextRequest, NextResponse } from "next/server";
import { NEXT_PUBLIC_FRONTEND_URL, BACKEND_BASE_URL } from "@/lib/env";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const { searchParams } = new URL(req.url);
  const data = searchParams.get("data");

  if (!data) {
    return NextResponse.redirect(new URL("/?error=missing_data", NEXT_PUBLIC_FRONTEND_URL));
  }

  const internalFetchUrl = `${BACKEND_BASE_URL}/api/user/oauth/decode/?data=${encodeURIComponent(data)}`;

  try {
    const r = await fetch(internalFetchUrl, {
      cache: "no-store",
      headers: { "Accept": "application/json" }
    });

    if (!r.ok) {
      console.error("Backend decode failed in Install Callback");
      return NextResponse.redirect(new URL("/?error=invalid_token", NEXT_PUBLIC_FRONTEND_URL));
    }

    const decoded = await r.json();
    const { next, action } = decoded;

    const destination = next || "/";
    const redirectUrl = new URL(destination, NEXT_PUBLIC_FRONTEND_URL);

    if (action === "github_app_installed" || provider === "github") {
      return NextResponse.redirect(redirectUrl);
    }

    return NextResponse.redirect(new URL("/", NEXT_PUBLIC_FRONTEND_URL));

  } catch (error) {
    console.error("Install Callback Error:", error);
    return NextResponse.redirect(new URL("/?error=server_error", NEXT_PUBLIC_FRONTEND_URL));
  }
}
