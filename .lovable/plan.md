## ResoFit™ Production Optimization Patch v2.1 — Plan

This is a **refinement pass**. No existing working feature will be rebuilt, duplicated, or removed. All Shopify, cart, checkout, tracking, attribution, Product Intelligence, Smart Image Priority, and Make.com wiring stays intact — only presentation, copy, structure, and missing surfaces are added.

### 1. Copy & Brand Repositioning (customer-facing only)
- Global find/replace of user-visible "AI …" strings → **ChatB2K™** variants (`ChatB2K™ Wellness Assessment`, `Personalized by ChatB2K™`, `Chat with CoachB2K™`).
- Reframe hero + section copy on `index.tsx`, `personalize.tsx`, `shop.tsx`, header/footer away from weight-loss/fitness-only toward **Africa's Personalized Wellness Platform** (longevity, mobility, recovery, nutrition, confidence, strength).
- Backend files, env vars, webhook names, internal identifiers untouched.

### 2. Shared Navigation & Footer (consolidation)
- Refactor `SiteHeader.tsx` to the canonical nav: Home · Programs · Assessment · Shop · Blog · Success Stories · About · Contact, with primary CTA **Start My Personalized Plan** → `/personalize`.
- Add `SiteFooter` usage across every route that currently lacks it; single source of truth (Programs, Assessment, Shop, Blog, Knowledge Hub, Support, Privacy, Terms, Newsletter stub, socials).
- Standardize CTA labels via a small `src/lib/ctas.ts` constants module — reused everywhere, no new button component.

### 3. Reusable Ecosystem Carousel (one component, one data source)
- New `src/components/EcosystemCarousel.tsx` (single implementation): swipe, auto-scroll (respects `prefers-reduced-motion`), keyboard arrows, lazy `ProductImage`, analytics via existing `track()`.
- Data lives in `src/lib/ecosystem.ts` (shared cards: Programs, Assessment, Shop, Blog, Knowledge Hub, Success Stories, Elite, Candera, ResoLuxe Privé, Personalize).
- Dropped into Home + new Programs / Blog / Knowledge Hub / Success Stories / About pages. Reuses existing image pipeline.

### 4. New lightweight routes (only where absent)
Reusing existing layout primitives, `ProductImage`, `TrustBar`, tokens — no new design system:
- `/programs` + `/programs/$slug` (Overview, Benefits, Who it's for, Outcomes, FAQs, Related equipment/articles/assessments, final CTA).
- `/blog` + `/blog/$slug` (categories, featured, search filter, related products/programs; each article ends with **Start My Personalized Plan**).
- `/knowledge` (Knowledge Hub grid: Nutrition, Healthy Living, Healthy Ageing, Movement, Strength, Mobility, Recovery, Body Confidence, Recipes, Equipment Guides).
- `/success-stories`, `/about`, `/contact` (light content pages).
Content seeded from a local `src/content/*.ts` static source — no CMS, no backend.

### 5. Homepage hierarchy refinement (no rebuild)
Reorder existing sections of `index.tsx` into: Hero → Trust → Who We Help → How It Works → Programs (carousel) → Featured Equipment (existing Shopify grid) → Knowledge Hub (carousel) → Success Stories (carousel) → Final CTA. All existing Shopify fetches, A/B test hero, preload logic preserved.

### 6. Shop enhancements (Storefront API preserved)
- Add **Related products** + **Recently viewed** rails on PDP (`product.$handle.tsx`) using existing Storefront client and `ProductImage`.
- Add **Continue shopping** and **Wellness bundles** rails on `/shop` — pure presentation over existing product fetch.
- No cart/checkout change.

### 7. SEO / Head metadata
- Per-route `head()` on every new + existing leaf: unique title, description, canonical, og:title/description/type, twitter:card. Leaf-only `og:image` (never root).
- JSON-LD: `WebSite`/`Organization` sitewide (root already has meta), `Article` on blog leaves, `Product` on PDP, `BreadcrumbList` on deep routes.
- Add `public/robots.txt` if missing and `src/routes/sitemap[.]xml.ts` server route enumerating public routes + Shopify handles.

### 8. Performance & accessibility polish
- Ensure lazy-load remains default; verify no duplicate `preload` for the same hero.
- Add `prefers-reduced-motion` guard to carousel + hero motion.
- Focus-visible rings, ARIA labels on icon buttons (WhatsApp float, cart trigger, carousel arrows), semantic `<main>` per route, `h-dvh` for full-height sections.
- Consolidate: remove any duplicate analytics call sites discovered during audit; keep single `track()` path.

### 9. Analytics preserved
Existing events (`landing_view`, `product_view`, `product_click`, `product_score_update`, `hero_promoted`, `demoted`, `assessment_click`, `checkout_start`) stay wired through `src/lib/tracking.ts` and `productIntelligence.ts`. New carousel/CTA clicks reuse the same `track()` — no new pipeline.

### 10. Validation report (delivered at end)
- **Verified in-repo:** SEO metadata coverage, route existence, analytics call sites, image priority tiers, Shopify client usage, WhatsApp float presence.
- **Configuration Verified — Manual Production Test Required:** Shopify live checkout, Make.com webhook receipt, WhatsApp deep-link, published domain HTTPS/DNS.
- **Unable to verify from current environment:** Vercel deploy, analytics dashboard ingestion.
Manual steps listed for each.

### Files touched (net)
Edit: `SiteHeader.tsx`, `SiteFooter.tsx`, `TrustBar.tsx`, `WhatsAppFloat.tsx`, `index.tsx`, `shop.tsx`, `product.$handle.tsx`, `personalize.tsx`, `__root.tsx`, `tracking.ts` (types only).
Create: `EcosystemCarousel.tsx`, `ctas.ts`, `ecosystem.ts`, `content/programs.ts`, `content/blog.ts`, `content/knowledge.ts`, `content/successStories.ts`, routes `programs.tsx`, `programs.$slug.tsx`, `blog.tsx`, `blog.$slug.tsx`, `knowledge.tsx`, `success-stories.tsx`, `about.tsx`, `contact.tsx`, `sitemap[.]xml.ts`, `public/robots.txt`.
No file deletions. No dependency additions.

### Out of scope (explicitly)
Supabase, custom checkout, CMS, auth, monorepo, Next.js, image regeneration, price mutation, backend edits.

### Confirm before I proceed
This is a broad pass (~15–20 file edits + ~10 new files). Reply **"go"** to execute end-to-end, or tell me which subset to ship first (e.g. "just nav + copy + SEO" or "just Blog + Programs").