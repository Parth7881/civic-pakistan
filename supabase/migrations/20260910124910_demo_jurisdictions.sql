-- Deliberately small DEMO service-area rectangles, not official administrative boundaries.
-- The demo Pakistan/province coverage is the union of these supported local areas.
-- Replace with verified boundary polygons before production deployment.
with areas(name,region,x1,y1,x2,y2) as (values
 ('Lahore','Punjab',74.20,31.40,74.45,31.65),
 ('Rawalpindi','Punjab',72.95,33.50,73.15,33.65),
 ('Karachi','Sindh',66.95,24.78,67.20,25.02),
 ('Peshawar','Khyber Pakhtunkhwa',71.40,33.90,71.65,34.10),
 ('Quetta','Balochistan',66.88,30.08,67.10,30.30),
 ('Islamabad','Islamabad Capital Territory',72.90,33.66,73.22,33.82),
 ('Gilgit','Gilgit-Baltistan',74.20,35.85,74.45,36.02),
 ('Muzaffarabad','Azad Jammu and Kashmir',73.40,34.30,73.55,34.43)
), polygons as (select *,extensions.st_multi(extensions.st_makeenvelope(x1,y1,x2,y2,4326)) as shape from areas),
 country as (
 insert into public.jurisdictions(name,level_label,boundary,metadata)
 select 'Pakistan','country',extensions.st_multi(extensions.st_union(shape))::extensions.geography,'{"demo":true,"boundary_source":"Demo service areas; not official national boundary"}'::jsonb from polygons returning id
), regions as (
 insert into public.jurisdictions(name,parent_id,level_label,boundary,metadata)
 select region,country.id,'province',extensions.st_multi(extensions.st_union(shape))::extensions.geography,'{"demo":true}'::jsonb from polygons cross join country group by region,country.id returning id,name
)
insert into public.jurisdictions(name,parent_id,level_label,boundary,metadata)
select p.name,r.id,'local',p.shape::extensions.geography,'{"demo":true,"boundary_source":"Approximate demo rectangle"}'::jsonb from polygons p join regions r on r.name=p.region;
