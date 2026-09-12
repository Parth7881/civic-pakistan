-- Platform-admin government account provisioning and access administration.
-- Apply after 20260910175958_government_operations.sql.

alter table public.government_memberships
  drop constraint if exists government_memberships_role_in_jurisdiction_check;
update public.government_memberships
set role_in_jurisdiction='operator'
where role_in_jurisdiction='supervisor';
alter table public.government_memberships
  add constraint government_memberships_role_in_jurisdiction_check
  check (role_in_jurisdiction in ('reviewer','operator'));

create table public.platform_admin_events (
 id uuid primary key default gen_random_uuid(),
 actor_id uuid not null references public.profiles(id) on delete restrict,
 target_user_id uuid not null references public.profiles(id) on delete restrict,
 membership_id uuid references public.government_memberships(id) on delete set null,
 event_type text not null check (event_type in ('GOVERNMENT_USER_PROVISIONED','MEMBERSHIP_EDITED','ACCESS_ENABLED','ACCESS_DISABLED')),
 payload jsonb not null default '{}',
 created_at timestamptz not null default now()
);
create index platform_admin_events_target_idx on public.platform_admin_events(target_user_id,created_at desc);
alter table public.platform_admin_events enable row level security;
revoke all on public.platform_admin_events from anon,authenticated;
grant all on public.platform_admin_events to service_role;

-- Reviewers decide submitted reports. Only operators (and Platform Admins) may publish progress or resolution updates.
create function public.require_government_operator() returns trigger language plpgsql set search_path='' as $$
declare incident_area uuid;
begin
 select jurisdiction_id into incident_area from public.incidents where id=new.incident_id;
 if not exists(select 1 from public.profiles where id=new.author_id and role='platform_admin') and
    not exists(select 1 from public.government_memberships where user_id=new.author_id and jurisdiction_id=incident_area and role_in_jurisdiction='operator' and active) then
   raise exception 'Operator access required for progress and resolution updates';
 end if;
 return new;
end $$;
create trigger government_updates_operator before insert on public.government_updates for each row execute function public.require_government_operator();
revoke all on function public.require_government_operator() from public,anon,authenticated;
grant execute on function public.require_government_operator() to service_role;

create function public.admin_provision_government_user(
 p_actor uuid,p_user uuid,p_name text,p_jurisdiction uuid,p_membership_role text
) returns uuid language plpgsql set search_path='' as $$
declare membership uuid;
begin
 if not exists(select 1 from public.profiles where id=p_actor and role='platform_admin') then raise exception 'Platform Admin access required'; end if;
 if p_actor=p_user then raise exception 'A Platform Admin cannot replace their own account role'; end if;
 if p_name is null or char_length(trim(p_name)) not between 2 and 80 then raise exception 'Enter a valid full name'; end if;
 if p_membership_role not in ('reviewer','operator') then raise exception 'Choose a valid government role'; end if;
 if not exists(select 1 from public.jurisdictions where id=p_jurisdiction and level_label='local') then raise exception 'Choose a valid city or civic area'; end if;
 if exists(select 1 from public.profiles where id=p_user and role='platform_admin') then raise exception 'Platform Admin accounts cannot be reassigned'; end if;

 insert into public.profiles(id,display_name,role,active_jurisdiction_id)
 values(p_user,trim(p_name),'government_user',p_jurisdiction)
 on conflict(id) do update set display_name=excluded.display_name,role='government_user',active_jurisdiction_id=p_jurisdiction;

 insert into public.government_memberships(user_id,jurisdiction_id,role_in_jurisdiction,active,updated_at)
 values(p_user,p_jurisdiction,p_membership_role,true,now())
 on conflict(user_id,jurisdiction_id) do update set role_in_jurisdiction=excluded.role_in_jurisdiction,active=true,updated_at=now()
 returning id into membership;

 insert into public.platform_admin_events(actor_id,target_user_id,membership_id,event_type,payload)
 values(p_actor,p_user,membership,'GOVERNMENT_USER_PROVISIONED',jsonb_build_object('jurisdiction_id',p_jurisdiction,'role',p_membership_role));
 return membership;
end $$;

create function public.admin_update_government_membership(
 p_actor uuid,p_membership uuid,p_jurisdiction uuid,p_membership_role text
) returns void language plpgsql set search_path='' as $$
declare target_user uuid; previous_jurisdiction uuid; previous_role text;
begin
 if not exists(select 1 from public.profiles where id=p_actor and role='platform_admin') then raise exception 'Platform Admin access required'; end if;
 if p_membership_role not in ('reviewer','operator') then raise exception 'Choose a valid government role'; end if;
 if not exists(select 1 from public.jurisdictions where id=p_jurisdiction and level_label='local') then raise exception 'Choose a valid city or civic area'; end if;
 select user_id,jurisdiction_id,role_in_jurisdiction into target_user,previous_jurisdiction,previous_role
 from public.government_memberships where id=p_membership for update;
 if target_user is null then raise exception 'Government membership not found'; end if;
 if not exists(select 1 from public.profiles where id=target_user and role='government_user') then raise exception 'Target is not a Government user'; end if;

 update public.government_memberships
 set jurisdiction_id=p_jurisdiction,role_in_jurisdiction=p_membership_role,updated_at=now()
 where id=p_membership;
 update public.profiles set active_jurisdiction_id=p_jurisdiction where id=target_user;
 insert into public.platform_admin_events(actor_id,target_user_id,membership_id,event_type,payload)
 values(p_actor,target_user,p_membership,'MEMBERSHIP_EDITED',jsonb_build_object('previous_jurisdiction_id',previous_jurisdiction,'jurisdiction_id',p_jurisdiction,'previous_role',previous_role,'role',p_membership_role));
end $$;

create function public.admin_set_government_access(p_actor uuid,p_user uuid,p_enabled boolean)
returns void language plpgsql set search_path='' as $$
declare changed integer;
begin
 if not exists(select 1 from public.profiles where id=p_actor and role='platform_admin') then raise exception 'Platform Admin access required'; end if;
 if p_enabled is null then raise exception 'Choose whether access is enabled'; end if;
 if not exists(select 1 from public.profiles where id=p_user and role='government_user') then raise exception 'Target is not a Government user'; end if;
 update public.government_memberships set active=p_enabled,updated_at=now() where user_id=p_user;
 get diagnostics changed=row_count;
 if changed=0 then raise exception 'Government membership not found'; end if;
 insert into public.platform_admin_events(actor_id,target_user_id,event_type,payload)
 values(p_actor,p_user,case when p_enabled then 'ACCESS_ENABLED' else 'ACCESS_DISABLED' end,jsonb_build_object('enabled',p_enabled,'membership_count',changed));
end $$;

revoke all on function public.admin_provision_government_user(uuid,uuid,text,uuid,text),public.admin_update_government_membership(uuid,uuid,uuid,text),public.admin_set_government_access(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.admin_provision_government_user(uuid,uuid,text,uuid,text),public.admin_update_government_membership(uuid,uuid,uuid,text),public.admin_set_government_access(uuid,uuid,boolean) to service_role;

create trigger platform_admin_events_immutable before update or delete on public.platform_admin_events for each row execute function public.prevent_audit_mutation();
