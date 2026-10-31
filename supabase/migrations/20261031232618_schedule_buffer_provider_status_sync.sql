-- Keep the local Buffer publication ledger synchronized with provider status.
select cron.schedule(
  'resofit-buffer-status-sync',
  '*/10 * * * *',
  $job$
    select net.http_post(
      url := 'https://vbqjvmnhdtdhmeeudqnn.supabase.co/functions/v1/buffer-status-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-buffer-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'buffer_cron_secret')
      ),
      body := jsonb_build_object('dry_run', false, 'lookback_days', 14),
      timeout_milliseconds := 30000
    );
  $job$
);
