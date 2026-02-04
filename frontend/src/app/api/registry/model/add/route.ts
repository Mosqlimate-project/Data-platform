import { NextRequest, NextResponse } from "next/server";
import { BACKEND_BASE_URL } from "@/lib/env";

export async function POST(req: NextRequest) {
  const accessToken = req.cookies.get("access_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  try {
    const res = await fetch(`${BACKEND_BASE_URL}/api/registry/model/add/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json(
        { message: errorText || "Backend Error" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, { status: 200 });

  } catch (error) {
    console.error("Proxy Error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
