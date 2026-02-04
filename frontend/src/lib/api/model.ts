import { cookies } from "next/headers";
import { NEXT_PUBLIC_FRONTEND_URL } from "@/lib/env";

export async function getPermissions(owner: string, repository: string) {
  try {
    const cookieStore = cookies();

    const res = await fetch(
      `${NEXT_PUBLIC_FRONTEND_URL}/api/registry/model/${owner}/${repository}/permissions`,
      {
        cache: "no-store",
        headers: {
          Cookie: cookieStore.toString(),
        },
      }
    );

    if (!res.ok) {
      return { is_owner: false, can_manage: false };
    }

    return await res.json();
  } catch (error) {
    return { is_owner: false, can_manage: false };
  }
}
