-- Eneka Hotel production wellness node
-- Additive only: no existing routes/tables/APIs removed or renamed.
insert into public.resofit_network_directory (
  entity_type, slug, name, tagline, description, country_code, state, city,
  latitude, longitude, public_location_label, phone, whatsapp, website,
  services, capabilities, verification_status, contract_status, status,
  discovery_source, contract_metadata, premium_metadata, public_metadata,
  last_verified_at, lga, source_urls, social_urls, source_checked_at,
  verification_layer, geo_confidence
) values (
  'wellness_hub','eneka-hotel-port-harcourt','Eneka Hotel',
  'Comfort, Class & Unforgettable Experience',
  'Eneka Hotel — 67 Eneka-Igwuruta Road, Rumuesara-Eneka, Port Harcourt, Rivers State. Hospitality, accommodation, swimming, dining, bar and lounge, events and lifestyle experience, with a ResoFlex™ fitness, wellness, recovery and spa partnership presentation.',
  'NG','Rivers','Port Harcourt',4.8164,7.0642,
  '67 Eneka-Igwuruta Road, Rumuesara - Eneka (Eneka/Iriebe Axis), Port Harcourt, Rivers State. (Opposite Government Secondary School Eneka)',
  '0808 117 0200 / 0813 388 4623','https://wa.me/2348081170200',
  'https://resofit.fit/wellness/hubs/eneka-hotel-port-harcourt',
  ARRAY['Luxurious Rooms & Lodge','Crystal Swimming Pool','Gourmet Restaurant','Exquisite Bar & Lounge','Grand Event Space','Sunday Pool Party','Free Swimming for Ladies','Fitness','Wellness','Recovery','Spa'],
  ARRAY['Executive Suites','Hydro & Leisure','Fine Dining','Cocktails & Spirits','Weddings & Conferences','Corporate Events','Hotel Guest Fitness','Personal Training','Recovery Sessions','Wellness Packages'],
  'verified','prospect','active','user_supplied_physical_assessment',
  '{"partnership_brand":"ResoFlex™ — Powered by Resonance Fitness","presentation_purpose":"manager_signoff","funnel":"Discover → Visit → Stay → Train → Recover → Dine → Return → Refer"}'::jsonb,
  '{"premium_features":["dark luxury hospitality UI","responsive navigation","booking modal","quick inquiry form","success toast","facility cards","events and promotions","amenities grid","direct call actions","manager-facing ResoFlex partnership presentation"],"supplied_html_preservation":"exact"}'::jsonb,
  '{"hotel_address":"67 Eneka-Igwuruta Road, Rumuesara - Eneka (Eneka/Iriebe Axis), Port Harcourt, Rivers State.","landmark":"Opposite Government Secondary School Eneka","telephone":["0808 117 0200","0813 388 4623"],"content_source":"user_supplied_html","images_source":"exact_supplied_image_urls","fonts":["Inter","Playfair Display"],"theme":{"obsidian":"#0b0f19","slateDark":"#111827","slateCard":"#1f2937","goldAccent":"#d4af37","goldHover":"#e6c547"}}'::jsonb,
  now(),'Obio-Akpor',
  ARRAY['user_supplied_html','https://nigeria.worldplaces.me/view-place/79043302-eneka-hotels.html'],
  ARRAY[]::text[],now(),true,'approximate_public_pin'
)
on conflict (slug) do update set
  name=excluded.name,tagline=excluded.tagline,description=excluded.description,
  state=excluded.state,city=excluded.city,latitude=excluded.latitude,longitude=excluded.longitude,
  public_location_label=excluded.public_location_label,phone=excluded.phone,whatsapp=excluded.whatsapp,
  website=excluded.website,services=excluded.services,capabilities=excluded.capabilities,
  verification_status=excluded.verification_status,contract_status=excluded.contract_status,status=excluded.status,
  discovery_source=excluded.discovery_source,contract_metadata=excluded.contract_metadata,
  premium_metadata=excluded.premium_metadata,public_metadata=excluded.public_metadata,
  last_verified_at=excluded.last_verified_at,lga=excluded.lga,source_urls=excluded.source_urls,
  source_checked_at=excluded.source_checked_at,verification_layer=excluded.verification_layer,
  geo_confidence=excluded.geo_confidence,updated_at=now();

