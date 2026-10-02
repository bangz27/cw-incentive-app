import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const VERSION = "1.9.0";
const APK_URL = "https://github.com/bangz27/cw-incentive-app/releases/download/v1.9.0/TBS-Incentive-v1.9.0-release.apk";
const APP_URL = "https://bangz27.github.io/cw-incentive-app/";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";
const ALLOWED_PERMISSIONS = new Set(["granted", "denied", "timeout", "unavailable"]);
let lastNominatimRequestAt = 0;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, accept",
  "Access-Control-Allow-Methods": "GET, POST, HEAD, OPTIONS",
};

const responseHeaders = {
  ...cors,
  "Cache-Control": "no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
};

const text = (value: unknown, max = 120) => String(value ?? "").trim().slice(0, max);
const safeCampaign = (value: unknown) => text(value || "poster", 80) || "poster";
const safeSource = (value: unknown) => text(value || "qr", 40) || "qr";
const finite = (value: unknown) => typeof value === "number" && Number.isFinite(value);

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...responseHeaders, "Content-Type": "application/json" },
});

const html = (body: string, status = 200) => new Response(body, {
  status,
  headers: { ...responseHeaders, "Content-Type": "text/html; charset=utf-8" },
});

async function sha256(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes)).map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function firstAddress(address: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = text(address[key], 160);
    if (value) return value;
  }
  return null;
}

function areaFromAddress(address: Record<string, unknown> = {}) {
  const countryCode = text(address.country_code, 12).toLowerCase();
  const city = firstAddress(address, ["city", "municipality", "town"]);
  const province = firstAddress(address, ["state", "province", "region"]) || (countryCode === "th" ? city : null);
  const bangkok = /กรุงเทพ|bangkok/i.test(`${province || ""} ${city || ""}`);
  const district = firstAddress(address, bangkok
    ? ["county", "state_district", "city_district", "district", "suburb"]
    : ["county", "state_district", "city_district", "district", "municipality", "city", "town"]);
  const subdistrict = firstAddress(address, bangkok
    ? ["quarter", "suburb", "village", "neighbourhood"]
    : ["subdistrict", "tambon", "suburb", "quarter", "village", "neighbourhood"]);
  return {
    country: firstAddress(address, ["country"]),
    country_code: firstAddress(address, ["country_code"]),
    province,
    district: district && district !== province ? district : null,
    subdistrict: subdistrict && subdistrict !== district && subdistrict !== province ? subdistrict : null,
  };
}

async function reverseGeocode(db: ReturnType<typeof createClient>, latitude: number, longitude: number) {
  // Three decimals are intentionally used as a coarse cache key and lookup coordinate.
  // Reverse geocoding uses a coarse lookup, while validated browser GPS coordinates
  // are persisted separately in qr_scan_events.
  const coarseLatitude = Number(latitude.toFixed(3));
  const coarseLongitude = Number(longitude.toFixed(3));
  const cacheKey = `${coarseLatitude.toFixed(3)},${coarseLongitude.toFixed(3)}`;
  const cached = await db
    .from("qr_reverse_geocode_cache")
    .select("country,country_code,province,district,subdistrict")
    .eq("cache_key", cacheKey)
    .maybeSingle();
  if (!cached.error && cached.data) return cached.data;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const wait = Math.max(0, 1000 - (Date.now() - lastNominatimRequestAt));
    if (wait) await new Promise(resolve => setTimeout(resolve, wait));
    lastNominatimRequestAt = Date.now();
    const params = new URLSearchParams({
      format: "jsonv2",
      addressdetails: "1",
      layer: "address",
      lat: String(coarseLatitude),
      lon: String(coarseLongitude),
      "accept-language": "th,en",
    });
    const response = await fetch(`${NOMINATIM_URL}?${params}`, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        // Required by the public Nominatim usage policy.
        "User-Agent": `TBS-Incentive-Download/${VERSION} (+${APP_URL})`,
        Referer: APP_URL,
      },
    });
    if (!response.ok) return {};
    const payload = await response.json();
    const area = areaFromAddress(payload?.address || {});
    if (!area.country && !area.province && !area.district && !area.subdistrict) return {};

    const { error: cacheError } = await db.from("qr_reverse_geocode_cache").upsert({
      cache_key: cacheKey,
      ...area,
      updated_at: new Date().toISOString(),
    }, { onConflict: "cache_key" });
    if (cacheError) console.error("reverse_geocode_cache_failed", cacheError.message);
    return area;
  } catch (error) {
    console.error("reverse_geocode_failed", String(error));
    return {};
  } finally {
    clearTimeout(timeout);
  }
}

