-- ResoFit ecosystem identity/cart hardening: shared member session is client-side first-party cookie;
-- server-side cart ledger and least-privilege function execution are canonical.
begin;

revoke execute on function public.farm_access_allowed(uuid,uuid) from public, anon;
grant execute on function public.farm_access_allowed(uuid,uuid) to authenticated;
revoke execute on function public.farm_audit_row() from public, anon, authenticated;
revoke execute on function public.farm_calculate_fee() from public, anon, authenticated;
revoke execute on function public.farm_sync_placement_fee() from public, anon, authenticated;
revoke execute on function public.fulfill_successful_payment() from public, anon, authenticated;
revoke execute on function public.get_martial_x_onboarding_state(uuid) from public, anon;
grant execute on function public.get_martial_x_onboarding_state(uuid) to authenticated;
revoke execute on function public.has_course_access(uuid,uuid) from public, anon;
grant execute on function public.has_course_access(uuid,uuid) to authenticated;
revoke execute on function public.lessons_course_id(uuid) from public, anon;
grant execute on function public.lessons_course_id(uuid) to authenticated;
revoke execute on function public.martial_x_application_submitted_event() from public, anon, authenticated;
revoke execute on function public.martial_x_normalize_application() from public, anon, authenticated;
revoke execute on function public.martial_x_paid_payment_sync() from public, anon, authenticated;
revoke execute on function public.queue_delivery_after_source(uuid) from public, anon, authenticated;
revoke execute on function public.recruitment_stats() from public, anon;
grant execute on function public.recruitment_stats() to authenticated;
revoke execute on function public.sync_martial_x_academy_enrollment(uuid) from public, anon, authenticated;
revoke execute on function public.sync_martial_x_on_auth_user() from public, anon, authenticated;

create or replace function public.farm_sync_placement_fee()
returns trigger language plpgsql security definer set search_path to 'public'
as $function$
begin
  insert into public.farm_placement_fees(placement_id,fee_rate,fee_base,fee_amount,invoice_status,payment_status,payment_date)
  values(new.id,new.fee_rate,new.fee_base,new.fee_amount,coalesce(new.invoice_status,'pending'),coalesce(new.payment_status,'pending'),new.payment_date)
  on conflict (placement_id) do update set
    fee_rate=excluded.fee_rate,fee_base=excluded.fee_base,fee_amount=excluded.fee_amount,
    invoice_status=excluded.invoice_status,payment_status=excluded.payment_status,payment_date=excluded.payment_date,updated_at=now();
  return new;
end
$function$;
revoke execute on function public.farm_sync_placement_fee() from public,anon,authenticated;

create table if not exists public.resofit_cart_sessions (
  id uuid primary key default gen_random_uuid(),
  cart_token text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  anonymous_id text,
  session_id text,
  rsid text,
  funnel_origin text,
  utm jsonb not null default '{}'::jsonb,
  customer_email text,
  customer_name text,
  customer_phone text,
  currency text not null default 'NGN',
  status text not null default 'active' check(status in ('active','abandoned','converted','expired')),
  checkout_started_at timestamptz,
  converted_at timestamptz,
  converted_payment_id uuid,
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.resofit_cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.resofit_cart_sessions(id) on delete cascade,
  sku text not null,
  title_snapshot text,
  quantity integer not null default 1 check(quantity>0),
  unit_price numeric(14,2) not null default 0,
  currency text not null default 'NGN',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(cart_id,sku)
);
create index if not exists idx_resofit_cart_sessions_user on public.resofit_cart_sessions(user_id);
create index if not exists idx_resofit_cart_sessions_anon on public.resofit_cart_sessions(anonymous_id);
create index if not exists idx_resofit_cart_sessions_status_activity on public.resofit_cart_sessions(status,last_activity_at);
create index if not exists idx_resofit_cart_items_cart on public.resofit_cart_items(cart_id);

