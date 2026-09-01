import { supabase } from "@/integrations/supabase/client";

export type WellnessPartnerLead = {
  id: string;
  name: string;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  address?: string | null;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  source_url?: string | null;
  source_name?: string | null;
  services: string[];
  verification_status: "unverified" | "review" | "verified" | "rejected";
  partnership_status: "prospect" | "contacted" | "replied" | "interested" | "partner" | "declined" | "do_not_contact";
  discovery_score?: number | null;
};

export type PartnerSearchQuery = {
  q?: string;
  country?: string;
  city?: string;
  service?: string;
  limit?: number;
};

export async function searchWellnessPartners(query: PartnerSearchQuery = {}) {
  const { data, error } = await supabase.rpc("wellness_partner_search", {
    q: query.q ?? null,
    p_country: query.country ?? null,
    p_city: query.city ?? null,
    p_service: query.service ?? null,
    p_limit: query.limit ?? 50,
  });
  if (error) throw error;
  return (data ?? []) as WellnessPartnerLead[];
}

export async function createPartnershipDraft(partner: WellnessPartnerLead) {
  const subject = `ResoFit Wellness Network × ${partner.name}`;
  const body = `Hello ${partner.name} team,\n\nResoFit is building Africa's personalized wellness network and would like to explore a potential brand, referral, wellness-directory, or service partnership with your business.\n\nWe can introduce your verified services to users searching for wellness support in ${partner.city ?? partner.country ?? "your market"}, subject to mutual verification and agreement.\n\nIf this is of interest, please reply with the appropriate partnership contact or visit your official website to continue the conversation.\n\nRegards,\nResoFit Wellness Network\nhttps://www.resofit.fit/wellness`;

  const { data, error } = await supabase
    .from("wellness_partner_outreach")
    .insert({
      partner_id: partner.id,
      channel: partner.email ? "email" : partner.website ? "website" : "manual",
      recipient: partner.email ?? partner.website ?? null,
      subject,
      body,
      status: "draft",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export function getPartnerContactUrl(partner: WellnessPartnerLead) {
  if (partner.website) return partner.website;
  if (partner.email) return `mailto:${partner.email}`;
  return null;
}
