/**
 * Re-geocode region markers for unclaimed / imported food-truck profiles.
 *
 *   node --env-file=.env.local scripts/regeocode-regions.mjs --dry-run
 *   node --env-file=.env.local scripts/regeocode-regions.mjs
 *   node --env-file=.env.local scripts/regeocode-regions.mjs --sql > regeocode.sql
 *
 * --sql emits an idempotent SQL script (one UPDATE per truck, matched by slug)
 * you can paste into the Supabase SQL editor instead of writing over the API.
 *
 * WHY: the original import (scripts/import-trucks.mjs) placed every
 * "Zürich-Region" truck inside a ~1 km box around Zürich HB and, worse, its
 * jitter helper used a signed `>>` shift on a value that is often > 2^31, so
 * ~half the trucks were shoved up to 2 km due west. The result on the map is a
 * tall pile of ~65 pins stacked over central Zürich instead of pins spread
 * across the greater-Zürich / Zug / Lucerne / Winterthur areas.
 *
 * WHAT THIS DOES: for every truck with claim_status = 'unclaimed', a non-null
 * source_region and NO real schedule rows, it
 *   1. resolves the region to a real centre coordinate — a hand-checked Mapbox
 *      query (or explicit coordinate) per distinct source_region value, with a
 *      live Mapbox Geocoding lookup (country=ch) as the fallback, and
 *   2. offsets the truck from that centre by a deterministic amount (uniform in
 *      a disc whose radius reflects how vague the region is — a few hundred
 *      metres for a named village, several km for "Grossraum Zürich"), so
 *      trucks that share a region fan out into separate, realistic pins.
 *
 * It writes ONLY trucks.region_lat / trucks.region_lng. It never touches
 * truck_schedules, so the 3 trucks with real schedules (Smash Brothers,
 * Thai Street Kitchen, Taco Libre) are left exactly as they are.
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const DRY_RUN = process.argv.includes("--dry-run");
const SQL_MODE = process.argv.includes("--sql");
const log = SQL_MODE ? (...a) => console.error(...a) : (...a) => console.log(...a);

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing Supabase env. Run: node --env-file=.env.local scripts/regeocode-regions.mjs");
  process.exit(1);
}
if (!MAPBOX_TOKEN) {
  console.error("Missing NEXT_PUBLIC_MAPBOX_TOKEN — needed to geocode region names.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });

// Geographic centre of the Swiss plateau — fallback for country-wide rows.
const CH_CENTRE = [46.9480, 7.8213]; // roughly Bern/Mittelland, where people are

/**
 * One entry per distinct `source_region` value currently in the DB.
 *   q      – Mapbox query (", Switzerland" + country=ch is appended)
 *   at     – explicit [lat, lng] centre (skips Mapbox entirely)
 *   radius – jitter radius in km (how far a truck may sit from the centre)
 */
const REGION_MAP = {
  "Zürich-Region":               { q: "Zürich",      radius: 5.5 },
  "Zürich":                      { q: "Zürich",      radius: 4.0 },
  "Grossraum Zürich":            { q: "Zürich",      radius: 7.0 },
  "Zürich / Zentralschweiz":     { q: "Zürich",      radius: 5.5 },
  "Zürich / CH":                 { q: "Zürich",      radius: 5.5 },
  "Zürich (Europaallee)":        { at: [47.3782, 8.5391], radius: 1.2 },
  "Zürich (Küchenlabor)":        { q: "Zürich",      radius: 2.5 },
  "Zürich (Take Away)":          { q: "Zürich",      radius: 2.5 },
  "Zürich Kreis 4":              { at: [47.3743, 8.5263], radius: 0.9 },
  "Zürich Wiedikon":             { at: [47.3712, 8.5157], radius: 0.9 },
  "Region Zürich/Winterthur":    { at: [47.4350, 8.6400], radius: 9.0 },
  "Zwischen Winterthur & Zürich":{ at: [47.4350, 8.6400], radius: 9.0 },
  "Winterthur (ZH)":             { q: "Winterthur",  radius: 2.5 },
  "Embrach (ZH)":                { q: "Embrach",     radius: 1.2 },
  "Wetzikon (ZH)":               { q: "Wetzikon ZH", radius: 1.5 },
  "Baar (ZG)":                   { q: "Baar",        radius: 1.5 },
  "Baar / Cham (ZG)":            { at: [47.1886, 8.4934], radius: 3.0 },
  "Cham (ZG)":                   { q: "Cham ZG",     radius: 1.5 },
  "Neuheim (ZG)":                { q: "Neuheim",     radius: 1.2 },
  "Kanton Zug":                  { q: "Zug",         radius: 6.0 },
  "Zug-Region":                  { q: "Zug",         radius: 5.0 },
  "Luzern":                      { q: "Luzern",     radius: 3.5 },
  "Luzern (Vierwaldstättersee)": { q: "Luzern",     radius: 3.5 },
  "Sursee (LU)":                 { q: "Sursee",     radius: 1.5 },
  "Wauwil (LU)":                 { q: "Wauwil",     radius: 1.2 },
  "Berner Oberland":             { q: "Interlaken", radius: 12.0 },
  "Wiedlisbach-Region":          { q: "Wiedlisbach", radius: 3.0 },
  "Pratteln (BL)":               { q: "Pratteln",   radius: 2.0 },
  "CH":                          { at: CH_CENTRE,   radius: 10.0 },
  "CH (Bauernverband)":          { at: CH_CENTRE,   radius: 10.0 },
};

const DEFAULT_RULE = { radius: 4.0 }; // unknown region -> Mapbox on the raw name

