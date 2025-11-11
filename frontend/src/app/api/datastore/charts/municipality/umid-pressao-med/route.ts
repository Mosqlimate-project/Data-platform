import { apiFetch } from "@/lib/api";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const geocode = url.searchParams.get("geocode");
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");

  const data = await apiFetch(
    `/datastore/charts/municipality/umid-pressao-med/?geocode=${geocode}&start=${start}&end=${end}`
  );

  return Response.json(data);
}
