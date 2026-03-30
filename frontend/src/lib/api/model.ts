import { cookies } from "next/headers";
import { BACKEND_BASE_URL } from "@/lib/env";

export async function getPermissions(owner: string, repository: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const headers: HeadersInit = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const res = await fetch(
      `${BACKEND_BASE_URL}/api/registry/model/${owner}/${repository}/permissions/`,
      { headers, cache: "no-store" }
    );
    return res.ok ? await res.json() : { can_manage: false };
  } catch (error) {
    return { can_manage: false };
  }
}
