import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type JumiaOffer = {
  id: string;
  title: string;
  price: number | string | null;
  currency: string | null;
  availability: string | null;
  fulfillment_mode: string | null;
  external_url: string | null;
  verified_at: string | null;
};

export const getJumiaOffers = createServerFn({ method: "GET" }).handler(async () => {
  const { data: source, error: sourceError } = await supabaseAdmin
    .from("commerce_sources")
    .select("id,name,enabled,checkout_mode")
    .eq("name", "Jumia Nigeria")
    .maybeSingle();

  if (sourceError) throw new Error(`Jumia source lookup failed: ${sourceError.message}`);
  if (!source?.enabled) return { source: null, offers: [] as JumiaOffer[] };

  const { data, error } = await supabaseAdmin
    .from("commerce_offers")
    .select("id,title,price,currency,availability,fulfillment_mode,external_url,verified_at")
    .eq("source_id", source.id)
    .order("title", { ascending: true });

  if (error) throw new Error(`Jumia offer lookup failed: ${error.message}`);

  return {
    source: {
      name: source.name,
      checkout_mode: source.checkout_mode,
    },
    offers: (data ?? []) as JumiaOffer[],
  };
});
