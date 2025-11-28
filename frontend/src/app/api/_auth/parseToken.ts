import { jwtVerify } from "jose";

function getSecret() {
  const key = process.env.SECRET_KEY;
  if (!key) throw new Error("Missing SECRET_KEY");
  return new TextEncoder().encode(key);
}

export async function parseToken(token: string) {
  try {
    return await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
  } catch {
    return null;
  }
}
