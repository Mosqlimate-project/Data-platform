const ENV = process.env.FRONTEND_ENV || process.env.NODE_ENV;

let API_BASE_URL: string;

if (ENV === "production") {
  API_BASE_URL = "/api";
} else if (ENV === "dev") {
  API_BASE_URL = "http://backend:8042/api";
} else {
  API_BASE_URL = "http://0.0.0.0:8042/api";
}

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const lang =
    typeof window !== "undefined"
      ? localStorage.getItem("lang") || "en-us"
      : "en-us";

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
