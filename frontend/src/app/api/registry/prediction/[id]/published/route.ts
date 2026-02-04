import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BACKEND_BASE_URL } from "@/lib/env";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const cookieStore = await cookies();

    const response = await fetch(
      `${BACKEND_BASE_URL}/api/registry/prediction/${id}/published/`,
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
      return NextResponse.json(
        { message: "Failed to update status" },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Publish Update Error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
