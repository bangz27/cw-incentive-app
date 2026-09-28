-- V1.7: Server-side license status. Uses PostgreSQL now(), never device time.
create or replace function public.get_my_license_status()
returns table (
  plan text,
  status text,
  started_at timestamptz,
  expires_at timestamptz,
  remaining_days integer,
  is_active boolean
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    l.plan,
    case
      when l.status = 'SUSPENDED' then 'SUSPENDED'
      when l.status = 'EXPIRED' then 'EXPIRED'
      when l.plan <> 'LIFETIME' and l.expires_at is not null and l.expires_at <= now() then 'EXPIRED'
      else 'ACTIVE'
    end as status,
    l.started_at,
    l.expires_at,
    case
      when l.plan = 'LIFETIME' then null::integer
      else greatest(0, ceil(extract(epoch from (l.expires_at - now())) / 86400))::integer
    end as remaining_days,
    (
      l.status = 'ACTIVE'
      and (l.plan = 'LIFETIME' or (l.expires_at is not null and l.expires_at > now()))
    ) as is_active
  from public.app_licenses l
  where l.user_id = auth.uid()
  limit 1;
$$;

grant execute on function public.get_my_license_status() to authenticated;
