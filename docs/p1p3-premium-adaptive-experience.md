# ResoFit OS™ P1–P3 Premium Adaptive Experience & Protection

## Executive intent
Create a premium, luxury, conversion-oriented experience that adapts to device capability, accessibility preferences, network conditions and declared user preferences while preserving privacy, safety, legal compliance and brand trust.

This document is an architecture contract. It does not expose secrets, bypass security controls, or make unsupported claims of compliance.

## Personalization boundaries
The experience may adapt presentation using explicit or reasonably inferred non-sensitive context such as:
- device class and viewport
- reduced-motion preference
- contrast/font/input accessibility settings
- network quality and data-saver signals
- language/locale/country
- explicit color/theme preference
- explicit age band where genuinely needed for UX
- explicit content preferences

Gender may be used only when the user voluntarily provides it and when it materially improves a requested experience. It must never be inferred from appearance or used to make sensitive decisions.

Zodiac/astrology may be offered only as an optional entertainment/personalization layer when relevant and clearly non-scientific; it must never determine health, medical, financial, eligibility or safety decisions.

No personalization dimension may be used to discriminate or expose sensitive attributes.

## Premium visual system
Use a restrained luxury system inspired by high-quality product/editorial experiences rather than copying another brand:
- premium typography hierarchy
- glass/soft-depth surfaces where performance permits
- restrained motion and micro-interactions
- cinematic but lightweight media
- progressive image/video loading
- responsive portrait/landscape composition
- high-quality empty/loading/error/success states
- contextual storytelling and proof
- clear CTA hierarchy
- accessible contrast and focus states

Decorative effects are capability-aware and disabled or simplified under reduced-motion, low-power, low-bandwidth or accessibility constraints.

## Elder/accessible adaptation
When an appropriate accessibility preference or explicit user setting indicates need:
- increase text and control sizes
- simplify density
- increase contrast
- reduce animation
- enlarge tap targets
- provide plain-language labels
- expose screen-reader landmarks and announcements
- avoid auto-playing audio
- preserve the same core functionality

Do not label a user as elderly solely from age inference. Use explicit preference or accessibility signals.

## Screen capture / protected previews
For sensitive digital assets, certificates, premium downloads or protected previews, use layered access control, signed short-lived URLs, watermarking/traceability where lawful, entitlement checks and server-side delivery controls.

The web platform cannot reliably guarantee “zero screen recording.” Do not claim that it can. Where reasonably necessary, suppress download/print/copy controls, use visible/forensic watermarking and policy warnings, and consider native-app DRM capabilities for genuinely high-value media.

Do not use anti-debugging or hostile scripts that damage accessibility or user devices.

## Security hardening
Apply policy-approved controls where technically and legally appropriate:
- rate limiting
- bot/WAF signals
- reputation/abuse detection
- known malicious IP/blocklist feeds
- anomaly detection
- geo-risk signals
- VPN/proxy/Tor risk signals only as risk factors, not automatic proof of abuse
- step-up verification
- device/session binding
- signed URLs
- short-lived tokens
- download audit events
- entitlement checks
- replay protection
- CSP, HSTS and secure headers
- server-side authorization

Never rely on IP, region or VPN detection alone for a consequential denial. Provide a legitimate recovery/appeal path.

## Digital asset protection
Deliverables may be represented as traceable assets:
- asset ID
- entitlement ID
- customer/member ID
- issue/version ID
- timestamp
- signed access URL
- expiry
- download/view event
- optional lawful watermark/reference ID

Recipes, meal plans, workout guides, videos, images, ebooks, certificates and dashboards should use the same entitlement-aware delivery layer.

## Legal/compliance architecture
The platform should support versioned policy contexts for applicable:
- privacy/data protection
- cookies/consent
- terms
- refunds
- delivery
- disclaimers
- supplements
- nutrition/meal plans
- fitness/workout guidance
- intellectual property/trademarks
- digital content
- payments
- promotions

For Nigeria, product/regulatory claims must be reviewed for applicable NAFDAC requirements. Do not state “HIPAA compliant” merely because healthcare-style controls exist; HIPAA applicability depends on the actual entity, role and regulated data flow. Use “HIPAA-aligned” only when a qualified compliance review supports that description.

