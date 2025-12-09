import { SECRET_KEY, JWT_ALGORITHM } from "@/lib/env";
import { jwtVerify, JWTPayload } from "jose";

function getSecret(): Uint8Array {
  if (!SECRET_KEY) throw new Error("Missing SECRET_KEY environment variable.");
  return new TextEncoder().encode(SECRET_KEY);
}

export async function parseToken(token: string): Promise<JWTPayload | null> {
  let secret = getSecret();
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: [`${JWT_ALGORITHM}`] });

    return payload;

  } catch (error) {
    console.log("Token verification failed:", error);
    return null;
  }
}
