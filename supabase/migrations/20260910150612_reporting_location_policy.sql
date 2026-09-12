-- Explicitly marked, server-controlled demo capture. Production geofencing is unchanged.
alter table public.capture_sessions add column location_source text not null default 'live' check(location_source in ('live','demo'));
alter table public.citizen_reports add column location_source text not null default 'live' check(location_source in ('live','demo'));
alter table public.incidents add column is_demo boolean not null default false;
alter table public.incidents add constraint demo_incidents_stay_private check(not(is_demo and is_public));

create function public.mark_report_location_source() returns trigger language plpgsql set search_path='' as $$
begin
 select location_source into new.location_source from public.capture_sessions where id=new.capture_session_id;
 return new;
end $$;
create trigger report_location_source before insert on public.citizen_reports for each row execute function public.mark_report_location_source();
create function public.mark_incident_demo() returns trigger language plpgsql set search_path='' as $$
begin
 select (location_source='demo') into new.is_demo from public.citizen_reports where id=new.primary_report_id;
 return new;
end $$;
create trigger incident_demo before insert or update on public.incidents for each row execute function public.mark_incident_demo();

create function public.start_demo_capture(p_citizen uuid) returns uuid language plpgsql set search_path='' as $$
declare point extensions.geometry; session_id uuid;
begin
 select extensions.st_pointonsurface(j.boundary::extensions.geometry) into point
 from public.profiles p join public.jurisdictions j on j.id=p.active_jurisdiction_id
 where p.id=p_citizen and p.role='citizen' and j.level_label='local' and j.metadata->>'demo'='true';
 if point is null then raise exception 'Demo location is only available in a configured demo civic area'; end if;
 session_id=public.start_capture(p_citizen,extensions.st_y(point),extensions.st_x(point),0,clock_timestamp());
 update public.capture_sessions set location_source='demo' where id=session_id;
 return session_id;
end $$;
create function public.demo_capture_location(p_citizen uuid,p_session uuid)
returns table(latitude double precision,longitude double precision) language sql stable set search_path='' as $$
 select extensions.st_y(s.coordinates::extensions.geometry),extensions.st_x(s.coordinates::extensions.geometry)
 from public.capture_sessions s join public.profiles p on p.id=s.citizen_id
 where s.id=p_session and s.citizen_id=p_citizen and s.location_source='demo'
 and s.expires_at>now() and s.consumed_at is null and p.active_jurisdiction_id=s.jurisdiction_id and p.role='citizen';
$$;
revoke all on function public.start_demo_capture(uuid),public.demo_capture_location(uuid,uuid),public.mark_report_location_source(),public.mark_incident_demo() from public,anon,authenticated;
grant execute on function public.start_demo_capture(uuid),public.demo_capture_location(uuid,uuid),public.mark_report_location_source(),public.mark_incident_demo() to service_role;
