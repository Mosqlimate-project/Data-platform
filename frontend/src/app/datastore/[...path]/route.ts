<<<<<<< HEAD
import { BACKEND_BASE_URL } from "@/lib/api";
=======
import { API_BASE_URL } from "@/lib/api";
>>>>>>> 3718eeb (configure allauth with orcid and google)

export async function GET(
  req: Request,
  { params }: { params: { path: string[] } }
) {
  const target = params.path.join("/");
<<<<<<< HEAD
  const url = `${BACKEND_BASE_URL}/api/${target}`;
=======
  const url = `${API_BASE_URL}/${target}`;
>>>>>>> 3718eeb (configure allauth with orcid and google)
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
<<<<<<< HEAD
  const url = `${BACKEND_BASE_URL}/api/${target}`;
=======
  const url = `${API_BASE_URL}/${target}`;
>>>>>>> 3718eeb (configure allauth with orcid and google)

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
