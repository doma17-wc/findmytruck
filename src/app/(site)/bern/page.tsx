import type { Metadata } from "next";
import { getCity } from "@/lib/cities";
import { buildCityMetadata } from "@/lib/seo";
import CityPageView from "../_city/CityPageView";

export const revalidate = 300;

const CITY_SLUG = "bern";

export const metadata: Metadata = buildCityMetadata(getCity(CITY_SLUG)!);

export default function CityPage() {
  return <CityPageView citySlug={CITY_SLUG} />;
}
