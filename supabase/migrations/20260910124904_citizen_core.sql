-- Part 1 only. A submitted incident is private until a future government review.
create schema if not exists extensions;
create extension if not exists postgis with schema extensions;
create table public.jurisdictions (
 id uuid primary key default gen_random_uuid(), name text not null,
 parent_id uuid references public.jurisdictions(id) on delete restrict,
 level_label text not null check (level_label in ('country','province','region','division','district','tehsil','local')),
 boundary extensions.geography(MultiPolygon,4326) not null,
 metadata jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique nulls not distinct (parent_id,name), check (id <> parent_id)
);
create index jurisdictions_boundary_idx on public.jurisdictions using gist(boundary);
create index jurisdictions_parent_idx on public.jurisdictions(parent_id);
create table public.profiles (
 id uuid primary key references auth.users(id) on delete restrict,
 display_name text check (char_length(display_name) between 1 and 80),
 role text not null default 'citizen' check (role in ('citizen','government_user','platform_admin')),
 active_jurisdiction_id uuid references public.jurisdictions(id) on delete restrict,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.capture_sessions (
 id uuid primary key default gen_random_uuid(), citizen_id uuid not null references public.profiles(id),
 coordinates extensions.geography(Point,4326) not null, accuracy_meters double precision not null check (accuracy_meters between 0 and 100),
 jurisdiction_id uuid not null references public.jurisdictions(id),
 location_timestamp timestamptz not null, started_at timestamptz not null default now(),
 expires_at timestamptz not null default now() + interval '5 minutes', consumed_at timestamptz,
 created_at timestamptz not null default now(), check (expires_at > started_at)
);
create table public.citizen_reports (
 id uuid primary key default gen_random_uuid(), citizen_id uuid not null references public.profiles(id),
 capture_session_id uuid not null unique references public.capture_sessions(id),
 jurisdiction_id uuid not null references public.jurisdictions(id),
 urgency text not null check (urgency in ('URGENT_HAZARD','MAINTENANCE')),
 description text check (char_length(description) <= 500), coordinates extensions.geography(Point,4326) not null,
 accuracy_meters double precision not null check (accuracy_meters between 0 and 100),
 submitted_at timestamptz not null default now(), status text not null default 'SUBMITTED'
 check (status in ('SUBMITTED','UNDER_REVIEW','ACCEPTED','REJECTED','ASSOCIATED_DUPLICATE')),
 requires_manual_classification boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index reports_owner_idx on public.citizen_reports(citizen_id,submitted_at desc);
create index reports_geo_idx on public.citizen_reports using gist(coordinates);
create table public.incidents (
 id uuid primary key default gen_random_uuid(), jurisdiction_id uuid not null references public.jurisdictions(id),
 primary_report_id uuid not null unique references public.citizen_reports(id), category text, urgency text check (urgency in ('URGENT_HAZARD','MAINTENANCE')),
 workstream text, status text not null default 'SUBMITTED' check (status in ('SUBMITTED','ACCEPTED','IN_PROGRESS','RESOLVED','VERIFIED_RESOLVED','FLAGGED_FOR_REREVIEW')),
 coordinates extensions.geography(Point,4326) not null, created_at timestamptz not null default now(),
 accepted_at timestamptz, sla_deadline timestamptz, resolved_at timestamptz, is_public boolean not null default false,
 check (not is_public or (status <> 'SUBMITTED' and accepted_at is not null))
);
create index incidents_geo_idx on public.incidents using gist(coordinates);
create index incidents_queue_idx on public.incidents(jurisdiction_id,status,created_at desc);
create table public.evidence (
 id uuid primary key default gen_random_uuid(), report_id uuid not null references public.citizen_reports(id),
 incident_id uuid not null references public.incidents(id), uploader_id uuid not null references public.profiles(id),
 coordinates extensions.geography(Point,4326), captured_at timestamptz not null,
 storage_path_private text not null unique, storage_path_public text not null unique,
 media_hash text not null, is_resolution_evidence boolean not null default false, created_at timestamptz not null default now()
);
create index evidence_report_idx on public.evidence(report_id);
create index evidence_incident_idx on public.evidence(incident_id);
-- Staged uploads allow up to five 2 MB photos without exceeding host request limits.
create table public.capture_uploads (
 id uuid primary key, capture_session_id uuid not null references public.capture_sessions(id),
 citizen_id uuid not null references public.profiles(id), storage_path_private text not null unique,
 storage_path_public text not null unique, captured_at timestamptz not null, media_hash text not null,
 created_at timestamptz not null default now()
);
create index capture_uploads_session_idx on public.capture_uploads(capture_session_id);
alter table public.capture_uploads enable row level security;
revoke all on public.capture_uploads from anon,authenticated;
grant all on public.capture_uploads to service_role;
-- Sensitive rows are never directly writable through the Data API.
alter table public.profiles enable row level security;
alter table public.jurisdictions enable row level security;
alter table public.capture_sessions enable row level security;
alter table public.citizen_reports enable row level security;
alter table public.incidents enable row level security;
alter table public.evidence enable row level security;
revoke all on public.profiles,public.jurisdictions,public.capture_sessions,public.citizen_reports,public.incidents,public.evidence from anon,authenticated;
grant select on public.jurisdictions to anon,authenticated;
grant select on public.profiles,public.capture_sessions,public.citizen_reports,public.incidents,public.evidence to authenticated;
grant update (display_name,active_jurisdiction_id) on public.profiles to authenticated;
grant all on public.profiles,public.jurisdictions,public.capture_sessions,public.citizen_reports,public.incidents,public.evidence to service_role;
create policy jurisdictions_read on public.jurisdictions for select to anon,authenticated using (true);
create policy profiles_own on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_edit on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy sessions_own on public.capture_sessions for select to authenticated using (citizen_id = (select auth.uid()));
create policy reports_own on public.citizen_reports for select to authenticated using (citizen_id = (select auth.uid()));
create policy incidents_owner on public.incidents for select to authenticated using (exists (select 1 from public.citizen_reports r where r.id=primary_report_id and r.citizen_id=(select auth.uid())));
create policy evidence_owner on public.evidence for select to authenticated using (uploader_id=(select auth.uid()));

create function public.create_citizen_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.profiles(id,display_name) values(new.id,coalesce(nullif(left(new.raw_user_meta_data->>'display_name',80),''),'Citizen'));
 return new;
end $$;
revoke all on function public.create_citizen_profile() from public,anon,authenticated;
create trigger auth_profile after insert on auth.users for each row execute function public.create_citizen_profile();
insert into public.profiles(id,display_name) select id,'Citizen' from auth.users on conflict do nothing;

create function public.validate_profile_jurisdiction() returns trigger language plpgsql set search_path='' as $$
begin
 if new.active_jurisdiction_id is not null and not exists(select 1 from public.jurisdictions where id=new.active_jurisdiction_id and level_label='local') then
 raise exception 'Select a city or local civic area'; end if;
 new.updated_at=now(); return new;
end $$;
create trigger profile_jurisdiction before insert or update on public.profiles for each row execute function public.validate_profile_jurisdiction();

-- Called only by the trusted server after getUser(). All geospatial checks are in SQL.
create function public.start_capture(p_citizen uuid,p_lat double precision,p_lng double precision,p_accuracy double precision,p_timestamp timestamptz)
returns uuid language plpgsql set search_path='' as $$
declare j uuid; point extensions.geography; result uuid;
begin
 if p_lat is null or p_lng is null or not (p_lat between -90 and 90 and p_lng between -180 and 180) or p_accuracy is null or not(p_accuracy between 0 and 100) then raise exception 'GPS accuracy must be 100 metres or better'; end if;
 if p_timestamp is null or p_timestamp < clock_timestamp()-interval '60 seconds' or p_timestamp > clock_timestamp()+interval '5 seconds' then raise exception 'Location expired. Refresh your GPS location'; end if;
 select active_jurisdiction_id into j from public.profiles where id=p_citizen and role='citizen';
 if j is null then raise exception 'Choose your civic area before reporting'; end if;
 point=extensions.st_setsrid(extensions.st_makepoint(p_lng,p_lat),4326)::extensions.geography;
 if not exists(select 1 from public.jurisdictions where id=j and extensions.st_covers(boundary::extensions.geometry,point::extensions.geometry)) then raise exception 'Your location is outside your selected civic area'; end if;
 if not exists(select 1 from public.jurisdictions where level_label='country' and name='Pakistan' and extensions.st_covers(boundary::extensions.geometry,point::extensions.geometry)) then raise exception 'Reporting is available inside Pakistan only'; end if;
 -- Serialize limits for this citizen across concurrent requests.
 perform pg_advisory_xact_lock(hashtextextended(p_citizen::text,0));
 if (select count(*) from public.capture_sessions where citizen_id=p_citizen and started_at>now()-interval '1 hour')>=30 then raise exception 'Too many capture attempts. Please try again later'; end if;
 insert into public.capture_sessions(citizen_id,jurisdiction_id,coordinates,accuracy_meters,location_timestamp) values(p_citizen,j,point,p_accuracy,p_timestamp) returning id into result;
 return result;
end $$;

create function public.submit_citizen_report(p_citizen uuid,p_session uuid,p_urgency text,p_description text,p_lat double precision,p_lng double precision,p_accuracy double precision,p_timestamp timestamptz,p_evidence jsonb)
returns uuid language plpgsql set search_path='' as $$
declare s public.capture_sessions; point extensions.geography; rid uuid; iid uuid; item jsonb; current_j uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_citizen::text,0));
 select * into s from public.capture_sessions where id=p_session and citizen_id=p_citizen for update;
 if not found then raise exception 'Capture session not found'; end if;
 -- Replays return the same incident, never duplicate a report.
 select i.id into iid from public.incidents i join public.citizen_reports r on r.id=i.primary_report_id where r.capture_session_id=p_session;
 if iid is not null then return iid; end if;
 if s.expires_at<clock_timestamp() or s.consumed_at is not null then raise exception 'Camera session expired. Start a new capture'; end if;
 select active_jurisdiction_id into current_j from public.profiles where id=p_citizen and role='citizen';
 if current_j is distinct from s.jurisdiction_id then raise exception 'Your civic area changed. Start a new capture'; end if;
 if p_lat is null or p_lng is null or not(p_lat between -90 and 90 and p_lng between -180 and 180) or p_accuracy is null or not(p_accuracy between 0 and 100) then raise exception 'GPS accuracy must be 100 metres or better'; end if;
 if p_timestamp is null or p_timestamp<clock_timestamp()-interval '60 seconds' or p_timestamp>clock_timestamp()+interval '5 seconds' then raise exception 'Location expired. Refresh your GPS location'; end if;
 point=extensions.st_setsrid(extensions.st_makepoint(p_lng,p_lat),4326)::extensions.geography;
 if not exists(select 1 from public.jurisdictions where id=s.jurisdiction_id and extensions.st_covers(boundary::extensions.geometry,point::extensions.geometry)) or not extensions.st_dwithin(s.coordinates,point,100) then raise exception 'Stay at the capture location inside your civic area'; end if;
 if p_urgency is null or p_urgency not in ('URGENT_HAZARD','MAINTENANCE') or char_length(p_description)>500 then raise exception 'Choose an urgency and use at most 500 description characters'; end if;
 if p_evidence is null or jsonb_typeof(p_evidence)<>'array' or jsonb_array_length(p_evidence) not between 1 and 5 then raise exception 'Capture between one and five photos'; end if;
 if (select count(*) from public.citizen_reports where citizen_id=p_citizen and submitted_at>now()-interval '1 hour')>=5 then raise exception 'Report limit reached. Please try again later'; end if;
 insert into public.citizen_reports(citizen_id,capture_session_id,jurisdiction_id,urgency,description,coordinates,accuracy_meters) values(p_citizen,p_session,s.jurisdiction_id,p_urgency,nullif(trim(p_description),''),point,p_accuracy) returning id into rid;
 insert into public.incidents(jurisdiction_id,primary_report_id,urgency,coordinates) values(s.jurisdiction_id,rid,p_urgency,point) returning id into iid;
 for item in select * from jsonb_array_elements(p_evidence) loop
  if not exists(select 1 from public.capture_uploads u where u.id=(item->>'upload_id')::uuid and u.citizen_id=p_citizen and u.capture_session_id=p_session and u.storage_path_private=item->>'private_path' and u.storage_path_public=item->>'display_path' and u.media_hash=item->>'hash' and u.captured_at=(item->>'captured_at')::timestamptz) then raise exception 'Photo upload is not owned by this capture session'; end if;
  if (item->>'captured_at')::timestamptz < s.started_at-interval '5 seconds' or (item->>'captured_at')::timestamptz > clock_timestamp()+interval '5 seconds' then raise exception 'Photo capture time is invalid'; end if;
  insert into public.evidence(report_id,incident_id,uploader_id,coordinates,captured_at,storage_path_private,storage_path_public,media_hash) values(rid,iid,p_citizen,s.coordinates,(item->>'captured_at')::timestamptz,item->>'private_path',item->>'display_path',item->>'hash');
 end loop;
 delete from public.capture_uploads where capture_session_id=p_session and id in (select (value->>'upload_id')::uuid from jsonb_array_elements(p_evidence));
 update public.capture_sessions set consumed_at=now() where id=p_session;
 return iid;
