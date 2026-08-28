/**
 * One-time importer for unclaimed food-truck profiles.
 *
 *   node --env-file=.env.local scripts/import-trucks.mjs
 *   node --env-file=.env.local scripts/import-trucks.mjs --dry-run
 *
 * Reads trucks-import.csv at the project root and creates one `trucks` row per
 * line as an UNCLAIMED profile:
 *   - name, slug, cuisine_type (pipe-separated -> text[]), description
 *   - source_region = region, source_website = website, website = website
 *   - is_active = true, is_claimed = false, claim_status = 'unclaimed'
 *   - a unique short_code + matching qr_redirects row (for QR)
 *   - region_lat / region_lng geocoded from the region name via Mapbox, so the
 *     truck shows on the map at its region centre ("Location to be confirmed")
 *
 * It does NOT create auth accounts, set owner email/password, or touch photos.
 * Existing slugs are skipped, so the script is safe to re-run.
 *
 * Requires migration supabase/migrations/0005_unclaimed_profiles.sql to be
 * applied first (adds claim_status / source_* / region_* columns).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CSV_PATH = path.join(ROOT, "trucks-import.csv");
const DRY_RUN = process.argv.includes("--dry-run");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. Run with: node --env-file=.env.local scripts/import-trucks.mjs");
  process.exit(1);
}
if (!MAPBOX_TOKEN) {
  console.error("Missing NEXT_PUBLIC_MAPBOX_TOKEN — needed to geocode region names.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

// QR codes are printed on physical stickers -> always point at the production
// domain, never a local/preview NEXT_PUBLIC_SITE_URL.
const SITE_ORIGIN = (process.env.QR_SITE_ORIGIN || "https://findmytruck.ch").replace(/\/$/, "");

// Geographic centre of Switzerland ([lat, lng]) — fallback for country-wide rows.
const CH_CENTRE = [46.8182, 8.2275];

// Hand-checked centres for regions Mapbox doesn't resolve cleanly to a point.
const REGION_OVERRIDES = {
  ch: CH_CENTRE,
  "zürich-region": [47.3769, 8.5417],
  "grossraum zürich": [47.3769, 8.5417],
  "zürich / zentralschweiz": [47.3769, 8.5417],
  "zürich / ch": [47.3769, 8.5417],
  "region zürich/winterthur": [47.44, 8.63],
  "zwischen winterthur & zürich": [47.44, 8.63],
  "zug-region": [47.1662, 8.5155],
  "kanton zug": [47.1662, 8.5155],
  "zug-region ": [47.1662, 8.5155],
  "berner oberland": [46.6863, 7.8632],
  "wiedlisbach-region": [47.249, 7.653],
};

// --- CSV parsing (RFC 4180-ish: quoted fields, "" escapes, commas & newlines) -
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((v) => v !== "")) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    if (row.some((v) => v !== "")) rows.push(row);
  }
  return rows;
}

function slugify(s) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Reduce a messy public region string to something geocodable. */
function cleanRegionName(raw) {
  const low = raw.trim().toLowerCase();
  if (low === "ch" || low.startsWith("ch ") || low.startsWith("ch(")) return null;
  let s = raw
    .replace(/\([^)]*\)/g, " ") // drop "(ZG)" etc
    .replace(/\b(grossraum|raum|kanton|region)\b/gi, " ")
    .replace(/\bzwischen\b/gi, " ")
    .replace(/-region\b/gi, " ")
    .replace(/\b(take away|küchenlabor|europaallee)\b/gi, " ");
  s = s.split(/\s*[\/&,]\s*| - | und | oder /i)[0];
  s = s.replace(/\s+/g, " ").trim();
  return s || null;
}

const geocodeCache = new Map();

