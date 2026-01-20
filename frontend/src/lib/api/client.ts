export const BACKEND_BASE_URL = process.env.INTERNAL_BACKEND_URL || "http://backend:8042";
export const PUBLIC_BACKEND_URL = process.env.PUBLIC_BACKEND_URL || "http://0.0.0.0:8042";
export const FRONTEND_BASE_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:8041";

interface ApiFetchOptions extends RequestInit {
  auth?: boolean;
}

export async function apiFetch(endpoint: string, options: ApiFetchOptions = {}) {
  const baseFetch = async () => {
    return fetch(`${PUBLIC_BACKEND_URL}/api${endpoint}`, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...(options.headers || {}),
      },
      credentials: "include",
    });
  };

  let res = await baseFetch();

  if (res.status === 401 && options.auth) {
    const refreshed = await refreshToken();
    if (refreshed) {
      res = await baseFetch();
    }
  }

  if (!res.ok) {
    let errorMessage;
    try {
      const errorData = await res.json();
      errorMessage = errorData.detail || errorData.message || `Request failed: ${res.status}`;
    } catch {
      errorMessage = await res.text();
    }
    throw new Error(errorMessage);
  }

  return res.json();
}

async function refreshToken(): Promise<boolean> {
  try {
    const res = await fetch(`${FRONTEND_BASE_URL}/api/auth/refresh`, {
      method: "GET",
      cache: "no-store",
    });

    return res.ok;
  } catch (err) {
    return false;
  }
}
