-- Keep internal Buffer credential metadata and trigger implementation out of the public RPC surface.
-- The publisher Edge Function uses service_role; the trial behavior is invoked by its table trigger.
REVOKE EXECUTE ON FUNCTION public.get_buffer_access_token_source() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_buffer_access_token_source() TO service_role;

REVOKE EXECUTE ON FUNCTION public.activate_elite_media_trial() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_elite_media_trial() TO service_role;
