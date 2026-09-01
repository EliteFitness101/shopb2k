export type WellnessDiscoverySource = {
  id: string;
  name: string;
  countryScope: string;
  category: string;
  url: string;
  notes: string;
};

/** Public discovery sources. These are discovery inputs, not verification authorities. */
export const WELLNESS_DISCOVERY_SOURCES: WellnessDiscoverySource[] = [
  { id: "goafrica-ng", name: "Go Africa Online Nigeria", countryScope: "Nigeria", category: "spa-sauna", url: "https://www.goafricaonline.com/ng/directory/spas-saunas", notes: "Large public directory; listings must be deduplicated and verified." },
  { id: "goafrica-gh", name: "Go Africa Online Ghana", countryScope: "Ghana", category: "spa-sauna", url: "https://www.goafricaonline.com/gh/directory/spas-saunas", notes: "Public Ghana spa/sauna directory." },
  { id: "goafrica-africa", name: "Go Africa Online Africa", countryScope: "Africa", category: "spa-sauna", url: "https://www.goafricaonline.com/annuaire/spa-sauna", notes: "Africa-wide discovery source." },
  { id: "fresha-ng", name: "Fresha Nigeria", countryScope: "Nigeria", category: "spa-sauna", url: "https://www.fresha.com/lp/en/bt/spas-and-saunas/in/nigeria", notes: "Booking marketplace; treat marketplace verification separately from ResoFit verification." },
  { id: "businesslist-ng", name: "BusinessList Nigeria", countryScope: "Nigeria", category: "spa", url: "https://www.businesslist.com.ng/companies/spa", notes: "Public business directory." },
  { id: "spadirectory-africa", name: "Spa Directory Africa", countryScope: "Africa", category: "spa-wellness", url: "https://www.spadirectory.co.za/", notes: "Africa-focused spa directory." },
  { id: "fastbase-ng", name: "Fastbase Nigeria", countryScope: "Nigeria", category: "spa-health-spa", url: "https://www.fastbase.com/countryindex/Nigeria/S/Spa", notes: "Large directory; public results may be incomplete and should be verified." },
  { id: "browsenaija", name: "BrowseNaija", countryScope: "Nigeria", category: "spa-wellness", url: "https://browsenaija.com/", notes: "Nigeria-wide local search directory." },
];