alter table public.resofit_cart_sessions enable row level security;
alter table public.resofit_cart_items enable row level security;
revoke all on table public.resofit_cart_sessions,public.resofit_cart_items from anon,authenticated;
grant select,insert,update,delete on table public.resofit_cart_sessions,public.resofit_cart_items to authenticated;

drop policy if exists cart_sessions_owner_select on public.resofit_cart_sessions;
create policy cart_sessions_owner_select on public.resofit_cart_sessions for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists cart_sessions_owner_insert on public.resofit_cart_sessions;
create policy cart_sessions_owner_insert on public.resofit_cart_sessions for insert to authenticated with check(user_id=(select auth.uid()));
drop policy if exists cart_sessions_owner_update on public.resofit_cart_sessions;
create policy cart_sessions_owner_update on public.resofit_cart_sessions for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop policy if exists cart_sessions_owner_delete on public.resofit_cart_sessions;
create policy cart_sessions_owner_delete on public.resofit_cart_sessions for delete to authenticated using(user_id=(select auth.uid()));

drop policy if exists cart_items_owner_select on public.resofit_cart_items;
create policy cart_items_owner_select on public.resofit_cart_items for select to authenticated using(exists(select 1 from public.resofit_cart_sessions s where s.id=cart_id and s.user_id=(select auth.uid())));
drop policy if exists cart_items_owner_insert on public.resofit_cart_items;
create policy cart_items_owner_insert on public.resofit_cart_items for insert to authenticated with check(exists(select 1 from public.resofit_cart_sessions s where s.id=cart_id and s.user_id=(select auth.uid())));
drop policy if exists cart_items_owner_update on public.resofit_cart_items;
create policy cart_items_owner_update on public.resofit_cart_items for update to authenticated using(exists(select 1 from public.resofit_cart_sessions s where s.id=cart_id and s.user_id=(select auth.uid()))) with check(exists(select 1 from public.resofit_cart_sessions s where s.id=cart_id and s.user_id=(select auth.uid())));
drop policy if exists cart_items_owner_delete on public.resofit_cart_items;
create policy cart_items_owner_delete on public.resofit_cart_items for delete to authenticated using(exists(select 1 from public.resofit_cart_sessions s where s.id=cart_id and s.user_id=(select auth.uid())));

