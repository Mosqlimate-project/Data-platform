import { z } from "zod";

const envSchema = z.object({
  FRONTEND_URL: z.string().min(1, "FRONTEND_URL is missing"),
  FRONTEND_PORT: z.string().min(1, "FRONTEND_PORT is missing"),
  ADMIN_UIDKEY: z.string().min(1, "ADMIN_UIDKEY is missing"),
  INTERNAL_BACKEND_URL: z.string().min(1, "INTERNAL_BACKEND_URL is missing"),
  PUBLIC_BACKEND_URL: z.url("PUBLIC_BACKEND_URL must be a valid URL"),
  FRONTEND_PREFIX: z.string().default(""),
  SECRET_KEY: z.string().min(1, "SECRET_KEY is missing"),
  JWT_ALGORITHM: z.string().default("HS256"),
  JWT_TOKEN_EXPIRE_MINUTES: z.coerce.number().default(30),
  JWT_REFRESH_TOKEN_EXPIRE_DAYS: z.coerce.number().default(7),
});

const env = envSchema.parse(process.env);

export const FRONTEND_URL = env.FRONTEND_URL;
export const FRONTEND_PORT = env.FRONTEND_PORT;
export const ADMIN_UIDKEY = env.ADMIN_UIDKEY;

export const BACKEND_BASE_URL = env.INTERNAL_BACKEND_URL;
export const PUBLIC_BACKEND_URL = env.PUBLIC_BACKEND_URL;
export const FRONTEND_PREFIX = env.FRONTEND_PREFIX;

export const SECRET_KEY = env.SECRET_KEY;
export const JWT_ALGORITHM = env.JWT_ALGORITHM;
export const JWT_TOKEN_EXPIRE_MINUTES = env.JWT_TOKEN_EXPIRE_MINUTES;
export const JWT_REFRESH_TOKEN_EXPIRE_DAYS = env.JWT_REFRESH_TOKEN_EXPIRE_DAYS;