end $$;
revoke all on function public.start_capture(uuid,double precision,double precision,double precision,timestamptz) from public,anon,authenticated;
revoke all on function public.submit_citizen_report(uuid,uuid,text,text,double precision,double precision,double precision,timestamptz,jsonb) from public,anon,authenticated;
grant execute on function public.start_capture(uuid,double precision,double precision,double precision,timestamptz) to service_role;
grant execute on function public.submit_citizen_report(uuid,uuid,text,text,double precision,double precision,double precision,timestamptz,jsonb) to service_role;

-- Public projection intentionally excludes citizen IDs, exact GPS and evidence paths.
create function public.list_public_incidents() returns table(id uuid,jurisdiction_id uuid,category text,urgency text,status text,created_at timestamptz,latitude double precision,longitude double precision)
language sql stable security definer set search_path='' as $$
 select id,jurisdiction_id,category,urgency,status,created_at,
 round(extensions.st_y(coordinates::extensions.geometry)::numeric,3)::double precision,
 round(extensions.st_x(coordinates::extensions.geometry)::numeric,3)::double precision
 from public.incidents where is_public and accepted_at is not null and status<>'SUBMITTED' order by created_at desc limit 500;
$$;
revoke all on function public.list_public_incidents() from public;
grant execute on function public.list_public_incidents() to anon,authenticated;

-- Pending evidence derivatives remain private. Part 2 may publish sanitized copies.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('evidence-originals','evidence-originals',false,2097152,array['image/jpeg']),
 ('evidence-display','evidence-display',false,2097152,array['image/jpeg']) on conflict(id) do nothing;
-- No browser upload/read policies: server authenticates ownership and issues short signed reads.
