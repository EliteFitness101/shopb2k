-- Publish the user-confirmed Makaveli Wellness Hub in Aba.
update public.resofit_wellness_hubs
set name='Makaveli Wellness Hub',
    description='Makaveli Wellness Services — Phase-1 wellness and recovery partner hub in Aba, Abia.',
    address='Plot 6, Independent Street, Aba, Abia, Nigeria',
    latitude=5.10658,
    longitude=7.36667,
    phone='09032712393',
    whatsapp='09032712393',
    verification_status='verified',
    status='active',
    metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('source','user_confirmed','address_confirmed',true,'coordinate_source','city_centroid_pending_exact_pin') ,
    updated_at=now()
where hub_code='MKV-ABA-001';

insert into public.resofit_wellness_hub_services (hub_id,service_name,description,price,currency,duration_minutes,booking_method,status,metadata)
select h.id,v.service_name,v.description,null,'NGN',v.duration,'human_escalation','active',v.metadata
from public.resofit_wellness_hubs h
join (values
 ('Express Relaxation Massage','Short-format relaxation massage for an accessible entry wellness experience.',30,'{"funnel_role":"entry"}'::jsonb),
 ('Back & Shoulder Recovery','Focused non-diagnostic relaxation/recovery session for back and shoulder tension.',30,'{"funnel_role":"entry_recovery"}'::jsonb),
 ('Neck & Upper-Body Relief','Gentle non-diagnostic relaxation and mobility support for the neck and upper body.',30,'{"funnel_role":"entry_recovery"}'::jsonb),
 ('Foot & Leg Recovery','Foot and lower-leg relaxation/recovery session suited to customers who spend long periods standing or walking.',30,'{"funnel_role":"market_worker"}'::jsonb),
 ('Gentle Mobility & Stretch','Guided gentle movement and stretching session within practitioner scope.',30,'{"funnel_role":"recovery"}'::jsonb),
 ('Private Relaxation','Private wellness relaxation experience for individual customers.',45,'{"funnel_role":"premium_conversion"}'::jsonb),
 ('Couples Wellness','Private couples relaxation and wellness experience.',60,'{"funnel_role":"premium_conversion"}'::jsonb),
 ('Aromatherapy Relaxation','Aromatherapy-enhanced relaxation experience using appropriate wellness protocols.',45,'{"funnel_role":"premium_conversion"}'::jsonb),
 ('Express Beauty & Grooming','Short beauty and personal-wellness service designed as an accessible visit entry point.',30,'{"funnel_role":"entry"}'::jsonb),
 ('Professional Physiotherapy Referral','Referral/booking pathway to appropriately qualified physiotherapy or healthcare practitioners where indicated; no diagnosis is provided by the platform.',30,'{"funnel_role":"clinical_referral"}'::jsonb)
) v(service_name,description,duration,metadata) on true
where h.hub_code='MKV-ABA-001'
on conflict (hub_id,service_name) do update set description=excluded.description,duration_minutes=excluded.duration_minutes,metadata=excluded.metadata,status='active',updated_at=now();