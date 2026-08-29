import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n").filter((l) => l.includes("=")).map((l) => {
      const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const { data: trucks } = await sb
  .from("public_trucks")
  .select("id, slug, name, source_region, region_lat, region_lng")
  .eq("is_active", true)
  .order("name");

const { data: scheds } = await sb.from("truck_schedules").select("*");
const schedByTruck = new Map();
for (const s of scheds) {
  if (!schedByTruck.has(s.truck_id)) schedByTruck.set(s.truck_id, []);
  schedByTruck.get(s.truck_id).push(s);
}

console.log("=== region_lng distribution (rounded to 0.01) ===");
const lngBuckets = new Map();
for (const t of trucks) {
  const k = t.region_lng == null ? "null" : t.region_lng.toFixed(2);
  lngBuckets.set(k, (lngBuckets.get(k) ?? 0) + 1);
}
for (const [k, v] of [...lngBuckets].sort((a, b) => b[1] - a[1])) console.log(`  lng ${k}: ${v}`);

console.log("\n=== region_lat distribution (rounded to 0.01) ===");
const latBuckets = new Map();
for (const t of trucks) {
  const k = t.region_lat == null ? "null" : t.region_lat.toFixed(2);
  latBuckets.set(k, (latBuckets.get(k) ?? 0) + 1);
}
for (const [k, v] of [...latBuckets].sort((a, b) => b[1] - a[1])) console.log(`  lat ${k}: ${v}`);

console.log("\n=== source_region -> stored coord (grouped) ===");
const byRegion = new Map();
for (const t of trucks) {
  const r = t.source_region ?? "(null)";
  if (!byRegion.has(r)) byRegion.set(r, []);
  byRegion.get(r).push(t);
}
for (const [r, ts] of [...byRegion].sort((a, b) => b[1].length - a[1].length)) {
  const cs = ts.map((t) => `${t.region_lat},${t.region_lng}`);
  const uniq = [...new Set(cs)];
  console.log(`  "${r}"  (${ts.length} trucks)  ${uniq.length} distinct coords`);
  for (const t of ts.slice(0, 3)) console.log(`      ${t.slug}: ${t.region_lat}, ${t.region_lng}`);
}

console.log("\n=== trucks WITH real schedules (should keep precise coords) ===");
for (const t of trucks) {
  const sc = schedByTruck.get(t.id) ?? [];
  const real = sc.filter((s) => !(s.start_time === s.end_time));
  if (real.length) {
    console.log(`  ${t.name} (${t.slug})`);
    for (const s of real.slice(0, 2)) console.log(`      day ${s.day_of_week} ${s.start_time}-${s.end_time} @ ${s.location_lat},${s.location_lng} "${s.location_name}"`);
  }
}

console.log("\n=== all schedule rows coords ===");
for (const s of scheds) {
  console.log(`  truck ${s.truck_id.slice(0,8)} day${s.day_of_week} ${s.start_time}-${s.end_time} @ ${s.location_lat},${s.location_lng}`);
}

// distinct source_region values
console.log("\n=== distinct source_region values ===");
for (const r of [...byRegion.keys()].sort()) console.log(`  ${JSON.stringify(r)}`);
