# TBS License Center

Standalone web interface for managing TBS Incentive licenses.

## Naming
The product-facing name is **TBS License Center / ศูนย์จัดการสิทธิ์**.
The UI intentionally avoids the phrase "Owner Console".

## Current backend baseline
- Supabase project: `cqzuhwzvxrmlezfkbpwv`
- Owner authorization: resolved server-side from the authenticated Supabase user
- App baseline: TBS Incentive v1.9.0
- Client uses Supabase Publishable Key only. No service_role key.

## RPCs used
- `owner_search_license_users(p_email text)`
- `owner_grant_monthly(p_target_user_id uuid)`
- `owner_grant_lifetime(p_target_user_id uuid)`
- `owner_grant_custom(p_target_user_id uuid, p_duration_days integer)`
- `owner_suspend_license(p_target_user_id uuid)`
- `owner_activate_license(p_target_user_id uuid)`
- `owner_get_license_audit_v2(p_target_user_id uuid)`

## Run locally
Because the browser loads Supabase JS from CDN, serve this folder with any static server.

Example:
`python3 -m http.server 8080`

Then open:
`http://localhost:8080`

## Deployment
Deploy the folder as a static site to a host such as Cloudflare Pages, Netlify, Vercel, GitHub Pages (with suitable auth redirect handling), or your preferred static hosting.

Before public deployment, add the production site URL to Supabase Auth URL configuration if email/password auth redirects are needed.

## Security
The browser only has the public Supabase key. Authorization depends on the database-side owner UID checks in the RPCs. Do not add a service_role key to any file in this project.
