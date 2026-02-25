import { NextRequest, NextResponse } from "next/server";
import { verifyUser } from "@/app/api/auth/verify";

export async function GET(req: NextRequest) {
  const user = await verifyUser(req);

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  return NextResponse.json({ user });
}
