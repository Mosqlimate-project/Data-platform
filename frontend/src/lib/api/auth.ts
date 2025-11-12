import { BACKEND_BASE_URL } from "@/lib/api";

export async function oauthDecode(data: string) {
  const res = await fetch(`${BACKEND_BASE_URL}/api/user/oauth/decode/?data=${encodeURIComponent(data)}`);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || `${res.status}`);
  }
  return res.json();
}

export async function oauthLogin(provider: "google" | "github" | "orcid") {
  const res = await fetch(`${BACKEND_BASE_URL}/api/user/oauth/login/${provider}/`);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || `Request failed: ${res.status}`);
  }

  const url = await res.json();
  window.location.href = url.auth_url;
}

export async function getAccessToken(): Promise<string> {
  let token = localStorage.getItem("access_token");
  const refreshToken = localStorage.getItem("refresh_token");

  if (!token && refreshToken) {
    const res = await fetch(`${BACKEND_BASE_URL}/api/user/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: refreshToken }),
    });

    if (!res.ok) throw new Error("Failed to refresh access token");

    const data = await res.json();
    token = data.access_token;
    localStorage.setItem("access_token", token ?? "");
  }

  if (!token) throw new Error("No access token available");

  return token;
}
