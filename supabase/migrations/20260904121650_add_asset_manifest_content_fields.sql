alter table public.asset_manifest add column if not exists title text;
alter table public.asset_manifest add column if not exists caption text;
alter table public.asset_manifest add column if not exists destination text;
alter table public.asset_manifest add column if not exists keywords text[] default '{}'::text[];
alter table public.asset_manifest add column if not exists safety_checked boolean not null default false;
alter table public.asset_manifest drop constraint if exists asset_manifest_blob_pathname_key;
create unique index if not exists asset_manifest_blob_platform_uq on public.asset_manifest(blob_pathname, coalesce(platform,'__pending__'));
