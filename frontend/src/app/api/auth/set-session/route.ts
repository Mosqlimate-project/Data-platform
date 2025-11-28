import { cookies } from "next/headers";

export async function POST(request: Request) {
  const { access_token, refresh_token } = await request.json();

  cookies().set("access_token", access_token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 30,
  });

  cookies().set("refresh_token", refresh_token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return new Response("ok");
}
