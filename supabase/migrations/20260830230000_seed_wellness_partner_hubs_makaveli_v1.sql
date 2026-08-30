-- Canonical Wellness partner seed.
-- Exact street-level coordinates are intentionally not fabricated. Existing
-- verified records remain draft until exact map pins are confirmed.

update public.resofit_wellness_cities c
set latitude=5.10658, longitude=7.36667,
    metadata=coalesce(c.metadata,'{}'::jsonb)||jsonb_build_object('coordinate_source','public_city_geography','coordinate_precision','city_centroid'), updated_at=now()
from public.resofit_wellness_states s
where c.state_id=s.id and s.slug='abia' and c.slug='aba';

insert into public.resofit_wellness_hubs (state_id,city_id,hub_code,name,slug,description,address,latitude,longitude,phone,whatsapp,verification_status,status,metadata)
select s.id,c.id,v.hub_code,v.name,v.slug,v.description,v.address,v.latitude,v.longitude,v.phone,v.whatsapp,v.verification_status,v.status,v.metadata
from public.resofit_wellness_states s
join public.resofit_wellness_cities c on c.state_id=s.id
join (values
 ('RF-PHC-001','Resonance Fitness','resonance-fitness-port-harcourt','Resonance Fitness — verified location supplied to ResoFit.','Shell Residential Area, Rumuokwurusi, Port Harcourt 500211, Rivers',4.777423,7.013404,null::text,null::text,'verified','draft','{"source":"user_supplied_verified_record","external_reference":"03269844469288820848","coordinate_precision":"exact_city_area_pending_street_pin"}'::jsonb,'rivers','port-harcourt'),
 ('RF-UMU-001','Resonance Fitness','resonance-fitness-umuahia','Resonance Fitness — verified location supplied to ResoFit.','2 Amibo Ubakala Umuahia, Umuahia South, Umuahia 440001, Abia',5.10658,7.36667,null::text,null::text,'verified','draft','{"source":"user_supplied_verified_record","external_reference":"03440793766288533091","coordinate_precision":"city_centroid_pending_street_pin"}'::jsonb,'abia','aba'),
 ('MKV-ABA-001','Makaveli Wellness Hub','makaveli-wellness-hub-aba','Makaveli Wellness Services — Phase-1 wellness and recovery partner hub.','Plot No. 6, Independent Street, Aba, Abia',5.10658,7.36667,'09032712393','09032712393','pending','draft','{"source":"makaveli_proposal","coordinate_precision":"city_centroid","exact_street_pin_required":true,"phase":"phase_1_six_month_pilot"}'::jsonb,'abia','aba')
) v(hub_code,name,slug,description,address,latitude,longitude,phone,whatsapp,verification_status,status,metadata,state_slug,city_slug)
on s.slug=v.state_slug and c.slug=v.city_slug
on conflict (hub_code) do update set name=excluded.name,address=excluded.address,phone=excluded.phone,whatsapp=excluded.whatsapp,metadata=public.resofit_wellness_hubs.metadata||excluded.metadata,updated_at=now();

insert into public.resofit_wellness_hub_services (hub_id,service_name,description,price,currency,duration_minutes,booking_method,status,metadata)
select h.id,v.service_name,v.description,null,'NGN',v.duration,'human_escalation','active',v.metadata
from public.resofit_wellness_hubs h
join (values
 ('Express Relaxation Massage','Short-format relaxation massage for an accessible entry wellness experience.',30,'{"funnel_role":"entry"}'::jsonb),
 ('Back & Shoulder Recovery','Focused non-diagnostic relaxation/recovery session for back and shoulder tension.',30,'{"funnel_role":"entry_recovery"}'::jsonb),
 ('Neck & Upper-Body Relief','Gentle non-diagnostic relaxation and mobility support for the neck and upper body.',30,'{"funnel_role":"entry_recovery"}'::jsonb),
 ('Foot & Leg Recovery','Foot and lower-leg relaxation/recovery session suited to customers who spend long periods standing or walking.',30,'{"funnel_role":"market_worker"}'::jsonb),
 ('Gentle Mobility & Stretch Session','Guided gentle movement and stretching session within practitioner scope.',30,'{"funnel_role":"recovery"}'::jsonb),
 ('Private Relaxation Session','Private wellness relaxation experience for individual customers.',45,'{"funnel_role":"premium_conversion"}'::jsonb),
 ('Couples Wellness Session','Private couples relaxation and wellness experience.',60,'{"funnel_role":"premium_conversion"}'::jsonb),
 ('Aromatherapy Relaxation','Aromatherapy-enhanced relaxation experience using appropriate wellness protocols.',45,'{"funnel_role":"premium_conversion"}'::jsonb),
 ('Express Beauty & Grooming Wellness','Short beauty and personal-wellness service designed as an accessible visit entry point.',30,'{"funnel_role":"entry"}'::jsonb),
 ('Professional Physiotherapy Referral','Referral/booking pathway to appropriately qualified physiotherapy or healthcare practitioners where indicated; no diagnosis is provided by the platform.',30,'{"funnel_role":"clinical_referral"}'::jsonb)
) v(service_name,description,duration,metadata) on true
where h.hub_code='MKV-ABA-001'
on conflict (hub_id,service_name) do update set description=excluded.description,duration_minutes=excluded.duration_minutes,metadata=excluded.metadata,updated_at=now();