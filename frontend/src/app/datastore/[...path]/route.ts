import { BACKEND_BASE_URL, FRONTEND_SECRET } from "@/lib/env";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: { path: string[] } }
) {
  const secret = req.headers.get("x-internal-secret")
  const target = params.path.join("/");
  const url = `${BACKEND_BASE_URL}/api/${target}`;

  if (!FRONTEND_SECRET || secret !== FRONTEND_SECRET) {
    return NextResponse.json({ message: "Unauthorized [f]" }, { status: 401 });
  }

  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
  });

  const data = await res.text();

  return new Response(data, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("content-type") || "application/json",
    },
  });
}

export async function POST(
  req: Request,
  { params }: { params: { path: string[] } }
) {
  const target = params.path.join("/");
  const url = `${BACKEND_BASE_URL}/api/${target}`;

  const body = await req.text();

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  const data = await res.text();

  return new Response(data, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("content-type") || "application/json",
    },
  });
}
