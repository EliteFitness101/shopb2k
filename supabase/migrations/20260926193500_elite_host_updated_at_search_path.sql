-- ResoFit production security hardening: pin trigger search_path to prevent mutable resolution.
ALTER FUNCTION public.elite_host_applications_touch_updated_at() SET search_path = public, pg_temp;
