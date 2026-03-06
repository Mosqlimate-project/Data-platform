import { NextRequest, NextResponse } from "next/server";
import { NEXT_PUBLIC_FRONTEND_URL, FRONTEND_PORT } from "@/lib/env";

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

  try {
    const internalFetchUrl = `http://frontend:${FRONTEND_PORT}/api/auth/decode?data=${encodeURIComponent(data)}`;
    const r = await fetch(internalFetchUrl, { cache: "no-store" });

    if (!r.ok) {
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
