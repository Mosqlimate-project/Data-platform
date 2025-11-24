import { BACKEND_BASE_URL } from "@/lib/api";
import Cookies from "js-cookie";

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

export async function credentialsLogin(identifier: string, password: string) {
  const csrf = await csrfToken();

  const res = await fetch(`${BACKEND_BASE_URL}/api/user/login/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrf,
    },
    credentials: "include",
    body: JSON.stringify({ identifier, password }),
  });

  if (!res.ok) {
    throw new Error(await res.text() || `${res.status}`);
  }

  return res.json();
}

export async function getAccessToken(): Promise<string> {
  let token = Cookies.get("access_token");
  const refreshToken = Cookies.get("refresh_token");

  if (!token && refreshToken) {
    try {
      const csrf = await csrfToken();

      const res = await fetch(`${BACKEND_BASE_URL}/api/user/refresh/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrf,
        },
        credentials: "include",
        body: JSON.stringify({ token: refreshToken }),
      });

      if (!res.ok) {
        Cookies.remove("access_token");
        Cookies.remove("refresh_token");
        throw new Error(`Failed to refresh access token (${res.status})`);
      }

      const data = await res.json();
      token = data.access_token;

      if (token) {
        Cookies.set("access_token", token, {
          sameSite: "Lax",
          secure: process.env.NODE_ENV === "production",
        });
      } else {
        throw new Error("No access token returned from refresh endpoint");
      }
    } catch (err) {
      console.error("Token refresh error:", err);
      throw err;
    }
  }

  if (!token) {
    throw new Error("No access token available");
  }

  return token;
}
