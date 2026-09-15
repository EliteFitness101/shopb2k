-- Abia wellness discovery registry and route metadata.
-- Discovery is intentionally not gated by supplier/vendor/partnership status.
-- verification_layer remains TRUE until CEO changes that policy.
create table if not exists public.resofit_wellness_route_registry (
  id uuid primary key default gen_random_uuid(),
  state_slug text not null,
  lga_slug text,
  city_slug text,
  category_slug text,
  route_path text not null unique,
  verification_layer boolean not null default true,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_resofit_wellness_route_registry_state on public.resofit_wellness_route_registry(state_slug);
create index if not exists idx_resofit_wellness_route_registry_lga on public.resofit_wellness_route_registry(lga_slug);
create index if not exists idx_resofit_wellness_route_registry_category on public.resofit_wellness_route_registry(category_slug);

insert into public.resofit_wellness_route_registry(state_slug,city_slug,category_slug,route_path,metadata)
values
('abia',null,null,'/wellness/abia','{}'),
('abia',null,'discover','/wellness/abia/discover','{}'),
('abia',null,'near-me','/wellness/abia/near-me','{}'),
('abia',null,'gyms','/wellness/abia/gyms','{}'),
('abia',null,'spas','/wellness/abia/spas','{}'),
('abia',null,'massage','/wellness/abia/massage','{}'),
('abia',null,'fitness','/wellness/abia/fitness','{}'),
('abia',null,'recovery','/wellness/abia/recovery','{}'),
('abia',null,'nutrition','/wellness/abia/nutrition','{}'),
('abia',null,'physiotherapy','/wellness/abia/physiotherapy','{}'),
('abia',null,'aesthetics','/wellness/abia/aesthetics','{}'),
('abia',null,'sports','/wellness/abia/sports','{}'),
('abia',null,'wellness-centres','/wellness/abia/wellness-centres','{}'),
('abia',null,'yoga','/wellness/abia/yoga','{}'),
('abia',null,'pilates','/wellness/abia/pilates','{}'),
('abia',null,'beauty','/wellness/abia/beauty','{}'),
('abia','aba',null,'/wellness/abia/aba','{}'),
('abia','umuahia',null,'/wellness/abia/umuahia','{}'),
('abia','ohafia',null,'/wellness/abia/ohafia','{}'),
('abia','arochukwu',null,'/wellness/abia/arochukwu','{}'),
('abia','bende',null,'/wellness/abia/bende','{}'),
('abia','ikwuuano',null,'/wellness/abia/ikwiano','{"legacy_alias":"ikwiano"}'),
('abia','isiala-ngwa-north',null,'/wellness/abia/isiala-ngwa-north','{}'),
('abia','isiala-ngwa-south',null,'/wellness/abia/isiala-ngwa-south','{}'),
('abia','isuikwuato',null,'/wellness/abia/isuikwuato','{}'),
('abia','obi-ngwa',null,'/wellness/abia/obi-ngwa','{}'),
('abia','osisioma-ngwa',null,'/wellness/abia/osisioma-ngwa','{}'),
('abia','ugwunagbo',null,'/wellness/abia/ugwunagbo','{}'),
('abia','ukwa-east',null,'/wellness/abia/ukwa-east','{}'),
('abia','ukwa-west',null,'/wellness/abia/ukwa-west','{}'),
('abia','umu-nneochi',null,'/wellness/abia/umu-nneochi','{}'),
('abia','umuahia-north',null,'/wellness/abia/umuahia-north','{}'),
('abia','umuahia-south',null,'/wellness/abia/umuahia-south','{}')
on conflict(route_path) do update set verification_layer=true,status='active',updated_at=now();

comment on table public.resofit_wellness_route_registry is 'Canonical Abia wellness route registry. Discovery is open; verification_layer is not a commercial partnership gate.';
