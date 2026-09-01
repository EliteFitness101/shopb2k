// ResoFit production analytics loader — GA4, TikTok and Metricool.
// Vendor IDs are public measurement identifiers; secrets never belong here.
// Tracking remains consent-gated by the root application.

const META_ID = import.meta.env.VITE_META_PIXEL_ID as string | undefined;
const TIKTOK_ID = (import.meta.env.VITE_TIKTOK_PIXEL_ID as string | undefined) || "D9MAQ0BC77U97D5Q2QJG";
const GA4_ID = (import.meta.env.VITE_GA4_ID as string | undefined) || (import.meta.env.VITE_GA4_MEASUREMENT_ID as string | undefined) || "G-QN8CRFZ5TK";
const METRICOOL_URL = "https://tracker.metricool.com/c3po.jpg?hash=c09fea6a141d18712f0ea923d611846";

let initialized = false;
let metricoolInitialized = false;

type MetaPixel = ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue: unknown[]; push?: MetaPixel; loaded?: boolean; version?: string; };
type TikTokQueue = { push: (...items: unknown[]) => number; methods: string[]; setAndDefer: (queue: TikTokQueue, method: string) => void; _i: Record<string, TikTokQueue>; _t: Record<string, number>; load: (id: string) => void; page: () => void; [key: string]: unknown; };
declare global { interface Window { fbq?: MetaPixel; _fbq?: MetaPixel; ttq?: TikTokQueue; TiktokAnalyticsObject?: string; dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void; } }

function loadScript(src: string, id: string) { if (document.getElementById(id)) return; const s = document.createElement("script"); s.async = true; s.src = src; s.id = id; document.head.appendChild(s); }
export function initMetricool() { if (metricoolInitialized || typeof window === "undefined") return; metricoolInitialized = true; const img = document.createElement("img"); img.src = METRICOOL_URL; img.alt = ""; img.width = 1; img.height = 1; img.setAttribute("aria-hidden", "true"); img.style.position = "absolute"; img.style.width = "1px"; img.style.height = "1px"; img.style.opacity = "0"; img.style.pointerEvents = "none"; document.body.appendChild(img); }

export function initPixels() {
  if (initialized || typeof window === "undefined") return; initialized = true; initMetricool();
  if (META_ID) { (function (f: Window, b: Document, e: string, v: string) { if (f.fbq) return; const n = ((...args: unknown[]) => { if (n.callMethod) n.callMethod(...args); else n.queue.push(args); }) as MetaPixel; f.fbq = n; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = true; n.version = "2.0"; n.queue = []; const t = b.createElement(e) as HTMLScriptElement; t.async = true; t.src = v; const s = b.getElementsByTagName(e)[0]; s.parentNode!.insertBefore(t, s); })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js"); window.fbq?.("init", META_ID); window.fbq?.("track", "PageView"); }
  if (TIKTOK_ID) { (function (w: Window, d: Document, t: string) { w.TiktokAnalyticsObject = t; const ttq = (w.ttq ?? { push: (..._items: unknown[]) => 0 }) as TikTokQueue; w.ttq = ttq; ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie"]; ttq.setAndDefer = function (n: TikTokQueue, e: string) { n[e] = (...args: unknown[]) => { n.push([e, ...args]); }; }; for (let i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]); ttq.instance = function (t: string) { const e = ttq._i[t] || []; for (let n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]); return e; }; ttq.load = function (e: string) { const n = "https://analytics.tiktok.com/i18n/pixel/events.js"; ttq._i = ttq._i || {}; ttq._i[e] = []; ttq._i[e]._u = n; ttq._t = ttq._t || {}; ttq._t[e] = +new Date(); const s = d.createElement("script") as HTMLScriptElement; s.type = "text/javascript"; s.async = true; s.src = `${n}?sdkid=${e}&lib=${t}`; const a = d.getElementsByTagName("script")[0]; a.parentNode!.insertBefore(s, a); }; ttq.load(TIKTOK_ID); ttq.page(); })(window, document, "ttq"); }
  if (GA4_ID) { loadScript(`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`, "ga4-gtag"); window.dataLayer = window.dataLayer || []; const gtag = (...args: unknown[]) => { window.dataLayer!.push(args); }; window.gtag = gtag; gtag("js", new Date()); gtag("config", GA4_ID, { send_page_view: true }); }
}
export function pixelPageView(path?: string) { if (typeof window === "undefined") return; try { window.fbq?.("track", "PageView"); window.ttq?.page(); if (GA4_ID) window.gtag?.("event", "page_view", { page_path: path ?? window.location.pathname }); } catch {} }
interface PixelEventPayload { value?: number; currency?: string; content_ids?: string[]; content_name?: string; content_type?: string; contents?: Array<{ id: string; quantity: number; item_price?: number }>; num_items?: number; }
const META_MAP: Record<string, string> = { product_view: "ViewContent", add_to_cart: "AddToCart", checkout_start: "InitiateCheckout", purchase_success: "Purchase", identity_created: "Lead" };
const TIKTOK_MAP: Record<string, string> = { product_view: "ViewContent", add_to_cart: "AddToCart", checkout_start: "InitiateCheckout", purchase_success: "CompletePayment", identity_created: "SubmitForm" };
const GA4_MAP: Record<string, string> = { product_view: "view_item", add_to_cart: "add_to_cart", checkout_start: "begin_checkout", purchase_success: "purchase", identity_created: "generate_lead" };
export function pixelEvent(event: string, payload: PixelEventPayload = {}) { if (typeof window === "undefined") return; try { const meta = META_MAP[event]; if (meta) window.fbq?.("track", meta, payload); const tt = TIKTOK_MAP[event]; if (tt) window.ttq?.track(tt, payload as Record<string, unknown>); const ga = GA4_MAP[event]; if (ga && window.gtag) window.gtag("event", ga, { value: payload.value, currency: payload.currency ?? "NGN", items: payload.contents?.map((c) => ({ item_id: c.id, quantity: c.quantity, price: c.item_price })) }); } catch {} }
