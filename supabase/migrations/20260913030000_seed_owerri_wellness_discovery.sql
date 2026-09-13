-- ResoFit Wellness Discovery: Owerri public discovery seed (additive-only)
-- External/discovered records are not ResoFit partners.
-- Coordinates remain NULL until address-level geocoding is verified; near-me excludes records without coordinates.

with seed(entity_type, slug, name, description, state, city, public_location_label, phone, services, capabilities, rating, review_count) as (
  values
    ('spa','franthel-treatment-spa','Franthel Treatment Spa','External wellness discovery listing.','Imo','Owerri','Landmark Event Center, Pocket Layout, Owerri',null,array['spa','massage','wellness'],array['spa','massage','wellness'],4.9,128),
    ('wellness_hub','evaspa-beautyplace1-owerrispa','Evaspa Beauty Place Owerri','External beauty and wellness discovery listing.','Imo','Owerri','Aladinma Estate / IMSU Back Gate, Owerri',null,array['spa','massage','aesthetics','wellness'],array['facials','body sculpting','laser','waxing','teeth whitening'],4.9,104),
    ('spa','royal-prestige-spa','ROYAL PRESTIGE SPA','External spa and health-club discovery listing.','Imo','Owerri','Boze Plaza, Okigwe Road, beside Stanbic Bank, Owerri','+2348146971133',array['spa','massage','wellness'],array['spa','health club'],4.6,45),
    ('gym_hub','bold-fitness','BOLD FITNESS','External fitness discovery listing.','Imo','Owerri','Ring Road, Nekede, Owerri',null,array['fitness','gym','wellness'],array['hiit','yoga','aerobics','personal training','nutrition'],4.8,21),
    ('spa','deroyal-spa-zone','DEROYAL SPA ZONE','External spa discovery listing.','Imo','Owerri','Area A, World Bank, Owerri',null,array['spa','massage','wellness'],array['spa','massage'],4.9,26),
    ('wellness_hub','360-medi-spa','360 Medi Spa','External medical-spa style discovery listing.','Imo','Owerri','62 Okigwe Road, Owerri',null,array['spa','aesthetics','wellness'],array['skin','aesthetics'],4.7,20),
    ('gym_hub','jt-gym','JT GYM','External fitness discovery listing.','Imo','Owerri','Chief Evan Enwerem Avenue, New Owerri, Owerri','+2347060707884',array['fitness','gym'],array['strength','training'],4.8,16),
    ('gym_hub','pro-life-fitness','Pro Life Fitness','External fitness discovery listing.','Imo','Owerri','Jacob Zuma Road, New Owerri, Owerri','+2347065226889',array['fitness','gym','wellness'],array['training','nutrition'],4.5,17),
    ('spa','lushora-beauty-spa','Lushora Beauty Spa','External premium spa discovery listing.','Imo','Owerri','49 Umez Eronini Street, MCC Pax, Ikenegbu, Owerri','+2347075334442',array['spa','massage','wellness'],array['beauty','spa'],5.0,22),
    ('spa','feel-good-spa-owerri','Feel Good Spa','External luxury massage and spa discovery listing.','Imo','Owerri','Swiss International Beland, New Owerri, Owerri',null,array['spa','massage','wellness'],array['luxury massage'],5.0,5),
    ('spa','solace-beauty-spa-owerri','Solace Beauty Spa Owerri','External spa and beauty discovery listing.','Imo','Owerri','117 Okigwe Road, Owerri',null,array['spa','massage','aesthetics'],array['beauty','spa'],4.7,12),
    ('spa','unice-lush-spa','Unice Lush Spa','External boutique spa discovery listing.','Imo','Owerri','New Owerri, Owerri',null,array['spa','massage','wellness'],array['spa'],5.0,6),
    ('experience','90-degree-arena','90 Degree Arena','External sports and leisure discovery listing.','Imo','Owerri','Area E / New Owerri, Owerri',null,array['sports','fitness','wellness'],array['football','leisure'],4.4,7),
    ('gym_hub','khey-fitness-gym','KHEY FITNESS GYM','External fitness discovery listing.','Imo','Owerri','FUTO Road, Obinze, Owerri',null,array['fitness','gym'],array['training'],4.7,6),
    ('gym_hub','fortress-fitness-gym-owerri','Fortress Fitness Gym Owerri','External premium fitness discovery listing.','Imo','Owerri','2nd Floor, Shirley Mall, Ikenegbu Road, Owerri','+2349023350576',array['fitness','gym'],array['training'],5.0,4),
    ('provider','good-health-fitness-gym','Good Health Fitness Gym','External neighbourhood fitness discovery listing.','Imo','Owerri','40B Nwafor Street, off Ama Wire–Orji Road, Owerri',null,array['fitness','gym','wellness'],array['training'],5.0,1),
    ('gym_hub','alexfitnesshub','Alexfitnesshub','External fitness discovery listing.','Imo','Owerri','Ugwu Orji, Owerri',null,array['fitness','gym'],array['fitness'],null,null),
    ('experience','metro-sports-fitness-arena','Metro Sports & Fitness Arena','External sports and fitness discovery listing.','Imo','Owerri','Uche Nwosu Avenue, Owerri',null,array['sports','fitness','gym'],array['sports','fitness'],null,null),
    ('wellness_hub','amber-wellness-hub','Amber Wellness Hub','External wellness discovery listing.','Imo','Owerri','School Road, by Douglas Road, Owerri','+2348029552797',array['wellness','recovery','massage'],array['wellness'],null,null),
    ('wellness_hub','new-vision-wellness-aesthetic-place','New Vision Wellness and Aesthetic Place','External wellness and aesthetics discovery listing.','Imo','Owerri','14 Kalu Ezera Street, Ikenegbu, Owerri','+2347046644620',array['wellness','aesthetics','nutrition'],array['medical services','aesthetic services','pharmacy'],5.0,11)
)
insert into public.resofit_network_directory (entity_type,slug,name,description,country_code,state,city,latitude,longitude,public_location_label,phone,services,capabilities,verification_status,contract_status,status,discovery_source,source_url,public_metadata)
select entity_type,slug,name,description,'NG',state,city,null,null,public_location_label,phone,services,capabilities,'review','prospect','active','public_web_business_search_2026-09-13',null,jsonb_build_object('rating',rating,'review_count',review_count,'market','Owerri','external_discovery',true,'resofit_partner',false)
from seed
where not exists (select 1 from public.resofit_network_directory existing where existing.slug = seed.slug);
