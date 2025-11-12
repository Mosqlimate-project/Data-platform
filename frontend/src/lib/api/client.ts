import { getAccessToken } from "./auth";

export const BACKEND_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://api.mosqlimate.org"
    : "http://0.0.0.0:8042";

interface ApiFetchOptions extends RequestInit {
  token?: string;
}

export async function apiFetch(endpoint: string, options: ApiFetchOptions = {}) {
  let token = options.token || localStorage.getItem("access_token");

  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers as Record<string, string>),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    let res = await fetch(`${BACKEND_BASE_URL}/api${endpoint}`, {
      ...options,
      headers,
    });

    if (res.status === 401 && localStorage.getItem("refresh_token")) {
      token = await getAccessToken();
      headers.Authorization = `Bearer ${token}`;
      res = await fetch(`${BACKEND_BASE_URL}/api${endpoint}`, { ...options, headers });
    }

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || `Request failed: ${res.status}`);
    }

    return res.json();
  } catch (err) {
    console.error(err);
    throw err;
  }
}
