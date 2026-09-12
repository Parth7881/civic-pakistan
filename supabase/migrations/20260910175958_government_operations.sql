-- Government operations, evidence-quality assessment fields, and contribution ledger.
-- Additive migration: apply after 20260910150612_reporting_location_policy.sql.

alter table public.profiles
  add column avatar_url text,
  add column leaderboard_visible boolean not null default true;

alter table public.citizen_reports drop constraint citizen_reports_status_check;
alter table public.citizen_reports
  add constraint citizen_reports_status_check check (status in ('SUBMITTED','UNDER_REVIEW','ACCEPTED','IN_PROGRESS','RESOLVED','REJECTED','ASSOCIATED_DUPLICATE')),
  add column evidence_quality_score numeric(3,1) check (evidence_quality_score between 0 and 10),
  add column evidence_quality_status text not null default 'PENDING' check (evidence_quality_status in ('PENDING','SCORED','UNAVAILABLE')),
  add column evidence_quality_notes text check (char_length(evidence_quality_notes) <= 240),
  add column rejection_reason text check (char_length(rejection_reason) between 20 and 500),
  add column reviewed_at timestamptz,
  add column reviewed_by uuid references public.profiles(id);

alter table public.incidents drop constraint incidents_status_check;
alter table public.incidents add constraint incidents_status_check check (status in ('SUBMITTED','ACCEPTED','IN_PROGRESS','RESOLVED','VERIFIED_RESOLVED','FLAGGED_FOR_REREVIEW','REJECTED'));

create table public.government_memberships (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete restrict,
 jurisdiction_id uuid not null references public.jurisdictions(id) on delete restrict,
 role_in_jurisdiction text not null default 'reviewer' check (role_in_jurisdiction in ('reviewer','supervisor')),
 active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(user_id,jurisdiction_id)
);
create index government_memberships_user_idx on public.government_memberships(user_id) where active;

create table public.incident_events (
 id uuid primary key default gen_random_uuid(), incident_id uuid not null references public.incidents(id),
 event_type text not null check (event_type in ('SUBMITTED','ACCEPTED','REJECTED','PROGRESS_UPDATE','RESOLVED')),
 actor_id uuid not null references public.profiles(id), actor_role text not null,
 payload jsonb not null default '{}', created_at timestamptz not null default now()
);
create index incident_events_incident_idx on public.incident_events(incident_id,created_at);
create unique index incident_submission_once on public.incident_events(incident_id,event_type) where event_type='SUBMITTED';

create table public.government_updates (
 id uuid primary key default gen_random_uuid(), incident_id uuid not null references public.incidents(id),
 author_id uuid not null references public.profiles(id), body text not null check (char_length(body) between 10 and 500),
 update_type text not null default 'PROGRESS' check (update_type in ('PROGRESS','RESOLUTION')),
 created_at timestamptz not null default now()
);
create index government_updates_incident_idx on public.government_updates(incident_id,created_at);

create table public.resolution_uploads (
 id uuid primary key, incident_id uuid not null references public.incidents(id),
 government_user_id uuid not null references public.profiles(id), storage_path_private text not null unique,
 storage_path_public text not null unique, media_hash text not null, created_at timestamptz not null default now()
);
create index resolution_uploads_incident_idx on public.resolution_uploads(incident_id);

create table public.contribution_ledger (
 id uuid primary key default gen_random_uuid(), citizen_id uuid not null references public.profiles(id),
 incident_id uuid references public.incidents(id), event_type text not null,
 points_delta integer not null check (points_delta between -100 and 100), created_at timestamptz not null default now(),
 unique(citizen_id,incident_id,event_type)
);
create index contribution_ledger_city_rank_idx on public.contribution_ledger(citizen_id,created_at desc);

-- Record the initial citizen action for both existing and future incidents.
insert into public.incident_events(incident_id,event_type,actor_id,actor_role)
select i.id,'SUBMITTED',r.citizen_id,'citizen'
from public.incidents i join public.citizen_reports r on r.id=i.primary_report_id
on conflict do nothing;
create function public.record_incident_submission() returns trigger language plpgsql set search_path='' as $$
declare reporter uuid;
begin
 select citizen_id into reporter from public.citizen_reports where id=new.primary_report_id;
 if reporter is not null then insert into public.incident_events(incident_id,event_type,actor_id,actor_role) values(new.id,'SUBMITTED',reporter,'citizen') on conflict do nothing; end if;
 return new;
end $$;
create trigger incident_submission_event after insert on public.incidents for each row execute function public.record_incident_submission();

