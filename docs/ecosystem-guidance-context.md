# ResoFit OS™ Ecosystem Guidance & Policy Context

## Purpose
Define a centralized, data-driven policy/context layer for customer guidance without duplicating policy text across frontend pages.

## Principles
- Policy and disclaimer content is maintained as versioned server-side content/configuration.
- Frontends render only the minimum contextual acknowledgement required for the current action.
- Footer exposes compact links to Legal, Privacy, Terms, Refunds, Delivery, Disclaimers and Payment Policy.
- Checkout, assessment, onboarding, upgrade, upsell and forms use contextual acknowledgement controls rather than large policy blocks.
- Required acceptance is explicit, versioned, timestamped and associated with the user/session/action.
- Non-required information is progressively disclosed through a modal, drawer or dedicated policy route.
- Never claim a supplement, meal plan, workout guide or wellness protocol diagnoses, treats or cures disease.

## Content domains
The policy registry must support versioned records for:
- Supplements: ingredient, usage, contraindication/precaution, allergy and regulatory disclaimer.
- Meal plans: educational wellness/nutrition guidance disclaimer; not medical diagnosis or treatment.
- Meal & Workout guides: educational fitness/nutrition guidance, suitability and professional-advice disclaimer.
- Digital guides, ebooks, magazines and training materials: informational/content-use terms.
- Product customization: specifications, availability, personalization, lead times and approval requirements.
- Delivery: zones, estimated timelines, tracking, customs/import obligations and exceptional delays.
- White-glove delivery: appointment, access, handling, installation and additional-fee terms where applicable.
- Payments: provider, currency, authorization, settlement, manual-payment and refund conditions.
- Refunds: product/service-specific eligibility and statutory-rights preservation.
- Gifts/packages: recipient, customization, delivery and return conditions.
- Ecosystem: general terms, privacy, cookies/consent, acceptable use and platform limitations.

## Smart acknowledgement pattern
The runtime action resolver determines whether acknowledgement is required. Examples:
- Assessment: concise acknowledgement + Continue.
- Onboarding: Terms/Privacy acknowledgement when required.
- Supplement checkout: concise safety acknowledgement + Continue.
- Meal-plan purchase: concise educational-use acknowledgement + Continue.
- Workout guide: suitability acknowledgement + Continue.
- Payment: payment terms/refund link + required acceptance before authorization where applicable.
- Customization: specification/lead-time acknowledgement before submission.
- Delivery request: address/zone/timeline acknowledgement.

The frontend must not hardcode policy prose. It receives a policy ID, version, short contextual label, required flag and canonical policy route from the policy service.

## Accessibility and premium UX
- Detect reduced-motion and other relevant device accessibility preferences before enabling decorative motion.
- Respect browser/device contrast, font-size and input settings.
- Never use animation as the only indication of progress or state.
- Use concise luxury-brand visual guidance, clear loading states and reassuring progress indicators.
- Preserve keyboard, screen-reader and touch accessibility.
- Avoid unnecessary text repetition and policy litter.

## Ecosystem route registry
Future/optional capabilities are represented by registry entries, not automatically exposed as public pages:

`/packages`
`/gift`
`/delivery-request`
`/white-glove-delivery-request`
`/customization-designer`
`/terminal-api-integration`
`/delivery-platform`
`/image-kit`
`/socials`
`/auto-post`
`/upgrade`
`/referral`
`/earn`
`/agency`
`/bigo`
`/stream`
`/host`
`/agent`
`/distributor`
`/context`

Infrastructure/admin-only concepts such as generators, serverless functions, deployment controls and automation remain protected operational surfaces; they are not customer navigation by default.

## Product formats
The catalog/service layer may support physical and digital fulfillment including meal plans, ebooks, guides, magazines, training materials, hardcover requests, removable-media requests and approved personalized/gift items. Each format must declare its fulfillment type, availability, delivery policy and applicable acknowledgement requirements.

## Safety boundary
The system may personalize wellness content but must not infer medical diagnoses or provide unsafe treatment instructions. Sensitive/high-consequence recommendations require appropriate safeguards and escalation to qualified professionals where relevant.

## Source of truth
Policy content, versions, applicability rules and acceptance requirements are resolved from the canonical server-side service. ChatB2K™ may select the relevant policy context, but it does not own or hardcode policy text.
