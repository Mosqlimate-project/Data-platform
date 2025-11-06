export const BACKEND_BASE_URL = process.env.NODE_ENV === "production"
  ? "https://api.mosqlimate.org" : "http://0.0.0.0:8042";

export const API_BASE_URL = `${BACKEND_BASE_URL}/api`;

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed: ${response.status}`);
  }

  return response.json();
}
