import { BACKEND_BASE_URL } from "@/lib/api";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get("access_token")?.value;
  console.log(accessToken);

  if (!accessToken) {
    return NextResponse.json(false, { status: 401 });
  }

  try {
    const res = await fetch(`${BACKEND_BASE_URL}/api/registry/model/add/sprint/active/`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(false, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(false, { status: 500 });
  }
}
