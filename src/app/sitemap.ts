import type { MetadataRoute } from "next";
import { getAllActiveTrucks } from "@/lib/data";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const trucks = await getAllActiveTrucks();

  const truckEntries: MetadataRoute.Sitemap = trucks.map((truck) => ({
    url: `https://findmytruck.ch/trucks/${truck.slug}`,
    lastModified: truck.updated_at,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  return [
    {
      url: "https://findmytruck.ch",
      lastModified: new Date(),
      changeFrequency: "always",
      priority: 1,
    },
    {
      url: "https://findmytruck.ch/zurich",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...truckEntries,
  ];
}
