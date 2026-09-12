-- Forward-only. Adds batched authorized location lookup, real jurisdiction geometry, and a
-- lifecycle-consistent contribution ledger. No existing migration is rewritten, no table is
-- dropped, no RLS policy is relaxed, and no existing grant is widened.
--
-- Authorization model is unchanged: these functions run SECURITY INVOKER with a pinned empty
-- search_path, are granted to service_role only, and re-check the actor's role/membership
-- themselves. The server always passes an actor id derived from the authenticated Supabase
-- session; it is never accepted from the browser.

-- ---------------------------------------------------------------------------
-- 1. Batched incident locations (replaces the per-incident N+1 fan-out)
-- ---------------------------------------------------------------------------
-- Same predicate as government_incident_location(uuid,uuid), applied set-wise. Incident ids the
-- actor is not authorized for are simply absent from the result: no row, no error, no leak.
create function public.government_incident_locations(p_actor uuid,p_incidents uuid[])
returns table(incident_id uuid,latitude double precision,longitude double precision)
language sql stable set search_path='' as $$
 select i.id,
        extensions.st_y(i.coordinates::extensions.geometry),
        extensions.st_x(i.coordinates::extensions.geometry)
 from public.incidents i
 join public.profiles p on p.id=p_actor
 left join public.government_memberships gm
   on gm.user_id=p.id and gm.jurisdiction_id=i.jurisdiction_id and gm.active
 where i.id=any(coalesce(p_incidents,array[]::uuid[]))
   and (p.role='platform_admin' or (p.role='government_user' and gm.id is not null));
$$;

revoke all on function public.government_incident_locations(uuid,uuid[]) from public,anon,authenticated;
grant execute on function public.government_incident_locations(uuid,uuid[]) to service_role;

-- ---------------------------------------------------------------------------
-- 2. Jurisdiction geometry for the Government portal
-- ---------------------------------------------------------------------------
-- Returns only the civic areas the actor is assigned to (all local areas for a platform admin),
-- so the Live Map can frame an area that currently holds zero reports.
-- ST_PointOnSurface is used instead of ST_Centroid: for concave service areas the centroid can
-- fall outside the polygon, which would frame the map on the wrong place.
create function public.government_jurisdiction_geometry(p_actor uuid)
returns table(
 id uuid,name text,
 centroid_latitude double precision,centroid_longitude double precision,
 min_latitude double precision,min_longitude double precision,
 max_latitude double precision,max_longitude double precision
)
language sql stable set search_path='' as $$
 with actor as (select role from public.profiles where id=p_actor),
 scope as (
  select j.id,j.name,j.boundary::extensions.geometry as shape
  from public.jurisdictions j, actor a
  where j.level_label='local'
    and (
     a.role='platform_admin'
     or (a.role='government_user' and exists (
      select 1 from public.government_memberships gm
      where gm.user_id=p_actor and gm.jurisdiction_id=j.id and gm.active))
    )
 )
 select s.id,s.name,
        extensions.st_y(extensions.st_pointonsurface(s.shape)),
        extensions.st_x(extensions.st_pointonsurface(s.shape)),
        extensions.st_ymin(s.shape),extensions.st_xmin(s.shape),
        extensions.st_ymax(s.shape),extensions.st_xmax(s.shape)
 from scope s order by s.name;
$$;

revoke all on function public.government_jurisdiction_geometry(uuid) from public,anon,authenticated;
grant execute on function public.government_jurisdiction_geometry(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 3. Public civic-area map frames
-- ---------------------------------------------------------------------------
-- public.jurisdictions is already world-readable (policy jurisdictions_read, granted to anon and
-- authenticated), so area names and ids are public today. This exposes only a framing rectangle
-- and a representative point for those same rows, rounded to 3 decimal places to match the
-- precision list_public_incidents() already publishes. No citizen coordinate is involved.
create function public.jurisdiction_map_frames()
returns table(
 id uuid,name text,level_label text,
 centroid_latitude double precision,centroid_longitude double precision,
 min_latitude double precision,min_longitude double precision,
 max_latitude double precision,max_longitude double precision
)
language sql stable set search_path='' as $$
 select j.id,j.name,j.level_label,
        round(extensions.st_y(extensions.st_pointonsurface(j.boundary::extensions.geometry))::numeric,3)::double precision,
        round(extensions.st_x(extensions.st_pointonsurface(j.boundary::extensions.geometry))::numeric,3)::double precision,
        round(extensions.st_ymin(j.boundary::extensions.geometry)::numeric,3)::double precision,
        round(extensions.st_xmin(j.boundary::extensions.geometry)::numeric,3)::double precision,
        round(extensions.st_ymax(j.boundary::extensions.geometry)::numeric,3)::double precision,
        round(extensions.st_xmax(j.boundary::extensions.geometry)::numeric,3)::double precision
 from public.jurisdictions j
 where j.level_label='local'
 order by j.name;
$$;

revoke all on function public.jurisdiction_map_frames() from public;
grant execute on function public.jurisdiction_map_frames() to anon,authenticated,service_role;

-- ---------------------------------------------------------------------------
-- 4. Contribution ledger: record resolution, not just acceptance
-- ---------------------------------------------------------------------------
-- Before this migration the ledger only held REPORT_ACCEPTED, so "resolved contributions" had to
-- be inferred from citizen_reports.status. Recording the resolution as its own append-only event
-- makes the leaderboard agree with the incident lifecycle.
--
-- Idempotency is structural: contribution_ledger already carries
-- unique(citizen_id,incident_id,event_type), so a retried or repeated resolve cannot double-award.
-- Points are fixed constants; the advisory AI evidence score never influences them.
create or replace function public.government_resolve_incident(p_actor uuid,p_incident uuid,p_notes text,p_upload_ids uuid[])
returns void language plpgsql set search_path='' as $$
declare target public.incidents; upload public.resolution_uploads; upload_count int; actor_profile_role text; reporter uuid;
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
 -- Award the reporting citizen for the completed civic outcome. Demo incidents stay out of the
 -- public record, so they stay out of the ledger too, exactly as acceptance already does.
 select citizen_id into reporter from public.citizen_reports where id=target.primary_report_id;
 if reporter is not null and not target.is_demo then
   insert into public.contribution_ledger(citizen_id,incident_id,event_type,points_delta)
   values(reporter,p_incident,'REPORT_RESOLVED',5) on conflict do nothing;
 end if;
 insert into public.incident_events(incident_id,event_type,actor_id,actor_role,payload) values(p_incident,'RESOLVED',p_actor,actor_profile_role,jsonb_build_object('notes',trim(p_notes),'sla_compliance',case when now()<=target.sla_deadline then 'MET' else 'MISSED' end));
end $$;

revoke all on function public.government_resolve_incident(uuid,uuid,text,uuid[]) from public,anon,authenticated;
grant execute on function public.government_resolve_incident(uuid,uuid,text,uuid[]) to service_role;

-- Backfill: incidents already resolved before this migration get the same recorded event, so the
-- ledger describes the whole lifecycle rather than only the period after deployment.
-- on conflict do nothing keeps this safe to re-run.
insert into public.contribution_ledger(citizen_id,incident_id,event_type,points_delta)
select r.citizen_id,i.id,'REPORT_RESOLVED',5
from public.incidents i
join public.citizen_reports r on r.id=i.primary_report_id
where i.status in ('RESOLVED','VERIFIED_RESOLVED') and not i.is_demo and r.citizen_id is not null
on conflict do nothing;

-- Supports the leaderboard's per-citizen weekly aggregation by event type.
create index if not exists contribution_ledger_event_idx on public.contribution_ledger(event_type,created_at desc);
