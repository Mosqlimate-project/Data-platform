import { SECRET_KEY, JWT_ALGORITHM } from "@/lib/env";
import { jwtVerify, JWTPayload } from "jose";

function getSecret(): Uint8Array {
  if (!SECRET_KEY) throw new Error("Missing SECRET_KEY environment variable.");
  return new TextEncoder().encode(SECRET_KEY);
}

export async function parseToken(token: string): Promise<JWTPayload | null> {
  const secret = getSecret();
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: [JWT_ALGORITHM || "HS256"]
    });

    if (!payload.sub) {
      console.error("Token missing 'sub' claim");
      return null;
    }

    return payload;

  } catch (error: any) {
    if (error.code === 'ERR_JWT_EXPIRED') {
      return null;
    }

    console.error("JWT Verification Error:", error.message);
    return null;
  }
}
