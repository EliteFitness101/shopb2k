alter table public.makaveli_bookings add column if not exists hub_slug text not null default 'makaveli-wellness-hub-aba';
alter table public.makaveli_bookings add column if not exists hub_name text not null default 'Makaveli Wellness Hub';
create index if not exists makaveli_bookings_hub_idx on public.makaveli_bookings(hub_slug);