insert into public.resofit_wellness_hubs (
  state_id,city_id,hub_code,name,slug,description,address,latitude,longitude,phone,whatsapp,website,
  verification_status,status,metadata
)
select s.id,c.id,'ENEKA-HOTEL-PHC-001','Eneka Hotel','eneka-hotel-port-harcourt',
  'Eneka Hotel — Comfort, Class & Unforgettable Experience. ResoFlex™ fitness, wellness, recovery and spa partnership presentation.',
  '67 Eneka-Igwuruta Road, Rumuesara - Eneka (Eneka/Iriebe Axis), Port Harcourt, Rivers State. Opposite Government Secondary School Eneka',
  4.8164,7.0642,'0808 117 0200 / 0813 388 4623','08081170200',
  'https://resofit.fit/wellness/hubs/eneka-hotel-port-harcourt','verified','active',
  '{"source":"user_supplied_physical_assessment","content_source":"user_supplied_html","coordinate_source":"public_place_reference","coordinate_precision":"approximate_public_pin","manager_presentation":true}'::jsonb
from public.resofit_wellness_states s join public.resofit_wellness_cities c on c.state_id=s.id
where s.slug='rivers' and c.slug='port-harcourt'
on conflict (hub_code) do update set
  name=excluded.name,address=excluded.address,latitude=excluded.latitude,longitude=excluded.longitude,
  phone=excluded.phone,whatsapp=excluded.whatsapp,website=excluded.website,
  verification_status=excluded.verification_status,status=excluded.status,metadata=excluded.metadata,updated_at=now();

insert into public.resofit_wellness_hub_services (hub_id,service_name,description,price,currency,duration_minutes,booking_method,status,metadata)
select h.id,v.service_name,v.description,null,'NGN',null,'human_escalation','active',v.metadata
from public.resofit_wellness_hubs h cross join (values
('Luxurious Rooms & Lodge','Executive suites and lodge accommodation presentation from supplied Eneka Hotel code.','{"category":"hospitality","source":"supplied_html"}'::jsonb),
('Crystal Swimming Pool','Pool leisure and swimming experience.','{"category":"leisure","source":"supplied_html"}'::jsonb),
('Gourmet Restaurant','Restaurant and table reservation experience.','{"category":"dining","source":"supplied_html"}'::jsonb),
('Exquisite Bar & Lounge','Bar and lounge experience.','{"category":"lounge","source":"supplied_html"}'::jsonb),
('Grand Event Space','Weddings, corporate meetings, birthdays and anniversaries event-space presentation.','{"category":"events","source":"supplied_html"}'::jsonb),
('Sunday Pool Party','Weekly Sunday pool-party experience.','{"category":"events","source":"supplied_html"}'::jsonb),
('Free Swimming for Ladies','Weekly Wednesday ladies swimming offer.','{"category":"promotion","source":"supplied_html"}'::jsonb),
('ResoFlex™ Fitness Partnership','Proposed hotel fitness integration for management presentation.','{"category":"partnership","status":"proposed","brand":"ResoFlex™"}'::jsonb),
('ResoFlex™ Wellness & Recovery Partnership','Proposed wellness and recovery integration for hotel guests and local customers.','{"category":"partnership","status":"proposed","brand":"ResoFlex™"}'::jsonb),
('ResoFlex™ Spa Partnership','Proposed spa/wellness integration for the hotel partnership.','{"category":"partnership","status":"proposed","brand":"ResoFlex™"}'::jsonb)
) v(service_name,description,metadata) where h.hub_code='ENEKA-HOTEL-PHC-001'
on conflict (hub_id,service_name) do update set description=excluded.description,metadata=excluded.metadata,updated_at=now();

-- production deployment trigger: Eneka Hotel node is complete and ready for Vercel Git integration.

-- deploy/eneka-production verification trigger
