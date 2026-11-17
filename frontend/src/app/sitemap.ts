import type { MetadataRoute } from "next";
import { NEXT_PUBLIC_FRONTEND_URL } from "@/lib/env";

const PUBLIC_ROUTES = [
  "",
  "/about",
  "/datastore",
  "/models",
  "/publications",
  "/privacy",
  "/terms",
  "/register",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = NEXT_PUBLIC_FRONTEND_URL.replace(/\/$/, "");
  const lastModified = new Date();

  return PUBLIC_ROUTES.map((route) => ({
    url: `${base}${route}`,
    lastModified,
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1 : 0.7,
  }));
}
