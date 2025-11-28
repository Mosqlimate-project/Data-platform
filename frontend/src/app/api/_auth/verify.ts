import { cookies } from "next/headers";
import { parseToken } from "./parseToken";

export async function verifyUser() {
  const cookieStore = cookies();
  let access = cookieStore.get("access_token")?.value;

  if (!access) return null;

  const parsed = await parseToken(access);
  if (parsed) return parsed.payload;

  const res = await fetch(`${process.env.FRONTEND_URL}/_auth/refresh`, {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) return null;

  const data = await res.json();

  const parsedNew = await parseToken(data.access_token);
  return parsedNew?.payload ?? null;
}
