export type WellnessHubQuery = {
  query?: string; state?: string; city?: string; latitude?: number; longitude?: number; radiusKm?: number; service?: string;
};
export type WellnessHubResult = {
  id: string; hub_code: string; name: string; slug: string; description?: string | null; address?: string | null; latitude: number; longitude: number;
  phone?: string | null; whatsapp?: string | null; website?: string | null; email?: string | null; distance_km: number | null;
  verification_status: string; discovery_status?: string; services: Array<{ id: string; service_entity_id?: string | null; service_name: string; description?: string | null; price?: number | null; currency: string; duration_minutes?: number | null; booking_method: string }>;
};
export type WellnessSearchIntent = { originalQuery: string; service?: string; state?: string; city?: string; needsLocation: boolean };
const SERVICE_TERMS: Array<[string, string]> = [["massage","massage"],["spa","spa"],["physiotherapy","physiotherapy"],["physical therapy","physiotherapy"],["back pain","back pain"],["joint pain","joint pain"],["arthritis","arthritis"],["recovery","recovery"],["mobility","mobility"],["stretch","stretching"],["fitness","fitness"],["wellness","wellness"]];
const NIGERIAN_STATES = ["abia","adamawa","akwa-ibom","anambra","bauchi","bayelsa","benue","borno","cross river","delta","ebonyi","edo","ekiti","enugu","gombe","imo","jigawa","kaduna","kano","katsina","kebbi","kogi","kwara","lagos","nasarawa","niger","ogun","ondo","osun","oyo","plateau","rivers","sokoto","taraba","yobe","zamfara","fct","abuja"];
export function parseWellnessSearchIntent(input: string): WellnessSearchIntent {
  const originalQuery=input.trim(); const normalized=originalQuery.toLowerCase(); const service=SERVICE_TERMS.find(([term])=>normalized.includes(term))?.[1]; const state=NIGERIAN_STATES.find((candidate)=>normalized.includes(candidate)); const needsLocation=/near me|nearby|around me|closest|nearest|in my area|where can i|where is/i.test(normalized); return {originalQuery,service,state,needsLocation};
}
/** ChatB2K Wellness capability: resolve wellness locations from the canonical ResoFit Wellness Locator. Results may be verified ResoFit hubs or clearly labeled external/discovered listings. */
export async function findWellnessHubs(query: WellnessHubQuery) {
  const baseUrl=import.meta.env.VITE_SUPABASE_URL as string|undefined; const publishableKey=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string|undefined; if(!baseUrl) throw new Error("Wellness locator is not configured");
  const intent=query.query?parseWellnessSearchIntent(query.query):undefined; const params=new URLSearchParams({action:"nearby"}); const state=query.state??intent?.state; const service=query.service??intent?.service;
  if(state) params.set("state",state); if(query.city) params.set("city",query.city); if(service) params.set("service",service); if(query.query) params.set("q",query.query); if(query.latitude!==undefined) params.set("lat",String(query.latitude)); if(query.longitude!==undefined) params.set("lng",String(query.longitude)); if(query.radiusKm!==undefined) params.set("radius_km",String(query.radiusKm));
  const response=await fetch(`${baseUrl}/functions/v1/wellness-locator?${params.toString()}`,{headers:publishableKey?{apikey:publishableKey}:undefined}); if(!response.ok) throw new Error(`Wellness locator failed with HTTP ${response.status}`);
  return await response.json() as {query:Record<string,unknown>;results:WellnessHubResult[];count:number};
}
