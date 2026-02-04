import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BACKEND_BASE_URL } from "@/lib/env";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repository: string }> }
) {
  try {
    const { owner, repository } = await params;
    const body = await request.json();
    const cookieStore = await cookies();

    const response = await fetch(
      `${BACKEND_BASE_URL}/api/registry/model/${owner}/${repository}/description/`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookieStore.toString(),
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { message: errorData.message || "Failed to update description" },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Description Update Error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