async function mapboxCentre(query) {
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query + ", Switzerland")}.json` +
    `?access_token=${MAPBOX_TOKEN}&country=ch&limit=1&types=place,locality,region,district`;
  const res = await fetch(url);
  const json = await res.json();
  const c = json?.features?.[0]?.center;
  if (Array.isArray(c) && c.length === 2) return [c[1], c[0]]; // -> [lat, lng]
  return null;
}

/** Clean a messy region string down to something Mapbox can resolve. */
function cleanRegion(raw) {
  let s = raw
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(grossraum|raum|kanton|region|zwischen)\b/gi, " ")
    .replace(/-region\b/gi, " ");
  s = s.split(/\s*[/&,]\s*| - | und | oder /i)[0];
  return s.replace(/\s+/g, " ").trim();
}

const centreCache = new Map();
async function regionCentre(region) {
  if (centreCache.has(region)) return centreCache.get(region);
  const rule = REGION_MAP[region] ?? DEFAULT_RULE;
  let centre = rule.at ?? null;
  let source = rule.at ? "explicit" : null;

  if (!centre) {
    const query = rule.q ?? cleanRegion(region) ?? region;
    centre = await mapboxCentre(query);
    source = centre ? `mapbox("${query}")` : null;
    await new Promise((r) => setTimeout(r, 150));
  }
  if (!centre) {
    centre = CH_CENTRE;
    source = "CH_CENTRE (fallback)";
  }
  const out = { centre, radius: rule.radius ?? DEFAULT_RULE.radius, source };
  centreCache.set(region, out);
  return out;
}

// --- deterministic per-truck offset, uniform inside a disc of `radiusKm` ------
function hashUnit(str, salt) {
  let h = (2166136261 ^ salt) >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  // extra avalanche so the two draws we take are well separated
  h ^= h >>> 15;
  h = Math.imul(h, 2246822507) >>> 0;
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296; // [0, 1)
}

function offset(seed, radiusKm, lat) {
  const angle = hashUnit(seed, 0x9e3779b9) * 2 * Math.PI;
  const dist = Math.sqrt(hashUnit(seed, 0x85ebca6b)) * radiusKm; // sqrt -> uniform in disc
  const dLat = (dist / 111.32) * Math.cos(angle);
  const dLng = (dist / (111.32 * Math.cos((lat * Math.PI) / 180))) * Math.sin(angle);
  return [dLat, dLng];
}

async function main() {
  // Raw table (not the view) so we can UPDATE.
  const { data: trucks, error } = await supabase
    .from("trucks")
    .select("id, slug, name, source_region, claim_status, region_lat, region_lng")
    .eq("claim_status", "unclaimed")
    .not("source_region", "is", null)
    .order("source_region");
  if (error) {
    console.error("Read failed:", error.message);
    process.exit(1);
  }

  // Never move a truck that has a real schedule row.
  const { data: sched } = await supabase.from("truck_schedules").select("truck_id");
  const hasSchedule = new Set((sched ?? []).map((s) => s.truck_id));

  const targets = trucks.filter((t) => !hasSchedule.has(t.id));
  const skippedForSchedule = trucks.length - targets.length;

  log(
    `${DRY_RUN ? "[dry run] " : ""}${targets.length} unclaimed trucks to re-geocode` +
      (skippedForSchedule ? ` (${skippedForSchedule} skipped: has a real schedule)` : "")
  );

  let updated = 0;
  let failed = 0;
  const perRegion = new Map();
  const sqlLines = [];

  for (const t of targets) {
    const region = t.source_region;
    const { centre, radius, source } = await regionCentre(region);
    const [dLat, dLng] = offset(t.slug, radius, centre[0]);
    const lat = Number((centre[0] + dLat).toFixed(6));
    const lng = Number((centre[1] + dLng).toFixed(6));

    if (!perRegion.has(region)) perRegion.set(region, { centre, radius, source, n: 0, sample: [] });
    const rg = perRegion.get(region);
    rg.n++;
    if (rg.sample.length < 3) rg.sample.push(`${t.slug} -> ${lat}, ${lng}`);

    if (SQL_MODE) {
      sqlLines.push(
        `update trucks set region_lat = ${lat}, region_lng = ${lng} ` +
          `where slug = '${t.slug.replace(/'/g, "''")}' and claim_status = 'unclaimed';`
      );
      updated++;
      continue;
    }

    if (DRY_RUN) {
      updated++;
      continue;
    }

    const { error: upErr } = await supabase
      .from("trucks")
      .update({ region_lat: lat, region_lng: lng })
      .eq("id", t.id);
    if (upErr) {
      console.error(`  x ${t.slug}: ${upErr.message}`);
      failed++;
    } else {
      updated++;
    }
  }

  log("\n=== region -> centre (radius km) — source ===");
  for (const [region, rg] of [...perRegion].sort((a, b) => b[1].n - a[1].n)) {
    log(
      `\n"${region}"  (${rg.n} trucks)  centre ${rg.centre[0].toFixed(4)}, ${rg.centre[1].toFixed(4)}  ±${rg.radius}km  [${rg.source}]`
    );
    for (const s of rg.sample) log(`    ${s}`);
  }

  if (SQL_MODE) {
    console.log("-- Re-geocode region markers for imported/unclaimed trucks.");
    console.log("-- Generated by scripts/regeocode-regions.mjs --sql");
    console.log("-- Safe to re-run; only touches claim_status = 'unclaimed' rows.");
    console.log("begin;");
    for (const line of sqlLines) console.log(line);
    console.log("commit;");
  }

  log(
    `\n${DRY_RUN ? "[dry run] nothing written. " : SQL_MODE ? "[sql] " : ""}${updated} ${
      DRY_RUN || SQL_MODE ? "would be updated" : "updated"
    }, ${failed} failed.`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
