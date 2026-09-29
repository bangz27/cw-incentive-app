# TBS Incentive v1.9.0 — Download Analytics Authorization Fix Report

วันที่ตรวจสอบ: 29 กันยายน 2026

## Final status

**FIX DEPLOYED — Owner authorization and production Download Analytics are working.** The production Owner session now reaches the analytics API successfully and the dashboard displays current Supabase data.

## Root cause

The system had two separate authorization paths. The static License Center frontend used a hardcoded Owner UUID in `license-center/app.js`, while the Edge Function used `admin.auth.getUser(token)` followed by a direct `license_console_owners` table query. The direct table query ignored its error result and converted any lookup failure into the generic `403 Owner access required` response.

The authenticated database identity was not wrong: the production Owner email `nitipon.dn@gmail.com` matched the single record in `public.license_console_owners` by `auth.users.id`. The defect was the split authorization path and the silent direct-lookup failure, not the Owner record.

The fix makes the backend the source of truth. The Edge Function still verifies the presented JWT with `admin.auth.getUser(token)`, then performs the authoritative Owner check through the existing `owner_is_current_user()` security-definer RPC. That RPC checks `auth.uid()` against `public.license_console_owners`. Lookup errors now fail closed with HTTP 500 instead of being misreported as a non-owner. Non-owners still receive HTTP 403.

The frontend no longer contains the Owner UUID. After Supabase Auth resolves the user, it calls `owner_is_current_user()` and only displays the management UI when the backend returns `true`. Analytics requests continue to use the latest Supabase session `access_token` as `Authorization: Bearer <access_token>`.

## Files changed

- `license-center/app.js` — removed hardcoded Owner UUID and switched the frontend gate to `owner_is_current_user()`.
- `license-center/download-analytics.js` — aligned normalization with the Edge Function fields `scanned_at` and `date`.
- `license-center/README.md` — removed public Owner UUID and documented server-side authorization.
- `supabase/functions/tbs-download-dashboard/index.ts` — added the deployed Edge Function source with JWT identity verification, backend Owner RPC check, explicit 401/403/500 behavior, and `range` support.
- `test/license-center-analytics.test.js` — added contracts for backend-sourced Owner authorization, no UUID exposure, JWT headers, and fail-closed behavior.

No QR tracking function, QR URL, `qr_scan_events` table, calculation engine, incentive rates, APK signing configuration, or production app package was changed.

## Supabase deployment

| Function | Version | SHA-256 / ezbr_sha256 | Status |
|---|---:|---|---|
| `tbs-download-dashboard` | 3 | `b2e6b014e3906b1fe28aded59b3bf3d4234314f1c5cec464f6a0d8ca1e0b83be` | ACTIVE, `verify_jwt=true` |
| `tbs-download-v15` | 4 | `e0870fbf168f475e1869d65cbb4609d3347dd57921bb0025eb198215c70c0570` | ACTIVE, unchanged |

The response does not include the authenticated user UUID or raw IP address. The Edge Function uses its server-side service key only; no service key is present in frontend files.

## Git commits

| Branch | Commit |
|---|---|
| `feature/v1.9` | `79829fbd4e87f8bfc3b66e84bcd1e86d46018b18` |
| `feature/tbs-license-center-v1.9` | `fc5f8e73d2c336c54a14a8ec178b3b758f6681a4` |

GitHub Pages deployment run: [Actions run 36524091646](https://github.com/bangz27/cw-incentive-app/actions/runs/36524091646)

Production URL: [https://bangz27.github.io/cw-incentive-app/](https://bangz27.github.io/cw-incentive-app/)

## Test matrix

| Test | Result | Evidence |
|---|---|---|
| A. Unauthenticated | **PASS** | Direct request to the Edge Function returned HTTP 401 with `UNAUTHORIZED_NO_AUTH_HEADER`. |
| B. Authenticated non-owner | **Security path verified; live non-owner token not available in the connected browser** | Source and regression contract verify the valid-session/non-owner branch returns HTTP 403 `Owner access required`. No non-owner credentials were created or requested, so no live non-owner login was performed. |
| C. Authenticated Owner | **PASS** | Production Owner session reached the Edge Function and returned analytics JSON with HTTP 200. |
| D. Production Browser | **PASS** | Connected browser showed `nitipon.dn@gmail.com`, `Authorized`, `Connected`, `LIVE · 10s`, and populated dashboard data. |

Automated verification:

- Analytics authorization tests: **5 PASS / 0 FAIL**
- Full repository regression suite: **65 PASS / 0 FAIL**
- JavaScript syntax: **PASS**
- Public Pages asset/security scan: **PASS**
- QR source unchanged: **PASS**
- Protected calculation/license/signing files: **UNCHANGED**

## Production Browser evidence

After opening the production URL with the authenticated Owner session and selecting **Download Analytics**, the page displayed:

- `Total Downloads: 2`
- `Today: 0`
- `7 Days: 2`
- `30 Days: 2`
- Device distribution: `Windows: 2`
- Campaign: `poster`
- Location: `Khlong Luang · Pathum Thani · Thailand`
- Recent activity: 2 records
- Status: `LIVE · 10s`

After waiting through a polling interval, the page remained `LIVE · 10s` and the populated KPI values remained visible.