alter table public.government_memberships enable row level security;
alter table public.incident_events enable row level security;
alter table public.government_updates enable row level security;
alter table public.resolution_uploads enable row level security;
alter table public.contribution_ledger enable row level security;
revoke all on public.government_memberships,public.incident_events,public.government_updates,public.resolution_uploads,public.contribution_ledger from anon,authenticated;
grant all on public.government_memberships,public.incident_events,public.government_updates,public.resolution_uploads,public.contribution_ledger to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('resolution-originals','resolution-originals',false,5242880,array['image/jpeg','image/png']),
 ('resolution-display','resolution-display',false,5242880,array['image/jpeg']) on conflict(id) do nothing;

create function public.government_review_incident(
 p_actor uuid,p_incident uuid,p_action text,p_reason text default null,
 p_category text default null,p_urgency text default null,p_workstream text default null
) returns void language plpgsql set search_path='' as $$
declare target public.incidents; reporter uuid; actor_profile_role text;
begin
 select role into actor_profile_role from public.profiles where id=p_actor and role in ('government_user','platform_admin');
 if actor_profile_role is null then raise exception 'Government access required'; end if;
 select * into target from public.incidents where id=p_incident for update;
 if not found then raise exception 'Incident not found'; end if;
 if not exists(select 1 from public.government_memberships where user_id=p_actor and jurisdiction_id=target.jurisdiction_id and active) and
    not exists(select 1 from public.profiles where id=p_actor and role='platform_admin') then raise exception 'Incident is outside your assigned jurisdiction'; end if;
 select citizen_id into reporter from public.citizen_reports where id=target.primary_report_id and status in ('SUBMITTED','UNDER_REVIEW') for update;
 if reporter is null then raise exception 'Report is no longer awaiting review'; end if;
 if p_action='ACCEPT' then
   if p_category is null or p_category not in ('Roads','Waste & cleanliness','Street lighting','Water & drainage','Public spaces','Traffic & obstruction','Other') then raise exception 'Choose a valid category'; end if;
   if p_urgency not in ('URGENT_HAZARD','MAINTENANCE') then raise exception 'Choose a valid urgency'; end if;
   if p_workstream is null or p_workstream not in ('Road maintenance','Sanitation','Electrical services','Water services','Parks & public realm','Traffic management','General operations') then raise exception 'Choose a valid workstream'; end if;
   update public.citizen_reports set status='ACCEPTED',reviewed_at=now(),reviewed_by=p_actor,updated_at=now() where id=target.primary_report_id;
   update public.incidents set status='ACCEPTED',category=trim(p_category),urgency=p_urgency,workstream=trim(p_workstream),accepted_at=now(),sla_deadline=now()+case when p_urgency='URGENT_HAZARD' then interval '48 hours' else interval '7 days' end,is_public=not is_demo where id=p_incident;
   insert into public.contribution_ledger(citizen_id,incident_id,event_type,points_delta) values(reporter,p_incident,'REPORT_ACCEPTED',10) on conflict do nothing;
   insert into public.incident_events(incident_id,event_type,actor_id,actor_role,payload) values(p_incident,'ACCEPTED',p_actor,actor_profile_role,jsonb_build_object('category',trim(p_category),'urgency',p_urgency,'workstream',trim(p_workstream)));
 elsif p_action='REJECT' then
   if p_reason is null or char_length(trim(p_reason)) not between 20 and 500 then raise exception 'Rejection reason must be 20 to 500 characters'; end if;
   update public.citizen_reports set status='REJECTED',rejection_reason=trim(p_reason),reviewed_at=now(),reviewed_by=p_actor,updated_at=now() where id=target.primary_report_id;
   update public.incidents set status='REJECTED',is_public=false where id=p_incident;
   insert into public.incident_events(incident_id,event_type,actor_id,actor_role,payload) values(p_incident,'REJECTED',p_actor,actor_profile_role,jsonb_build_object('reason',trim(p_reason)));
 else raise exception 'Choose accept or reject'; end if;
end $$;

create function public.government_add_update(p_actor uuid,p_incident uuid,p_body text)
returns void language plpgsql set search_path='' as $$
declare target public.incidents; actor_profile_role text;
begin
 select * into target from public.incidents where id=p_incident for update;
 if not found or target.status not in ('ACCEPTED','IN_PROGRESS') then raise exception 'Only accepted work can be updated'; end if;
 if char_length(trim(p_body)) not between 10 and 500 then raise exception 'Update must be 10 to 500 characters'; end if;
 select p.role into actor_profile_role from public.profiles p left join public.government_memberships gm on gm.user_id=p.id and gm.jurisdiction_id=target.jurisdiction_id and gm.active where p.id=p_actor and (p.role='platform_admin' or (p.role='government_user' and gm.id is not null));
 if actor_profile_role is null then raise exception 'Incident is outside your assigned jurisdiction'; end if;
 insert into public.government_updates(incident_id,author_id,body) values(p_incident,p_actor,trim(p_body));
 update public.incidents set status='IN_PROGRESS' where id=p_incident;
 update public.citizen_reports set status='IN_PROGRESS',updated_at=now() where id=target.primary_report_id;
 insert into public.incident_events(incident_id,event_type,actor_id,actor_role,payload) values(p_incident,'PROGRESS_UPDATE',p_actor,actor_profile_role,jsonb_build_object('body',trim(p_body)));
