-- V1.7.1 Owner License Console
-- Owner authorization is server-side and bound to one explicit Supabase Auth UID.

create table if not exists public.license_console_owners (
  owner_user_id uuid primary key references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
alter table public.license_console_owners enable row level security;
revoke all on table public.license_console_owners from anon, authenticated;
insert into public.license_console_owners (owner_user_id)
values ('97a8b8ef-53f4-422b-abf0-39247036a072'::uuid)
on conflict (owner_user_id) do nothing;

create table public.license_audit_log (
  id bigint generated always as identity primary key,
  owner_user_id uuid not null references auth.users(id),
  target_user_id uuid not null references auth.users(id),
  action text not null check (action in ('GRANT_MONTHLY','RENEW_MONTHLY','GRANT_LIFETIME','SUSPEND','ACTIVATE')),
  old_plan text,
  new_plan text,
  old_status text,
  new_status text,
  old_expires_at timestamptz,
  new_expires_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.license_audit_log enable row level security;
revoke all on table public.license_audit_log from anon, authenticated;

create or replace function public.owner_license_snapshot(p_target_user_id uuid)
returns table (
  target_user_id uuid,
  email text,
  plan text,
  status text,
  started_at timestamptz,
  expires_at timestamptz,
  remaining_days integer,
  is_active boolean
)
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select
    u.id,
    u.email::text,
    l.plan,
    case
      when l.status = 'SUSPENDED' then 'SUSPENDED'
      when l.status = 'EXPIRED' then 'EXPIRED'
      when l.plan <> 'LIFETIME' and l.expires_at is not null and l.expires_at <= now() then 'EXPIRED'
      else l.status
    end,
    l.started_at,
    l.expires_at,
    case
      when l.plan = 'LIFETIME' then null::integer
      when l.expires_at is null then null::integer
      else greatest(0, ceil(extract(epoch from (l.expires_at - now())) / 86400))::integer
    end,
    (
      l.status = 'ACTIVE'
      and (l.plan = 'LIFETIME' or (l.expires_at is not null and l.expires_at > now()))
    )
  from auth.users u
  left join public.app_licenses l on l.user_id = u.id
  where u.id = p_target_user_id
  limit 1;
$$;

create or replace function public.assert_license_console_owner()
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.license_console_owners o where o.owner_user_id = auth.uid()
  ) then
    raise exception 'owner authorization required' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.owner_is_current_user()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select auth.uid() is not null and exists (
    select 1 from public.license_console_owners o where o.owner_user_id = auth.uid()
  );
$$;

create or replace function public.owner_search_license_users(p_email text)
returns table (
  target_user_id uuid,
  email text,
  plan text,
  status text,
  started_at timestamptz,
  expires_at timestamptz,
  remaining_days integer,
  is_active boolean
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  perform public.assert_license_console_owner();
  return query
    select s.target_user_id, s.email, s.plan, s.status, s.started_at, s.expires_at, s.remaining_days, s.is_active
    from auth.users u
    cross join lateral public.owner_license_snapshot(u.id) s
    where coalesce(trim(p_email), '') <> ''
      and lower(coalesce(u.email, '')) like '%' || lower(trim(p_email)) || '%'
    order by lower(coalesce(u.email, ''))
    limit 25;
end;
$$;

create or replace function public.owner_get_license_audit(p_target_user_id uuid default null)
returns table (
  id bigint,
  owner_user_id uuid,
  target_user_id uuid,
  action text,
  old_plan text,
  new_plan text,
  old_status text,
  new_status text,
  old_expires_at timestamptz,
  new_expires_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  perform public.assert_license_console_owner();
  return query
    select a.id, a.owner_user_id, a.target_user_id, a.action, a.old_plan, a.new_plan,
           a.old_status, a.new_status, a.old_expires_at, a.new_expires_at, a.created_at
    from public.license_audit_log a
    where p_target_user_id is null or a.target_user_id = p_target_user_id
    order by a.created_at desc
    limit 100;
end;
$$;

create or replace function public.owner_grant_monthly(p_target_user_id uuid)
returns table (
  target_user_id uuid,
  email text,
  plan text,
  status text,
  started_at timestamptz,
  expires_at timestamptz,
  remaining_days integer,
  is_active boolean
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  owner_id uuid := auth.uid();
  old_record public.app_licenses%rowtype;
  target_email text;
  new_started timestamptz;
  new_expires timestamptz;
  action_name text;
begin
  perform public.assert_license_console_owner();
  select u.email::text into target_email from auth.users u where u.id = p_target_user_id;
  if target_email is null then raise exception 'target user not found'; end if;
  select * into old_record from public.app_licenses where user_id = p_target_user_id for update;
  if old_record.plan = 'LIFETIME' then raise exception 'lifetime license cannot be changed to monthly'; end if;
  if old_record.plan = 'MONTHLY' and old_record.status = 'ACTIVE' and old_record.expires_at > now() then
    new_started := old_record.started_at;
    new_expires := old_record.expires_at + interval '30 days';
    action_name := 'RENEW_MONTHLY';
  else
    new_started := now();
    new_expires := now() + interval '30 days';
    action_name := 'GRANT_MONTHLY';
  end if;
  insert into public.app_licenses (user_id, email, plan, status, started_at, expires_at, granted_at, updated_at)
  values (p_target_user_id, target_email, 'MONTHLY', 'ACTIVE', new_started, new_expires, now(), now())
  on conflict (user_id) do update set email = excluded.email, plan = excluded.plan, status = excluded.status,
    started_at = excluded.started_at, expires_at = excluded.expires_at, granted_at = excluded.granted_at, updated_at = excluded.updated_at;
  insert into public.license_audit_log (owner_user_id, target_user_id, action, old_plan, new_plan, old_status, new_status, old_expires_at, new_expires_at)
  values (owner_id, p_target_user_id, action_name, old_record.plan, 'MONTHLY', old_record.status, 'ACTIVE', old_record.expires_at, new_expires);
  return query select * from public.owner_license_snapshot(p_target_user_id);
end;
$$;

create or replace function public.owner_grant_lifetime(p_target_user_id uuid)
returns table (
  target_user_id uuid,
  email text,
  plan text,
  status text,
  started_at timestamptz,
  expires_at timestamptz,
  remaining_days integer,
  is_active boolean
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  owner_id uuid := auth.uid();
  old_record public.app_licenses%rowtype;
  target_email text;
begin
  perform public.assert_license_console_owner();
  select u.email::text into target_email from auth.users u where u.id = p_target_user_id;
  if target_email is null then raise exception 'target user not found'; end if;
  select * into old_record from public.app_licenses where user_id = p_target_user_id for update;
  insert into public.app_licenses (user_id, email, plan, status, started_at, expires_at, granted_at, updated_at)
  values (p_target_user_id, target_email, 'LIFETIME', 'ACTIVE', now(), null, now(), now())
  on conflict (user_id) do update set email = excluded.email, plan = excluded.plan, status = excluded.status,
    started_at = excluded.started_at, expires_at = null, granted_at = excluded.granted_at, updated_at = excluded.updated_at;
  insert into public.license_audit_log (owner_user_id, target_user_id, action, old_plan, new_plan, old_status, new_status, old_expires_at, new_expires_at)
  values (owner_id, p_target_user_id, 'GRANT_LIFETIME', old_record.plan, 'LIFETIME', old_record.status, 'ACTIVE', old_record.expires_at, null);
  return query select * from public.owner_license_snapshot(p_target_user_id);
end;
$$;

create or replace function public.owner_suspend_license(p_target_user_id uuid)
returns table (
  target_user_id uuid,
  email text,
  plan text,
  status text,
  started_at timestamptz,
  expires_at timestamptz,
  remaining_days integer,
  is_active boolean
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  owner_id uuid := auth.uid();
  old_record public.app_licenses%rowtype;
begin
  perform public.assert_license_console_owner();
  select * into old_record from public.app_licenses where user_id = p_target_user_id for update;
  if old_record.user_id is null then raise exception 'target license not found'; end if;
  update public.app_licenses set status = 'SUSPENDED', updated_at = now() where user_id = p_target_user_id;
  insert into public.license_audit_log (owner_user_id, target_user_id, action, old_plan, new_plan, old_status, new_status, old_expires_at, new_expires_at)
  values (owner_id, p_target_user_id, 'SUSPEND', old_record.plan, old_record.plan, old_record.status, 'SUSPENDED', old_record.expires_at, old_record.expires_at);
  return query select * from public.owner_license_snapshot(p_target_user_id);
end;
$$;

create or replace function public.owner_activate_license(p_target_user_id uuid)
returns table (
  target_user_id uuid,
  email text,
  plan text,
  status text,
  started_at timestamptz,
  expires_at timestamptz,
  remaining_days integer,
  is_active boolean
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  owner_id uuid := auth.uid();
  old_record public.app_licenses%rowtype;
  new_status text;
begin
  perform public.assert_license_console_owner();
  select * into old_record from public.app_licenses where user_id = p_target_user_id for update;
  if old_record.user_id is null then raise exception 'target license not found'; end if;
  new_status := case when old_record.plan = 'LIFETIME' or (old_record.expires_at is not null and old_record.expires_at > now()) then 'ACTIVE' else 'EXPIRED' end;
  update public.app_licenses set status = new_status, updated_at = now() where user_id = p_target_user_id;
  insert into public.license_audit_log (owner_user_id, target_user_id, action, old_plan, new_plan, old_status, new_status, old_expires_at, new_expires_at)
  values (owner_id, p_target_user_id, 'ACTIVATE', old_record.plan, old_record.plan, old_record.status, new_status, old_record.expires_at, old_record.expires_at);
  return query select * from public.owner_license_snapshot(p_target_user_id);
end;
$$;

revoke all on function public.owner_license_snapshot(uuid) from public, anon, authenticated;
revoke all on function public.assert_license_console_owner() from public, anon, authenticated;
revoke all on function public.owner_is_current_user() from public, anon;
revoke all on function public.owner_search_license_users(text) from public, anon;
revoke all on function public.owner_get_license_audit(uuid) from public, anon;
revoke all on function public.owner_grant_monthly(uuid) from public, anon;
revoke all on function public.owner_grant_lifetime(uuid) from public, anon;
revoke all on function public.owner_suspend_license(uuid) from public, anon;
revoke all on function public.owner_activate_license(uuid) from public, anon;
grant execute on function public.owner_is_current_user() to authenticated;
grant execute on function public.owner_search_license_users(text) to authenticated;
grant execute on function public.owner_get_license_audit(uuid) to authenticated;
grant execute on function public.owner_grant_monthly(uuid) to authenticated;
grant execute on function public.owner_grant_lifetime(uuid) to authenticated;
grant execute on function public.owner_suspend_license(uuid) to authenticated;
grant execute on function public.owner_activate_license(uuid) to authenticated;
