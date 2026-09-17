-- Government Portal global read projection.
-- Every authenticated Government/Platform Admin account may READ every incident location.
-- Existing review/update/resolve RPCs remain jurisdiction-scoped and are intentionally unchanged.

create or replace function public.government_global_incident_locations(p_actor uuid,p_incidents uuid[])
returns table(incident_id uuid,latitude double precision,longitude double precision)
language sql stable set search_path='' as $$
 select i.id,
        extensions.st_y(i.coordinates::extensions.geometry),
        extensions.st_x(i.coordinates::extensions.geometry)
 from public.incidents i
 join public.profiles p on p.id=p_actor
 where p.role in ('government_user','platform_admin')
   and i.coordinates is not null
   and i.id=any(coalesce(p_incidents,array[]::uuid[]));
$$;

revoke all on function public.government_global_incident_locations(uuid,uuid[]) from public,anon,authenticated;
grant execute on function public.government_global_incident_locations(uuid,uuid[]) to service_role;
