import type { MetadataRoute } from "next";
import { getAllActiveTrucks } from "@/lib/data";
import { getAllUpcomingEvents } from "@/lib/events";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [trucks, events] = await Promise.all([getAllActiveTrucks(), getAllUpcomingEvents()]);

  const truckEntries: MetadataRoute.Sitemap = trucks.map((truck) => ({
    url: `https://findmytruck.ch/trucks/${truck.slug}`,
    lastModified: truck.updated_at,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const eventEntries: MetadataRoute.Sitemap = events.map((event) => ({
    url: `https://findmytruck.ch/events/${event.id}`,
    lastModified: event.created_at,
    changeFrequency: "weekly",
    priority: 0.6,
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
    {
      url: "https://findmytruck.ch/events",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: "https://findmytruck.ch/catering",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: "https://findmytruck.ch/agb",
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: "https://findmytruck.ch/datenschutz",
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: "https://findmytruck.ch/cookies",
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    ...truckEntries,
    ...eventEntries,
  ];
}
