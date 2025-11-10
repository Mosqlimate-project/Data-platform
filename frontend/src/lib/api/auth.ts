import { BACKEND_BASE_URL } from "@/lib/api";

export async function oauthLogin(provider: "google" | "github" | "orcid") {
  const res = await fetch(`${BACKEND_BASE_URL}/api/user/oauth/login/${provider}/`);
  const url = await res.json();
  window.location.href = url.auth_url;
}
