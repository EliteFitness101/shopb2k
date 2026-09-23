# P1–P3 Performance, Media & Asset Security Gates

## Media priority
Critical above-the-fold media must not block first interaction. Use poster/placeholder → optimized source → enhanced media after readiness.

Priority windows:
- 0–3s: brand/value/intent; interaction available immediately
- 3–5s: proof/context
- 5–8s: personalized next action

Video must support responsive aspect-ratio selection, poster frames, adaptive bitrate and compatible fallback formats. Autoplay is muted and policy/accessibility aware.

## Asset optimization
All image/video/script assets pass:
1. file-type validation
2. malware/security scan where applicable
3. dimensions/codec validation
4. compression/transcoding
5. responsive variant generation
6. metadata stripping where privacy requires
7. CDN/cache policy
8. accessibility metadata
9. entitlement/privacy classification
10. health check

ImageKit/CDN capabilities are used through a server-side registry/configuration layer; credentials never reach the browser.

## Protected content
Private videos, downloads, certificates, premium images and digital guides use private storage/CDN delivery with short-lived signed URLs and entitlement checks. Public marketing assets may remain crawlable.

## Screen capture
Web browsers cannot reliably prevent screen recording. The system should instead combine entitlement controls, visible/forensic watermarking where lawful, short-lived URLs, rate limits, download/view logging and legal terms. Native DRM is an optional higher-protection tier for supported media.

## Accessibility
- `prefers-reduced-motion` is respected.
- Contrast and focus requirements are maintained.
- Screen-reader announcements describe state changes.
- No visual-only progress indicators.
- Autoplay does not introduce unexpected audio.
- Enlarged controls and simplified layouts are available when indicated by device/accessibility settings.

## Performance budgets
Set budgets by device/network tier rather than a single desktop target. Critical HTML/CSS/JS should remain minimal; non-critical media and scripts are deferred. Monitor real-user metrics continuously.

## Security and anti-abuse
Security layers may include WAF/bot detection, rate limits, reputation signals, region anomalies, VPN/proxy risk signals and account/device/session risk. These are risk inputs, not absolute identity proofs. High-risk actions can require step-up authentication or human review.

## Indexing
Public marketing/content pages may be indexed. Private member content, checkout, payment requests, admin routes and protected deliverables must use access controls and appropriate `noindex` metadata. `robots.txt` is only a crawl preference, never authorization.
