import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/dashboard", "/account", "/favorites"],
      },
    ],
    sitemap: "https://findmytruck.ch/sitemap.xml",
  };
}