function pageScript(config: Record<string, string>) {
  // Escape HTML-sensitive characters before embedding JSON in a script block.
  return JSON.stringify(config).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

function downloadPage(config: Record<string, string>) {
  const configJson = pageScript(config);
  return `<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#f97316">
  <title>ดาวน์โหลด TBS Incentive</title>
  <style>
    :root{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Noto Sans Thai",sans-serif;color:#25201c;background:#fffaf6}
    *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:linear-gradient(145deg,#fffaf6,#fff1e5)}
    main{width:min(430px,100%);background:#fff;border:1px solid #f0dfd1;border-radius:24px;padding:28px 22px;box-shadow:0 18px 60px rgba(105,58,20,.12);text-align:center}
    .logo{width:70px;height:70px;border-radius:19px;object-fit:contain;margin:0 auto 14px;display:block}
    h1{font-size:22px;margin:0 0 8px;letter-spacing:-.03em}p{color:#756b64;font-size:13px;line-height:1.65;margin:0 auto 20px}
    button{width:100%;border:0;border-radius:13px;padding:14px 18px;background:#f97316;color:#fff;font-size:15px;font-weight:800;cursor:pointer;box-shadow:0 10px 20px rgba(249,115,22,.2)}
    button:disabled{opacity:.6;cursor:wait}.status{min-height:22px;margin:13px 0 0;color:#8c7d73;font-size:12px}.fallback{display:block;margin-top:14px;color:#c45e17;font-size:11px}
    .attribution{margin-top:18px;font-size:10px;color:#aaa;line-height:1.5}.attribution a{color:inherit}
  </style>
</head>
<body>
  <main>
    <img class="logo" src="${APP_URL}assets/tbs-license-center-logo.jpg" alt="TBS Incentive">
    <h1>ดาวน์โหลด TBS Incentive</h1>
    <p>กดปุ่มด้านล่างเพื่อดาวน์โหลด APK<br>ระบบจะขอสิทธิ์ตำแหน่งเฉพาะตอนกดดาวน์โหลดเท่านั้น</p>
    <button id="downloadButton" type="button">ดาวน์โหลด APK</button>
    <div id="status" class="status" role="status" aria-live="polite"></div>
    <a class="fallback" href="${APK_URL}">หากเบราว์เซอร์ไม่รองรับ ให้เปิดลิงก์ดาวน์โหลดโดยตรง</a>
    <div class="attribution">ข้อมูลพื้นที่ใช้ Nominatim · <a href="https://www.openstreetmap.org/copyright" rel="noreferrer">© OpenStreetMap contributors</a></div>
  </main>
  <script>
    const config = ${configJson};
    const button = document.getElementById("downloadButton");
    const status = document.getElementById("status");
    const setStatus = value => { status.textContent = value; };
    const finish = async (permission, coords) => {
      const payload = {
        download_id: config.download_id,
        campaign: config.campaign,
        download_source: config.download_source,
        apk_version: config.apk_version,
        location_permission: permission,
        referrer: document.referrer || config.referrer || ""
      };
      if (coords) {
        payload.latitude = coords.latitude;
        payload.longitude = coords.longitude;
      }
      try {
        setStatus("กำลังเตรียมไฟล์ดาวน์โหลด…");
        const response = await fetch(config.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(payload)
        });
        const body = await response.json().catch(() => ({}));
        window.location.href = body.download_url || config.apk_url;
      } catch (_) {
        // Download must remain available even when analytics/geocoding is unavailable.
        window.location.href = config.apk_url;
      }
    };
    button.addEventListener("click", () => {
      if (button.disabled) return;
      button.disabled = true;
      setStatus("กำลังขอสิทธิ์ตำแหน่ง…");
      if (!navigator.geolocation) return finish("unavailable");
      navigator.geolocation.getCurrentPosition(
        position => finish("granted", { latitude: position.coords.latitude, longitude: position.coords.longitude }),
        error => finish(error.code === 1 ? "denied" : error.code === 3 ? "timeout" : "unavailable"),
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
      );
    });
  </script>
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 204, headers: responseHeaders });
  // Health checks and browser prefetches must never create analytics events.
  if (req.method === "HEAD") return new Response(null, { status: 204, headers: responseHeaders });

  const url = new URL(req.url);
  if (req.method === "GET") {
    const downloadPageUrl = new URL("download.html", APP_URL);
    for (const key of ["campaign", "source"]) {
      const value = url.searchParams.get(key);
      if (value) downloadPageUrl.searchParams.set(key, value);
    }
    return new Response(null, {
      status: 302,
      headers: { ...responseHeaders, Location: downloadPageUrl.toString() },
    });
  }

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "Server configuration error" }, 500);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch (_) {
    return json({ error: "Invalid JSON" }, 400);
  }

  const downloadId = text(body.download_id, 80);
  const permission = text(body.location_permission, 20);
  const latitude = body.latitude;
  const longitude = body.longitude;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(downloadId)) {
    return json({ error: "Invalid download_id" }, 400);
  }
  if (!ALLOWED_PERMISSIONS.has(permission)) return json({ error: "Invalid location_permission" }, 400);
  if (permission === "granted" && (!finite(latitude) || !finite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180)) {
    return json({ error: "Invalid coordinates" }, 400);
  }

  const db = createClient(supabaseUrl, serviceKey);
  const area = permission === "granted"
    ? await reverseGeocode(db, Number(latitude), Number(longitude))
    : {};
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  const ipHash = forwarded ? await sha256(forwarded) : null;
  const province = text(area.province, 160) || null;
  const district = text(area.district, 160) || null;
  const subdistrict = text(area.subdistrict, 160) || null;
  const country = text(area.country, 160) || null;
  const countryCode = text(area.country_code, 12) || null;
  const gpsLatitude = permission === "granted" ? Number(latitude) : null;
  const gpsLongitude = permission === "granted" ? Number(longitude) : null;

  const { error: insertError } = await db.from("qr_scan_events").upsert({
    download_id: downloadId,
    qr_type: "download",
    campaign: safeCampaign(body.campaign),
    apk_version: VERSION,
    download_source: safeSource(body.download_source),
    location_permission: permission,
    province,
    district,
    subdistrict,
    country,
    country_code: countryCode,
    latitude: gpsLatitude,
    longitude: gpsLongitude,
    region: province,
    city: district,
    referrer: text(body.referrer || req.headers.get("referer"), 500) || null,
    user_agent: text(req.headers.get("user-agent"), 500) || null,
    ip_hash: ipHash,
  }, { onConflict: "download_id", ignoreDuplicates: true });

  if (insertError) {
    console.error("download_event_insert_failed", insertError.message);
    // Do not block the user's APK download when analytics storage is unavailable.
  }

  return json({ ok: true, download_url: APK_URL });
});
