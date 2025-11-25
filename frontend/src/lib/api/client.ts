import Cookies from 'js-cookie';
import { csrfToken } from './auth';

export const BACKEND_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://api.mosqlimate.org"
    : "http://localhost:8042";

interface ApiFetchOptions extends RequestInit {
  auth?: boolean;
}

export async function apiFetch(endpoint: string, options: ApiFetchOptions = {}) {
  let csrf = Cookies.get('csrftoken');

  if (!csrf && options.method && options.method !== 'GET') {
    csrf = await csrfToken();
  }

  const buildHeaders = (token?: string) => ({
    Accept: 'application/json',
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(csrf ? { 'X-CSRFToken': csrf } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  });

  const baseFetch = async (token?: string) => {
    return fetch(`${BACKEND_BASE_URL}/api${endpoint}`, {
      ...options,
      headers: buildHeaders(token),
      credentials: 'include',
    });
  };

  const access = options.auth === false ? null : Cookies.get('access_token');
  let res = await baseFetch(access || undefined);

  if (res.status === 401 && options.auth !== false) {
    const refreshed = await refreshToken();
    if (!refreshed) {
      throw new Error("Unauthorized");
    }

    res = await baseFetch(refreshed);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }

  return res.json();
}

async function refreshToken(): Promise<string | null> {
  const refresh = Cookies.get("refresh_token");
  if (!refresh) return null;

  const res = await fetch(`${BACKEND_BASE_URL}/api/user/refresh/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ refresh_token: refresh }),
  });

  if (!res.ok) {
    Cookies.remove("access_token");
    Cookies.remove("refresh_token");
    return null;
  }

  const data = await res.json();

  const secure = window.location.protocol === "https:";
  const opts = { path: "/", sameSite: "lax" as const, secure };

  Cookies.set("access_token", data.access_token, opts);
  Cookies.set("refresh_token", data.refresh_token, opts);

  return data.access_token;
}
