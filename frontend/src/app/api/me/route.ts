import { verifyUser } from "../_auth/verify";

export async function GET() {
  const user = await verifyUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  return Response.json({ user });
}
