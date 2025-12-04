export const FRONTEND_URL = process.env.FRONTEND_URL!;
export const ADMIN_UIDKEY = process.env.ADMIN_UIDKEY!;

export const SECRET_KEY = process.env.SECRET_KEY!;
export const JWT_ALGORITHM = process.env.JWT_ALGORITHM || "HS256";
export const JWT_TOKEN_EXPIRE_MINUTES = parseInt(process.env.JWT_TOKEN_EXPIRE_MINUTES || "30");
export const JWT_REFRESH_TOKEN_EXPIRE_DAYS = parseInt(process.env.JWT_REFRESH_TOKEN_EXPIRE_DAYS || "7");
