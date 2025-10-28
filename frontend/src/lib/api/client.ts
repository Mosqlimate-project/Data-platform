const API_BASE_URL = process.env.API_BASE_URL || "http://0.0.0.0:8042/api";

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const lang = (
    typeof window !== "undefined" ? localStorage.getItem("lang") ||
      "en-us" : "en-us"
  );

  const headers = {
    "Content-Type": "application/json",
    "Accept-Language": lang,
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
