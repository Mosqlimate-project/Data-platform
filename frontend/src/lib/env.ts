import path from "path";
import dotenv from "dotenv";

if (process.env.NODE_ENV === "development") {
  const envPath = path.resolve(process.cwd(), "../.env");
  console.log("Loading .env from", envPath);
  dotenv.config({ path: envPath });
}

export const ADMIN_UIDKEY = process.env.ADMIN_UIDKEY!;
