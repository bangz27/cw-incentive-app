-- V1.8.1 Owner Custom License
-- Preserve app_licenses plan constraint: custom duration is represented as MONTHLY
-- and identified by GRANT_CUSTOM + duration_days in the owner audit log.

alter table public.license_audit_log
  add column if not exists duration_days integer;

alter table public.license_audit_log
  drop constraint if exists license_audit_log_action_check;

alter table public.license_audit_log
  add constraint license_audit_log_action_check
  check (action in ('GRANT_MONTHLY','RENEW_MONTHLY','GRANT_LIFETIME','GRANT_CUSTOM','SUSPEND','ACTIVATE'));

alter table public.license_audit_log
  add constraint license_audit_log_duration_days_check
  check (duration_days is null or (duration_days >= 1 and duration_days <= 3650));

create or replace function public.owner_grant_custom(
  p_target_user_id uuid,
  p_duration_days integer
)
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
begin
  perform public.assert_license_console_owner();
  if p_duration_days is null or p_duration_days < 1 or p_duration_days > 3650 then
    raise exception 'duration must be an integer between 1 and 3650 days' using errcode = '22023';
  end if;

  select u.email::text into target_email from auth.users u where u.id = p_target_user_id;
  if target_email is null then raise exception 'target user not found'; end if;
  select * into old_record from public.app_licenses where user_id = p_target_user_id for update;
  if old_record.plan = 'LIFETIME' then raise exception 'lifetime license cannot be changed to custom'; end if;

  new_started := now();
  new_expires := new_started + make_interval(days => p_duration_days);

  insert into public.app_licenses (user_id, email, plan, status, started_at, expires_at, granted_at, updated_at)
  values (p_target_user_id, target_email, 'MONTHLY', 'ACTIVE', new_started, new_expires, now(), now())
  on conflict (user_id) do update set email = excluded.email, plan = excluded.plan, status = excluded.status,
    started_at = excluded.started_at, expires_at = excluded.expires_at, granted_at = excluded.granted_at, updated_at = excluded.updated_at;

  insert into public.license_audit_log (
    owner_user_id, target_user_id, action, old_plan, new_plan, old_status, new_status,
    old_expires_at, new_expires_at, duration_days
  ) values (
    owner_id, p_target_user_id, 'GRANT_CUSTOM', old_record.plan, 'MONTHLY', old_record.status, 'ACTIVE',
    old_record.expires_at, new_expires, p_duration_days
  );

  return query select * from public.owner_license_snapshot(p_target_user_id);
end;
$$;

create or replace function public.owner_get_license_audit_v2(p_target_user_id uuid default null)
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
  duration_days integer,
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
           a.old_status, a.new_status, a.old_expires_at, a.new_expires_at,
           a.duration_days, a.created_at
    from public.license_audit_log a
    where p_target_user_id is null or a.target_user_id = p_target_user_id
    order by a.created_at desc
    limit 100;
end;
$$;

revoke all on function public.owner_grant_custom(uuid, integer) from public, anon;
revoke all on function public.owner_get_license_audit_v2(uuid) from public, anon;
grant execute on function public.owner_grant_custom(uuid, integer) to authenticated;
grant execute on function public.owner_get_license_audit_v2(uuid) to authenticated;
