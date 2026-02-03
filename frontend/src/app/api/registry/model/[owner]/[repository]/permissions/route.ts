import { NextRequest, NextResponse } from "next/server";
import { verifyUser } from "@/app/api/auth/verify";
import { BACKEND_BASE_URL } from "@/lib/env";
import { ADMIN_UIDKEY } from "@/lib/env";

export async function GET(
  request: NextRequest,
  { params }: { params: { owner: string; repository: string } }
) {
  const { owner, repository } = params;

  const verification = await verifyUser(request);

  if (!verification) {
    return NextResponse.json(
      { is_owner: false, can_manage: false },
      { status: 200 }
    );
  }

  let accessToken = request.cookies.get("access_token")?.value;

  const newCookies = verification.headers?.get("set-cookie");
  if (newCookies) {
    const match = newCookies.match(/access_token=([^;]+)/);
    if (match) {
      accessToken = match[1];
    }
  }

  if (!accessToken) {
    return NextResponse.json(
      { is_owner: false, can_manage: false },
      { status: 200 }
    );
  }

  try {
    const res = await fetch(
      `${BACKEND_BASE_URL}/api/registry/model/${owner}/${repository}/permissions/`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { is_owner: false, can_manage: false },
        { status: 200 }
      );
    }

    const data = await res.json();
    const response = NextResponse.json(data);

    if (verification.headers) {
      verification.headers.forEach((value, key) => {
        response.headers.set(key, value);
      });
    }

    return response;
  } catch (error) {
    return NextResponse.json(
      { is_owner: false, can_manage: false },
      { status: 200 }
    );
  }
}
