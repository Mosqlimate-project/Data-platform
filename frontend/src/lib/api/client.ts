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

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(csrf ? { 'X-CSRFToken': csrf } : {}),
    ...(options.headers as Record<string, string>),
  };

  const token = Cookies.get('access_token');
  if (options.auth !== false && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BACKEND_BASE_URL}/api${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }

  return res.json();
}