## SEO and robots
Security controls must not accidentally block legitimate search discovery. Maintain:
- clean canonical URLs
- sitemap
- robots.txt
- structured data where truthful
- crawlable public content
- noindex for private/member/checkout/administrative content
- secure asset URLs
- no indexing of protected deliverables

Do not use robots.txt as an access-control mechanism.

## Media/asset pipeline
Preferred pipeline:
source asset → validation → optimization → responsive variants → modern format → fallback → CDN/cache → signed/private delivery where required.

Use responsive images, lazy loading below the fold, preload only critical media, adaptive video bitrate/codecs, poster frames, and modern formats with compatibility fallbacks.

Never ship unnecessary heavyweight scripts merely for visual effects.

## P1–P3 engagement sequence
The first seconds should communicate value without misleading urgency:

### 0–3 seconds
- brand recognition
- clear value proposition
- fast visual anchor
- immediate intent cue
- no blocking hero video dependency

### 3–5 seconds
- relevant proof/context
- concise benefit
- clear next action

### 5–8 seconds
- personalization prompt, product/program context, transformation proof or guided question
- trust signal
- route toward the next useful action

These timings are optimization targets, not guarantees. Measure actual mobile performance and conversion.

## Network adaptation
Define experience tiers:
- offline/no network: cached shell, saved progress, queued safe actions
- very low bandwidth: text-first, no autoplay, compressed images
- low bandwidth: lightweight responsive media
- normal: standard experience
- high bandwidth: enhanced media/video where useful

PWA/service-worker caching must never cache private responses in shared caches. Sensitive member data remains appropriately scoped and encrypted.

## Device adaptation
Support:
- phone portrait
- phone landscape
- tablet
- desktop
- high-density displays
- foldables where practical
- future devices through progressive enhancement

Use capability detection rather than brittle user-agent assumptions.

## Coach B2K / ChatB2K presentation
User-facing experiences should present ResoFit's proprietary brand, methodology, resources and human/coach authority. They should not falsely claim that a hidden AI instance is a human coach.

Where the product requirement is “zero AI instances on visitor-facing UI,” the interface must expose branded proprietary guidance and approved content rather than model/provider branding. Internal intelligence can remain behind the service boundary.

Real-time personalization should be based on actual user/session context and current canonical data—not fabricated personas or invented transformation claims.

## Content generation and automation gates
The following capabilities must pass through the same health/security/content checks before publication or distribution:
- `/generators`
- `/scripts`
- `content.resofit.fit/generator`
- `/schedule`
- `/post`
- `/downloader`
- `/auto-post`
- `/socials`
- content/media generation pipelines

Required pipeline:
`draft → policy/content checks → asset checks → accessibility → security scan → metadata/SEO validation → approval/guard → publish → health check → dashboard/observability`.

Deployment automation follows:
`build → test → security → preview → smoke/E2E → approval → production → health → rollback capability`.

## Dashboard/observability
Track:
- LCP/INP/CLS
- page errors
- checkout errors
- assessment completion
- CTA engagement
- recommendation resolution
- payment success/failure
- entitlement creation
- download/view events
- content publishing health
- route health
- security events
- accessibility issues
- network-tier performance

Do not collect unnecessary sensitive data. Analytics events should use pseudonymous identifiers where possible.

## African/global resilience
Optimize for:
- mobile-first usage
- fluctuating networks
- low bandwidth
- intermittent connectivity
- affordable data consumption
- local currency/payment realities
- multilingual expansion
- global localization

The experience should degrade gracefully rather than presenting a broken luxury shell.

## Required architecture invariants
1. No hardcoded product, price or provider in ChatB2K™.
2. No hardcoded policy prose in frontend components.
3. No secret credentials in client code.
4. No private deliverables exposed through public URLs.
5. No guarantee of defeating screenshots/screen recording.
6. No accessibility-breaking anti-bot tricks.
7. No medical/regulatory claims without appropriate review.
8. No sensitive profiling from zodiac, gender, age or visual appearance.
9. No robots.txt dependence for access control.
10. Every generator/publisher/deployment route has authentication, authorization, validation and health gates.
11. Every downloadable protected asset is entitlement-aware and traceable where lawful.
12. Every premium effect has a reduced-motion/low-bandwidth fallback.
13. Every critical journey has a non-media fallback.
14. Shop/store separation remains intact.
15. ChatB2K™ selects from current canonical data/services at runtime.
