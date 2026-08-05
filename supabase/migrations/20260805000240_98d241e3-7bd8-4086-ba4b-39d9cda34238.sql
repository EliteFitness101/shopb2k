-- Harden RLS helpers: caller-scoped only (no arbitrary user probing).

DROP POLICY "Members view their organizations" ON public.organizations;
DROP POLICY "Org owners update organizations" ON public.organizations;
DROP POLICY "Members view org membership" ON public.organization_members;
DROP POLICY "Org admins manage membership" ON public.organization_members;
DROP POLICY "Members read org settings" ON public.organization_settings;
DROP POLICY "Org admins manage org settings" ON public.organization_settings;
DROP POLICY "Users read own feature assignments" ON public.feature_assignments;
DROP POLICY "Users read own order items" ON public.order_items;
DROP POLICY "Users insert own order items" ON public.order_items;
DROP POLICY "Users read own shipments" ON public.shipments;
DROP POLICY "Users read own shipment events" ON public.shipment_events;
DROP POLICY "Users request returns" ON public.returns;
DROP POLICY "Users read own refunds" ON public.refunds;
DROP POLICY "Users request exchanges" ON public.exchange_requests;
DROP POLICY "Users read own order timeline" ON public.order_timeline;

DROP FUNCTION public.is_org_member(uuid, uuid);
DROP FUNCTION public.has_org_role(uuid, uuid, public.org_role[]);
DROP FUNCTION public.owns_order(uuid, uuid);

CREATE OR REPLACE FUNCTION public.is_org_member(_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org_id AND user_id = auth.uid() AND status = 'active'
  )
$$;
REVOKE ALL ON FUNCTION public.is_org_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_org_member(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.has_org_role(_org_id uuid, _roles public.org_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org_id AND user_id = auth.uid()
      AND status = 'active' AND role = ANY(_roles)
  )
$$;
REVOKE ALL ON FUNCTION public.has_org_role(uuid, public.org_role[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_org_role(uuid, public.org_role[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_org_role(uuid, public.org_role[]) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.owns_order(_order_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.orders WHERE id = _order_id AND user_id = auth.uid())
$$;
REVOKE ALL ON FUNCTION public.owns_order(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.owns_order(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.owns_order(uuid) TO authenticated, service_role;

-- Rebuild policies on the hardened helpers.

CREATE POLICY "Members view their organizations" ON public.organizations
  FOR SELECT TO authenticated USING (public.is_org_member(id) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Org owners update organizations" ON public.organizations
  FOR UPDATE TO authenticated
  USING (public.has_org_role(id, ARRAY['owner','admin']::public.org_role[]) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_org_role(id, ARRAY['owner','admin']::public.org_role[]) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members view org membership" ON public.organization_members
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_org_member(organization_id) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Org admins manage membership" ON public.organization_members
  FOR ALL TO authenticated
  USING (public.has_org_role(organization_id, ARRAY['owner','admin']::public.org_role[]) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_org_role(organization_id, ARRAY['owner','admin']::public.org_role[]) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members read org settings" ON public.organization_settings
  FOR SELECT TO authenticated USING (public.is_org_member(organization_id) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Org admins manage org settings" ON public.organization_settings
  FOR ALL TO authenticated
  USING (public.has_org_role(organization_id, ARRAY['owner','admin']::public.org_role[]) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_org_role(organization_id, ARRAY['owner','admin']::public.org_role[]) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users read own feature assignments" ON public.feature_assignments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (organization_id IS NOT NULL AND public.is_org_member(organization_id)) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users read own order items" ON public.order_items
  FOR SELECT TO authenticated USING (public.owns_order(order_id) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users insert own order items" ON public.order_items
  FOR INSERT TO authenticated WITH CHECK (public.owns_order(order_id));

CREATE POLICY "Users read own shipments" ON public.shipments
  FOR SELECT TO authenticated USING (public.owns_order(order_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users read own shipment events" ON public.shipment_events
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.shipments s WHERE s.id = shipment_id AND public.owns_order(s.order_id))
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Users request returns" ON public.returns
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND public.owns_order(order_id));

CREATE POLICY "Users read own refunds" ON public.refunds
  FOR SELECT TO authenticated USING (public.owns_order(order_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users request exchanges" ON public.exchange_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND public.owns_order(order_id));

CREATE POLICY "Users read own order timeline" ON public.order_timeline
  FOR SELECT TO authenticated USING (public.owns_order(order_id) OR has_role(auth.uid(), 'admin'::app_role));