create or replace function public.get_martial_x_onboarding_state(_user uuid)
returns jsonb language plpgsql stable security definer set search_path to 'public'
as $function$
declare v_tier text;v_basic uuid;v_done int:=0;v_total int:=0;v_assessment jsonb;v_payment jsonb:='null'::jsonb;v_apps jsonb:='[]'::jsonb;v_primary_app jsonb:='null'::jsonb;v_paid_program text;
begin
 if _user is null then return jsonb_build_object('stage','visitor','tier','none','applications','[]'::jsonb,'payment','null'::jsonb,'primary_application','null'::jsonb); end if;
 if auth.uid() is null or (auth.uid()<>_user and not public.has_role(auth.uid(),'admin'::app_role)) then raise exception 'not authorized'; end if;
 select e.tier into v_tier from public.enrollments e where e.user_id=_user and e.active=true order by case e.tier when 'vip' then 3 when 'elite' then 2 when 'basic' then 1 else 0 end desc limit 1;
 select id into v_basic from public.courses where slug='foundation-conditioning' and published=true limit 1;
 select count(*) into v_total from public.lessons l join public.modules m on m.id=l.module_id where m.course_id=v_basic and l.published and m.published;
 select count(*) into v_done from public.lesson_progress lp join public.lessons l on l.id=lp.lesson_id join public.modules m on m.id=l.module_id where lp.user_id=_user and m.course_id=v_basic and l.published and m.published and lp.completed_at is not null;
 select to_jsonb(a) into v_assessment from public.academy_assessments a where a.user_id=_user and a.assessment_type='digital-audition' order by a.created_at desc limit 1;
 select jsonb_agg(to_jsonb(x) order by x.created_at desc) into v_apps from (select id,reference_number,program,status,stage,location,created_at from public.applications where user_id=_user order by created_at desc)x; v_apps:=coalesce(v_apps,'[]'::jsonb);
 select jsonb_build_object('reference',p.paystack_ref,'rsid',p.rsid,'status',p.status,'product_sku',p.product_sku,'amount',p.amount,'currency',p.currency,'paid_at',p.paid_at,'chat_id',p.chat_id) into v_payment from public.payments p where p.user_id=_user and p.status='success' order by p.paid_at desc nulls last limit 1; v_payment:=coalesce(v_payment,'null'::jsonb);
 select case when p.product_sku='MX-BASIC-WARRIOR' then 'Basic Warrior' when p.product_sku='MX-ELITE-SECURITY' then 'Elite Security Track' when p.product_sku='MX-VIP-FAST' then 'VIP Fast Track' when p.product_sku ilike '%ELITE%SECURITY%' then 'Elite Security Track' when p.product_sku ilike '%VIP%' then 'VIP Fast Track' else null end into v_paid_program from public.payments p where p.user_id=_user and p.status='success' order by p.paid_at desc nulls last limit 1;
 select coalesce((select to_jsonb(x) from (select id,reference_number,program,status,stage,location,created_at from public.applications where user_id=_user and v_paid_program is not null and lower(coalesce(program,''))=lower(v_paid_program) order by created_at desc limit 1)x),v_apps->0,'null'::jsonb) into v_primary_app;
 return jsonb_build_object('stage',case when v_tier is null then 'payment_required' when v_assessment is not null and v_assessment->>'status'='submitted' then 'assessment_submitted' when v_done=v_total and v_total>0 then 'foundation_complete' else 'foundation_training' end,'tier',coalesce(v_tier,'none'),'foundation_course_id',v_basic,'lessons_completed',v_done,'lessons_total',v_total,'assessment',coalesce(v_assessment,'null'::jsonb),'payment',v_payment,'applications',v_apps,'primary_application',v_primary_app,'resume',case when v_tier is null then 'payment' when v_assessment is not null and v_assessment->>'status'='submitted' then 'assessment_review' when v_done=v_total and v_total>0 then 'next_tier_or_physical' else 'foundation_training' end);
end
$function$;
revoke execute on function public.get_martial_x_onboarding_state(uuid) from public,anon;
grant execute on function public.get_martial_x_onboarding_state(uuid) to authenticated;

create or replace function public.has_course_access(_user uuid,_course uuid)
returns boolean language sql stable security definer set search_path to 'public'
as $function$ select (auth.uid() is not null and (auth.uid()=_user or public.has_role(auth.uid(),'admin'::app_role))) and (exists(select 1 from public.courses c join public.enrollments e on e.user_id=_user and e.active=true where c.id=_course and ((c.required_tier='basic' and e.tier in('basic','elite','vip')) or (c.required_tier='elite' and e.tier in('elite','vip')) or (c.required_tier='vip' and e.tier='vip'))) or public.has_role(_user,'admin')); $function$;
revoke execute on function public.has_course_access(uuid,uuid) from public,anon;
grant execute on function public.has_course_access(uuid,uuid) to authenticated;

create or replace function public.mark_resofit_abandoned_carts()
returns integer language sql security definer set search_path to 'public'
as $function$ with changed as (update public.resofit_cart_sessions set status='abandoned',updated_at=now() where status='active' and last_activity_at<now()-interval '24 hours' and exists(select 1 from public.resofit_cart_items i where i.cart_id=resofit_cart_sessions.id) returning 1) select count(*)::integer from changed; $function$;
revoke execute on function public.mark_resofit_abandoned_carts() from public,anon,authenticated;

do $$ begin if not exists(select 1 from cron.job where jobname='resofit-mark-abandoned-carts-hourly') then perform cron.schedule('resofit-mark-abandoned-carts-hourly','17 * * * *','select public.mark_resofit_abandoned_carts();'); end if; end $$;
commit;