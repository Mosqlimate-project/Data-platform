import { FRONTEND_SECRET, JWT_ALGORITHM } from "@/lib/env";
import { jwtVerify, JWTPayload } from "jose";

function getSecret(): Uint8Array {
  if (!FRONTEND_SECRET) throw new Error("Missing FRONTEND_SECRET environment variable.");
  return new TextEncoder().encode(FRONTEND_SECRET);
}

export async function parseToken(token: string): Promise<JWTPayload | null> {
  const secret = getSecret();
  try {
    const { payload } = await jwtVerify(token, secret, {
      /* v8 ignore next -- JWT_ALGORITHM is always defaulted to "HS256" in @/lib/env */
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
