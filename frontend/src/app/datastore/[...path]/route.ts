import { API_BASE_URL } from "@/lib/api";

export async function GET(
  req: Request,
  { params }: { params: { path: string[] } }
) {
  const target = params.path.join("/");
  const url = `${API_BASE_URL}/${target}`;
  console.log(url)

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
  const url = `${API_BASE_URL}/${target}`;

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
