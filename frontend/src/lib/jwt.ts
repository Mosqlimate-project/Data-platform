import { jwtVerify } from "jose";
import { FRONTEND_SECRET } from "./env";

const SECRET = new TextEncoder().encode(FRONTEND_SECRET);

export async function verifyJWT(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET, {
      algorithms: ["HS256"],
    });
    return payload;
  } catch (err) {
    return null;
  }
}
