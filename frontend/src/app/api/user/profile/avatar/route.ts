import { BACKEND_BASE_URL } from "@/lib/env";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("access_token")?.value;

  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();

    const res = await fetch(`${BACKEND_BASE_URL}/api/user/profile/avatar/`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
      body: formData,
      cache: "no-store",
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return NextResponse.json(
        { message: errorData.message || "Failed to upload avatar" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error("Proxy Error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
