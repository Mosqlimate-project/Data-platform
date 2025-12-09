import { apiFetch } from "@/lib/api";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const geocode = url.searchParams.get("geocode");
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");

  const cookies = req.headers.get("cookie") || "";

  const data = await apiFetch(
    `/datastore/charts/municipality/temperature/?geocode=${geocode}&start=${start}&end=${end}`,
    {
      headers: {
        cookie: cookies,
      }
    }
  );

  return Response.json(data);
}
