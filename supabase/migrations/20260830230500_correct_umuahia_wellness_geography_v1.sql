insert into public.resofit_wellness_cities (state_id,name,slug,latitude,longitude,status,metadata)
select id,'Umuahia','umuahia',5.52491,7.49461,'active','{"coordinate_source":"public_city_geography","coordinate_precision":"city_centroid"}'::jsonb
from public.resofit_wellness_states where slug='abia'
on conflict (state_id,slug) do update set latitude=excluded.latitude,longitude=excluded.longitude,updated_at=now();

update public.resofit_wellness_hubs h
set city_id=c.id,latitude=5.52491,longitude=7.49461,updated_at=now(),metadata=h.metadata||'{"coordinate_precision":"city_centroid_pending_street_pin"}'::jsonb
from public.resofit_wellness_cities c
where h.hub_code='RF-UMU-001' and c.slug='umuahia';