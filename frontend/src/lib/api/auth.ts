import { PUBLIC_BACKEND_URL, BACKEND_BASE_URL } from "@/lib/api";


export function oauthLogin(provider: "google" | "github" | "gitlab", next?: string) {
  window.location.href = `${PUBLIC_BACKEND_URL}/api/user/oauth/login/${provider}/?next=${encodeURIComponent(next || "")}`;
}

export async function csrfToken(): Promise<string> {
  const res = await fetch(`${BACKEND_BASE_URL}/api/csrf/`, {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`Failed to get CSRF token: ${res.status}`);
  }

  const data = await res.json();

  if (data.csrf_token) return data.csrf_token;

  const match = document.cookie.match(/csrftoken=([^;]+)/);
  if (match) return match[1];

  throw new Error("CSRF token not found in response or cookies");
}
