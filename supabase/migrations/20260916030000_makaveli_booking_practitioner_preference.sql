alter table public.makaveli_bookings
  add column if not exists practitioner_preference text;

create index if not exists makaveli_bookings_practitioner_idx
  on public.makaveli_bookings(practitioner_preference);
