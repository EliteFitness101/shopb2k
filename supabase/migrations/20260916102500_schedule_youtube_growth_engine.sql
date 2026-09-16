do $$ begin
  if not exists (select 1 from cron.job where jobname='resofit-youtube-growth-engine') then
    perform cron.schedule(
      'resofit-youtube-growth-engine',
      '15 */6 * * *',
      $job$
        select net.http_post(
          url := 'https://vbqjvmnhdtdhmeeudqnn.supabase.co/functions/v1/youtube-growth-engine',
          headers := jsonb_build_object(
            'Content-Type','application/json',
            'x-content-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='buffer_cron_secret')
          ),
          body := jsonb_build_object('source','supabase-cron','time',now())
        ) as request_id;
      $job$
    );
  end if;
end $$;
