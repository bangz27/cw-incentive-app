-- V1.9.0 Browser Download Location Analytics
-- Additive only: preserve all existing qr_scan_events rows and legacy IP fields.

alter table public.qr_scan_events
  add column if not exists download_id uuid,
  add column if not exists apk_version text,
  add column if not exists download_source text,
  add column if not exists location_permission text,
  add column if not exists province text,
  add column if not exists district text,
  add column if not exists subdistrict text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'qr_scan_events_location_permission_check'
      and conrelid = 'public.qr_scan_events'::regclass
  ) then
    alter table public.qr_scan_events
      add constraint qr_scan_events_location_permission_check
      check (
        location_permission is null
        or location_permission in ('granted', 'denied', 'timeout', 'unavailable')
      );
  end if;
end;
$$;

create unique index if not exists qr_scan_events_download_id_uidx
  on public.qr_scan_events (download_id)
  where download_id is not null;

create table if not exists public.qr_reverse_geocode_cache (
  cache_key text primary key,
  country text,
  country_code text,
  province text,
  district text,
  subdistrict text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.qr_reverse_geocode_cache enable row level security;
revoke all on table public.qr_reverse_geocode_cache from public, anon, authenticated;
grant all on table public.qr_reverse_geocode_cache to service_role;
