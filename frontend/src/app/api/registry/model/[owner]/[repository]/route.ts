import { NextRequest, NextResponse } from "next/server";
import { BACKEND_BASE_URL, FRONTEND_SECRET } from "@/lib/env";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repository: string }> }
) {
  const secret = request.headers.get("x-internal-secret");
  const { owner, repository } = await params;

  if (!FRONTEND_SECRET || secret !== FRONTEND_SECRET) {
    return NextResponse.json({ message: "Unauthorized [f]" }, { status: 401 });
  }

  const accessToken = request.cookies.get("access_token")?.value;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const res = await fetch(
    `${BACKEND_BASE_URL}/api/registry/model/${owner}/${repository}/`,
    {
      headers,
      cache: "no-store",
    }
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to fetch model repository" },
      { status: res.status }
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repository: string }> }
) {
  const { owner, repository } = await params;
  const accessToken = request.cookies.get("access_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ message: "Authentication required" }, { status: 401 });
  }

  try {
    const body = await request.json();

    const res = await fetch(
      `${BACKEND_BASE_URL}/api/registry/model/${owner}/${repository}/`,
      {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.message || "Update failed" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });

  } catch (error) {
    console.error("PATCH Proxy Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repository: string }> }
) {
  const { owner, repository } = await params;
  const accessToken = request.cookies.get("access_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ message: "Authentication required" }, { status: 401 });
  }

  const res = await fetch(
    `${BACKEND_BASE_URL}/api/registry/model/${owner}/${repository}/`,
    {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    return NextResponse.json(
      { error: errorData.message || "Delete failed" },
      { status: res.status }
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
