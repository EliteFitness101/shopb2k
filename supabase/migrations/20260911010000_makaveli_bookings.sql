create table if not exists public.makaveli_bookings (
  id uuid primary key default gen_random_uuid(),
  booking_reference text not null unique,
  service_slug text not null,
  service_name text not null,
  amount_ngn numeric not null check (amount_ngn >= 0),
  currency text not null default 'NGN',
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  preferred_date date,
  preferred_time text,
  notes text,
  status text not null default 'pending' check (status in ('pending','payment_pending','paid','confirmed','cancelled','refunded','request_only')),
  payment_reference text unique,
  paystack_access_code text,
  payment_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.makaveli_bookings enable row level security;
create index if not exists makaveli_bookings_service_idx on public.makaveli_bookings(service_slug);
create index if not exists makaveli_bookings_date_idx on public.makaveli_bookings(preferred_date);
create index if not exists makaveli_bookings_payment_idx on public.makaveli_bookings(payment_reference);
