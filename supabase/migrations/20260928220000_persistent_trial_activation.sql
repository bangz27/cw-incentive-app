-- V1.9.0 Login / Package Selection / persistent Trial activation
-- Trial state remains account-bound in app_licenses and is never trusted from LocalStorage.

alter table public.app_licenses
  add column if not exists trial_started_at timestamptz,
  add column if not exists trial_ends_at timestamptz,
  add column if not exists trial_used_at timestamptz;

-- Existing TRIAL rows are already evidence that the account used/started Trial.
update public.app_licenses
set trial_started_at = coalesce(trial_started_at, started_at),
    trial_ends_at = coalesce(trial_ends_at, expires_at),
    trial_used_at = coalesce(trial_used_at, started_at, now())
where plan = 'TRIAL'
  and trial_used_at is null;

drop function if exists public.get_my_license_status();

create or replace function public.get_my_license_status()
returns table (
  plan text,
  status text,
  started_at timestamptz,
  expires_at timestamptz,
  remaining_days integer,
  is_active boolean,
  trial_used boolean,
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  remaining_hours integer,
  server_now timestamptz
)
language sql
stable
security definer
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
      when l.expires_at is null then null::integer
      else greatest(0, ceil(extract(epoch from (l.expires_at - now())) / 86400))::integer
    end as remaining_days,
    (
      l.status = 'ACTIVE'
      and (l.plan = 'LIFETIME' or (l.expires_at is not null and l.expires_at > now()))
    ) as is_active,
    (l.trial_used_at is not null or l.plan = 'TRIAL') as trial_used,
    l.trial_started_at,
    l.trial_ends_at,
    case
      when l.expires_at is null then null::integer
      else greatest(0, ceil(extract(epoch from (l.expires_at - now())) / 3600))::integer
    end as remaining_hours,
    now() as server_now
  from public.app_licenses l
  where l.user_id = auth.uid()
  limit 1;
$$;

revoke all on function public.get_my_license_status() from public, anon;
grant execute on function public.get_my_license_status() to authenticated;

create or replace function public.start_my_trial()
returns table (
  plan text,
  status text,
  started_at timestamptz,
  expires_at timestamptz,
  remaining_days integer,
  is_active boolean,
  trial_used boolean,
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  remaining_hours integer,
  server_now timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text;
  old_record public.app_licenses%rowtype;
  new_started timestamptz;
  new_expires timestamptz;
begin
  if current_user_id is null then
    raise exception 'authenticated session required' using errcode = '42501';
  end if;

  select u.email::text into current_email
  from auth.users u
  where u.id = current_user_id;

  select * into old_record
  from public.app_licenses
  where user_id = current_user_id
  for update;

  if old_record.user_id is not null then
    if old_record.plan = 'LIFETIME' then
      raise exception 'lifetime license already exists' using errcode = '22023';
    end if;
    if old_record.status = 'SUSPENDED' then
      raise exception 'license is suspended' using errcode = '22023';
    end if;
    if old_record.trial_used_at is not null or old_record.plan = 'TRIAL' then
      if old_record.plan = 'TRIAL'
         and old_record.status = 'ACTIVE'
         and old_record.expires_at is not null
         and old_record.expires_at > now() then
        return query select * from public.get_my_license_status();
        return;
      end if;
      raise exception 'trial already used' using errcode = '22023';
    end if;
    if old_record.status = 'ACTIVE'
       and old_record.expires_at is not null
       and old_record.expires_at > now() then
      raise exception 'active license already exists' using errcode = '22023';
    end if;
  end if;

  new_started := now();
  new_expires := new_started + interval '14 days';

  insert into public.app_licenses (
    user_id, email, plan, status, started_at, expires_at, granted_at, updated_at,
    trial_started_at, trial_ends_at, trial_used_at
  ) values (
    current_user_id, coalesce(current_email, ''), 'TRIAL', 'ACTIVE', new_started, new_expires, now(), now(),
    new_started, new_expires, new_started
  )
  on conflict (user_id) do update set
    email = excluded.email,
    plan = excluded.plan,
    status = excluded.status,
    started_at = excluded.started_at,
    expires_at = excluded.expires_at,
    granted_at = excluded.granted_at,
    updated_at = excluded.updated_at,
    trial_started_at = excluded.trial_started_at,
    trial_ends_at = excluded.trial_ends_at,
    trial_used_at = excluded.trial_used_at;

  return query select * from public.get_my_license_status();
end;
$$;

revoke all on function public.start_my_trial() from public, anon;
grant execute on function public.start_my_trial() to authenticated;
