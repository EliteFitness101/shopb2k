-- Additional canonical events used by the ResoFit Revenue OS client.
insert into public.resofit_event_contracts (event_name, contract_version, description, required_fields, critical)
values
  ('funnel.page_viewed','1.0','A visitor viewed a ResoFit funnel page.',array[],false),
  ('funnel.cta_clicked','1.0','A visitor clicked a tracked ResoFit call to action.',array[],true),
  ('assessment.started','1.0','A visitor started the ResoFit assessment.',array[],true),
  ('conversation.whatsapp_clicked','1.0','A visitor initiated a WhatsApp conversation from ResoFit.',array[],true)
on conflict (event_name, contract_version) do update set description = excluded.description, required_fields = excluded.required_fields, critical = excluded.critical, updated_at = now();