end $$;

create function public.government_resolve_incident(p_actor uuid,p_incident uuid,p_notes text,p_upload_ids uuid[])
returns void language plpgsql set search_path='' as $$
declare target public.incidents; upload public.resolution_uploads; upload_count int; actor_profile_role text;
begin
 select * into target from public.incidents where id=p_incident for update;
 if not found or target.status not in ('ACCEPTED','IN_PROGRESS') then raise exception 'Only accepted work can be resolved'; end if;
 if char_length(trim(p_notes)) not between 20 and 500 then raise exception 'Resolution notes must be 20 to 500 characters'; end if;
 select p.role into actor_profile_role from public.profiles p left join public.government_memberships gm on gm.user_id=p.id and gm.jurisdiction_id=target.jurisdiction_id and gm.active where p.id=p_actor and (p.role='platform_admin' or (p.role='government_user' and gm.id is not null));
 if actor_profile_role is null then raise exception 'Incident is outside your assigned jurisdiction'; end if;
 upload_count=coalesce(array_length(p_upload_ids,1),0);
 if upload_count not between 1 and 5 then raise exception 'Upload between one and five completion photos'; end if;
 if (select count(*) from public.resolution_uploads where id=any(p_upload_ids) and incident_id=p_incident and government_user_id=p_actor)<>upload_count then raise exception 'Completion uploads are incomplete'; end if;
 insert into public.government_updates(incident_id,author_id,body,update_type) values(p_incident,p_actor,trim(p_notes),'RESOLUTION');
 for upload in select * from public.resolution_uploads where id=any(p_upload_ids) loop
   insert into public.evidence(report_id,incident_id,uploader_id,coordinates,captured_at,storage_path_private,storage_path_public,media_hash,is_resolution_evidence)
   values(target.primary_report_id,p_incident,p_actor,target.coordinates,now(),upload.storage_path_private,upload.storage_path_public,upload.media_hash,true);
 end loop;
 delete from public.resolution_uploads where id=any(p_upload_ids);
 update public.incidents set status='RESOLVED',resolved_at=now() where id=p_incident;
 update public.citizen_reports set status='RESOLVED',updated_at=now() where id=target.primary_report_id;
 insert into public.incident_events(incident_id,event_type,actor_id,actor_role,payload) values(p_incident,'RESOLVED',p_actor,actor_profile_role,jsonb_build_object('notes',trim(p_notes),'sla_compliance',case when now()<=target.sla_deadline then 'MET' else 'MISSED' end));
end $$;

create function public.government_incident_location(p_actor uuid,p_incident uuid)
returns table(latitude double precision,longitude double precision) language sql stable set search_path='' as $$
 select extensions.st_y(i.coordinates::extensions.geometry),extensions.st_x(i.coordinates::extensions.geometry)
 from public.incidents i join public.profiles p on p.id=p_actor
 left join public.government_memberships gm on gm.user_id=p.id and gm.jurisdiction_id=i.jurisdiction_id and gm.active
 where i.id=p_incident and (p.role='platform_admin' or (p.role='government_user' and gm.id is not null));
$$;

revoke all on function public.government_review_incident(uuid,uuid,text,text,text,text,text),public.government_add_update(uuid,uuid,text),public.government_resolve_incident(uuid,uuid,text,uuid[]),public.government_incident_location(uuid,uuid) from public,anon,authenticated;
grant execute on function public.government_review_incident(uuid,uuid,text,text,text,text,text),public.government_add_update(uuid,uuid,text),public.government_resolve_incident(uuid,uuid,text,uuid[]),public.government_incident_location(uuid,uuid) to service_role;
revoke all on function public.record_incident_submission() from public,anon,authenticated;
grant execute on function public.record_incident_submission() to service_role;

-- Append-only operational records.
create function public.prevent_audit_mutation() returns trigger language plpgsql set search_path='' as $$ begin raise exception 'Audit records are append-only'; end $$;
create trigger incident_events_immutable before update or delete on public.incident_events for each row execute function public.prevent_audit_mutation();
create trigger contribution_ledger_immutable before update or delete on public.contribution_ledger for each row execute function public.prevent_audit_mutation();
revoke all on function public.prevent_audit_mutation() from public,anon,authenticated;
grant execute on function public.prevent_audit_mutation() to service_role;
