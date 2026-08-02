import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/documents", "/api/"] },
    sitemap: "https://nexfiy.com/sitemap.xml",
    host: "https://nexfiy.com",
  };
}
