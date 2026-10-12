-- Provider-neutral media routing. Registry rows are configuration, not secrets.
create table if not exists public.media_provider_registry (
 provider_id text primary key, display_name text not null,
 provider_type text not null check (provider_type in ('cdn','object_storage','drive')),
 roles text[] not null check (cardinality(roles) > 0 and roles <@ array['delivery','origin','transform','archive']::text[]),
 enabled boolean not null default false, public_delivery boolean not null default false,
 priority integer not null default 100 check (priority between 1 and 10000),
 base_url text, supported_media_types text[] not null default array['image','video','audio','document']::text[],
 health_status text not null default 'unknown' check (health_status in ('unknown','healthy','degraded','unhealthy')),
 last_health_check timestamptz, config_ref text, metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint media_provider_base_url_https check (base_url is null or base_url ~ '^https://')
);
create table if not exists public.media_asset_locations (
 id uuid primary key default gen_random_uuid(), asset_key text not null,
 provider_id text not null references public.media_provider_registry(provider_id) on update cascade on delete restrict,
 asset_url text not null check (asset_url ~ '^https://'),
 media_type text not null check (media_type in ('image','video','audio','document','other')),
 priority integer not null default 100 check (priority between 1 and 10000), enabled boolean not null default true,
 verified_at timestamptz, verification_method text, checksum_sha256 text, content_length bigint, content_type text,
 metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique (asset_key, provider_id),
 constraint media_asset_locations_no_blob check (asset_url !~* '(^|//)[^/]*blob[.]vercel-storage[.]com')
);
create index if not exists media_provider_registry_delivery_idx on public.media_provider_registry (enabled, public_delivery, health_status, priority);
create index if not exists media_provider_registry_roles_idx on public.media_provider_registry using gin (roles);
create index if not exists media_asset_locations_asset_idx on public.media_asset_locations (asset_key, enabled, priority);
alter table public.media_provider_registry enable row level security;
alter table public.media_asset_locations enable row level security;
drop policy if exists "Public can read healthy delivery providers" on public.media_provider_registry;
create policy "Public can read healthy delivery providers" on public.media_provider_registry for select to anon, authenticated using (enabled and public_delivery and health_status = 'healthy' and roles && array['delivery','transform']::text[]);
drop policy if exists "Public can read verified locations on healthy providers" on public.media_asset_locations;
create policy "Public can read verified locations on healthy providers" on public.media_asset_locations for select to anon, authenticated using (enabled and verified_at is not null and asset_url !~* '(^|//)[^/]*blob[.]vercel-storage[.]com' and exists (select 1 from public.media_provider_registry p where p.provider_id = media_asset_locations.provider_id and p.enabled and p.public_delivery and p.health_status = 'healthy' and p.role in ('delivery','transform')));
grant select on public.media_provider_registry to anon, authenticated;
grant select on public.media_asset_locations to anon, authenticated;
insert into public.media_provider_registry (provider_id,display_name,provider_type,roles,enabled,public_delivery,priority,health_status,config_ref,metadata) values
 ('cloudflare_r2','Cloudflare R2 custom-domain delivery','object_storage',array['delivery','origin'],false,true,10,'unknown','CLOUDFLARE_R2_MEDIA_CONFIG','{"requires_custom_domain":true,"reject_r2_dev_for_production":true}'::jsonb),
 ('cloudinary','Cloudinary media CDN','cdn',array['delivery','transform'],false,true,20,'unknown','CLOUDINARY_URL','{"config_keys":["CLOUDINARY_URL","CLOUDINARY_CLOUD_NAME","CLOUDINARY_API_KEY","CLOUDINARY_API_SECRET"]}'::jsonb),
 ('imagekit','ImageKit media CDN','cdn',array['delivery','transform'],false,true,30,'unknown','IMAGEKIT_URL_ENDPOINT','{"config_keys":["IMAGEKIT_URL_ENDPOINT","IMAGEKIT_PRIVATE_KEY","IMAGEKIT_PUBLIC_KEY"]}'::jsonb),
 ('shopify_cdn','Shopify CDN','cdn',array['delivery'],false,true,40,'unknown','SHOPIFY_CDN_CONFIG','{}'::jsonb),
 ('dropbox','Dropbox production media origin and archive','drive',array['origin','archive'],true,false,100,'healthy','DROPBOX_APP_KEY','{"capture_path":"/ResoFit/BIGO/","verified_live_folders":["raw-captures","processed","metadata"],"health_evidence":"Dropbox listing showed current raw and processed BIGO files on 2026-10-12"}'::jsonb),
 ('google_drive','Google Drive production media origin and archive','drive',array['origin','archive'],true,false,110,'unknown','GOOGLE_DRIVE_OAUTH_CONFIG','{"production_ready_claimed_by_owner":true,"direct_live_probe_pending":true}'::jsonb)
on conflict (provider_id) do nothing;
