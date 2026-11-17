import type { MetadataRoute } from "next";
import { NEXT_PUBLIC_FRONTEND_URL } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const base = NEXT_PUBLIC_FRONTEND_URL.replace(/\/$/, "");

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/oauth/", "/dashboard", "/profile", "/admin"],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