async function geocodeRegion(raw) {
  const key = raw.trim().toLowerCase();
  if (geocodeCache.has(key)) return geocodeCache.get(key);

  if (REGION_OVERRIDES[key]) {
    geocodeCache.set(key, REGION_OVERRIDES[key]);
    return REGION_OVERRIDES[key];
  }

  const cleaned = cleanRegionName(raw);
  if (!cleaned) {
    geocodeCache.set(key, CH_CENTRE);
    return CH_CENTRE;
  }

  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(cleaned + ", Switzerland")}.json` +
    `?access_token=${MAPBOX_TOKEN}&country=ch&limit=1&types=region,district,place,locality`;

  let coords = CH_CENTRE;
  try {
    const res = await fetch(url);
    const json = await res.json();
    const c = json?.features?.[0]?.center;
    if (Array.isArray(c) && c.length === 2) coords = [c[1], c[0]]; // -> [lat, lng]
  } catch (err) {
    console.warn(`  ! geocode failed for "${cleaned}" (${err.message}); using Switzerland centre`);
  }
  geocodeCache.set(key, coords);
  await new Promise((r) => setTimeout(r, 120)); // be polite to the API
  return coords;
}

/** Deterministic ~±1 km offset so many trucks in one region don't stack exactly. */
function jitter(slug) {
  let h = 2166136261;
  for (let i = 0; i < slug.length; i++) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h >>>= 0;
  const dLat = (((h % 1000) / 1000) - 0.5) * 0.014;
  const dLng = ((((h >> 10) % 1000) / 1000) - 0.5) * 0.02;
  return [dLat, dLng];
}

function makeShortCode(taken) {
  let code;
  do {
    code = Math.random().toString(36).slice(2, 8);
  } while (code.length < 6 || taken.has(code));
  taken.add(code);
  return code;
}

async function main() {
  const raw = readFileSync(CSV_PATH, "utf8");
  const rows = parseCsv(raw);
  const header = rows.shift().map((h) => h.trim());
  const col = (r, name) => {
    const idx = header.indexOf(name);
    return idx === -1 ? "" : (r[idx] ?? "").trim();
  };

  // Preload existing slugs + short codes so we skip dupes and stay unique.
  const { data: existing, error: exErr } = await supabase
    .from("trucks")
    .select("slug, short_code");
  if (exErr) {
    console.error("Could not read existing trucks:", exErr.message);
    process.exit(1);
  }
  const existingSlugs = new Set((existing ?? []).map((t) => t.slug));
  const takenCodes = new Set((existing ?? []).map((t) => t.short_code).filter(Boolean));

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const r of rows) {
    const name = col(r, "name");
    if (!name) continue;
    const slug = col(r, "slug") || slugify(name);
    const region = col(r, "region");
    const website = col(r, "website");

    if (existingSlugs.has(slug)) {
      console.log(`- skip  ${slug} (already exists)`);
      skipped++;
      continue;
    }

    const cuisine = col(r, "cuisine_type")
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);

    const [baseLat, baseLng] = await geocodeRegion(region || "CH");
    const [dLat, dLng] = jitter(slug);
    const regionLat = Number((baseLat + dLat).toFixed(6));
    const regionLng = Number((baseLng + dLng).toFixed(6));

    const shortCode = makeShortCode(takenCodes);

    const payload = {
      name,
      slug,
      description: col(r, "description") || null,
      cuisine_type: cuisine,
      source_region: region || null,
      source_website: website || null,
      website: website || null,
      is_active: true,
      is_claimed: false,
      claim_status: "unclaimed",
      short_code: shortCode,
      region_lat: regionLat,
      region_lng: regionLng,
    };

    if (DRY_RUN) {
      console.log(
        `= would create ${slug}  [${cuisine.join("|") || "—"}]  @ ${regionLat},${regionLng}  (${region})`
      );
      existingSlugs.add(slug);
      created++;
      continue;
    }

    const { data: inserted, error } = await supabase
      .from("trucks")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      console.error(`x fail  ${slug}: ${error.message}`);
      failed++;
      continue;
    }

    const { error: qrError } = await supabase.from("qr_redirects").insert({
      short_code: shortCode,
      truck_id: inserted.id,
      destination_url: `${SITE_ORIGIN}/trucks/${slug}`,
    });
    if (qrError) console.warn(`  ! qr_redirects insert failed for ${slug}: ${qrError.message}`);

    existingSlugs.add(slug);
    console.log(`+ create ${slug}  @ ${regionLat},${regionLng}`);
    created++;
  }

  console.log(
    `\n${DRY_RUN ? "[dry run] " : ""}Done — ${created} created, ${skipped} skipped, ${failed} failed.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
