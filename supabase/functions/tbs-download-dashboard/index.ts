import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const deviceOf = (ua = "") => {
  if (/android/i.test(ua)) return "Android";
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/windows/i.test(ua)) return "Windows";
  if (/macintosh|mac os/i.test(ua)) return "macOS";
  if (/linux/i.test(ua)) return "Linux";
  return "Other";
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

const bearerToken = (req: Request) =>
  req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || "";

const ownerRpcValue = (value: unknown) => {
  if (value === true) return true;
  if (Array.isArray(value)) return value.some(row => row?.owner_is_current_user === true || row === true);
  return value && typeof value === "object" && value.owner_is_current_user === true;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  const token = bearerToken(req);
  if (!token) return json({ error: "Unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const publicKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || serviceKey;
  if (!supabaseUrl || !serviceKey || !publicKey) return json({ error: "Server configuration error" }, 500);

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user?.id) return json({ error: "Invalid session" }, 401);

  const userDb = createClient(supabaseUrl, publicKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: ownerRpcData, error: ownerRpcError } = await userDb.rpc("owner_is_current_user");
  if (ownerRpcError) {
    console.error("owner_authorization_lookup_failed", ownerRpcError.message);
    return json({ error: "Owner authorization unavailable" }, 500);
  }
  if (!ownerRpcValue(ownerRpcData)) return json({ error: "Owner access required" }, 403);

  const url = new URL(req.url);
  const range = url.searchParams.get("range") || "30d";
  const daysParam = Number(url.searchParams.get("days") || range.replace(/[^0-9]/g, ""));
  const days = [1, 7, 30, 90].includes(daysParam) ? daysParam : 30;

  const dbUrl = new URL("/rest/v1/qr_scan_events", supabaseUrl);
  dbUrl.searchParams.set(
    "select",
    "id,scanned_at,campaign,city,region,country,country_code,latitude,longitude,timezone,user_agent,referrer,qr_type,province,district,subdistrict,location_permission,download_source,apk_version"
  );
  dbUrl.searchParams.set("qr_type", "eq.download");
  dbUrl.searchParams.set("scanned_at", `gte.${new Date(Date.now() - 90 * 86400000).toISOString()}`);
  dbUrl.searchParams.set("order", "scanned_at.desc");
  dbUrl.searchParams.set("limit", "10000");

  const response = await fetch(dbUrl, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (!response.ok) return json({ error: "Database query failed" }, 502);

  const rows = await response.json();
  const now = Date.now();
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const weekStart = now - 7 * 86400000;
  const monthStart = now - 30 * 86400000;

  const locations = new Map<string, any>();
  const campaigns = new Map<string, number>();
  const devices = new Map<string, number>();

  for (const row of rows) {
    const province = row.province || row.region || null;
    const district = row.district || row.city || null;
    const subdistrict = row.subdistrict || null;
    const locKey = [row.country_code || "", province || "", district || "", subdistrict || ""].join("|");
    const loc = locations.get(locKey) || {
      country: row.country || "Unknown",
      province: province || "Unknown",
      district: district || null,
      subdistrict: subdistrict || null,
      city: row.city || district || null,
      country_code: row.country_code || null,
      // Existing legacy rows may contain approximate IP coordinates. New browser-derived
      // rows intentionally leave these fields null to avoid returning raw GPS.
      latitude: typeof row.latitude === "number" ? row.latitude : null,
      longitude: typeof row.longitude === "number" ? row.longitude : null,
      scans: 0,
      last_scan: row.scanned_at,
    };
    loc.scans++;
    if (new Date(row.scanned_at).getTime() > new Date(loc.last_scan).getTime()) loc.last_scan = row.scanned_at;
    locations.set(locKey, loc);

    const campaign = row.campaign || "unknown";
    campaigns.set(campaign, (campaigns.get(campaign) || 0) + 1);

    const device = deviceOf(row.user_agent);
    devices.set(device, (devices.get(device) || 0) + 1);
  }

  const timeline = Array.from({ length: days }, (_, i) => {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - (days - 1 - i));
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    const count = rows.filter((row: any) => {
      const time = new Date(row.scanned_at).getTime();
      return time >= day.getTime() && time < next.getTime();
    }).length;
    return { date: day.toISOString().slice(0, 10), scans: count };
  });

  const events = rows.slice(0, 100).map((row: any) => ({
    id: row.id,
    scanned_at: row.scanned_at,
    campaign: row.campaign || "unknown",
    country: row.country,
    country_code: row.country_code,
    province: row.province || row.region,
    district: row.district || row.city,
    subdistrict: row.subdistrict,
    city: row.city,
    location_permission: row.location_permission,
    download_source: row.download_source,
    apk_version: row.apk_version,
    latitude: row.latitude,
    longitude: row.longitude,
    timezone: row.timezone,
    device: deviceOf(row.user_agent),
    referrer: row.referrer,
  }));

  return json({
    total_scans: rows.length,
    today_scans: rows.filter((row: any) => new Date(row.scanned_at).getTime() >= dayStart.getTime()).length,
    week_scans: rows.filter((row: any) => new Date(row.scanned_at).getTime() >= weekStart).length,
    month_scans: rows.filter((row: any) => new Date(row.scanned_at).getTime() >= monthStart).length,
    locations: [...locations.values()].sort((a, b) => b.scans - a.scans),
    campaigns: [...campaigns].map(([name, scans]) => ({ name, scans })).sort((a, b) => b.scans - a.scans),
    devices: [...devices].map(([name, scans]) => ({ name, scans })).sort((a, b) => b.scans - a.scans),
    timeline,
    events,
    generated_at: new Date().toISOString(),
  });
});
