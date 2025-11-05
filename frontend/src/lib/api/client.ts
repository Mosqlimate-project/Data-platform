const ENV = process.env.FRONTEND_ENV || process.env.NODE_ENV;

let API_BASE_URL: string;

if (["production", "prod", "dev"].includes(ENV)) {
  API_BASE_URL = "http://backend:8042/api";
} else {
  API_BASE_URL = "http://0.0.0.0:8042/api";
}

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
