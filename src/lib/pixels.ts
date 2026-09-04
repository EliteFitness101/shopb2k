// ResoFit production analytics loader — GA4, TikTok and Metricool.
// Vendor IDs are public measurement identifiers; secrets never belong here.
// Loading remains consent-gated by the root application.

const META_ID = import.meta.env.VITE_META_PIXEL_ID as string | undefined;
const TIKTOK_ID = (import.meta.env.VITE_TIKTOK_PIXEL_ID as string | undefined) || "D9MAQ0BC77U97D5Q2QJG";
const GA4_ID = (import.meta.env.VITE_GA4_ID as string | undefined) || (import.meta.env.VITE_GA4_MEASUREMENT_ID as string | undefined) || "G-QN8CRFZ5TK";
const METRICOOL_URL = "https://tracker.metricool.com/c3po.jpg?hash=c09fea6a141d18712f0ea923d611846";

let initialized = false;
let metricoolInitialized = false;

type MetaPixel = ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue: unknown[]; push?: MetaPixel; loaded?: boolean; version?: string; };
type TikTokQueue = { push: (...items: unknown[]) => number; methods: string[]; setAndDefer: (queue: TikTokQueue, method: string) => void; _i: Record<string, TikTokQueue>; _t: Record<string, number>; load: (id: string) => void; page: () => void; [key: string]: unknown; };
declare global { interface Window { fbq?: MetaPixel; _fbq?: MetaPixel; ttq?: TikTokQueue; TiktokAnalyticsObject?: string; dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void; } }

function loadScript(src: string, id: string) {
  if (document.getElementById(id)) return;
  const script = document.createElement("script");
  script.async = true;
  script.src = src;
  script.id = id;
  document.head.appendChild(script);
}

export function initMetricool() {
  if (metricoolInitialized || typeof window === "undefined") return;
  metricoolInitialized = true;
  const img = document.createElement("img");
  img.src = METRICOOL_URL;
  img.alt = "";
  img.width = 1;
  img.height = 1;
  img.setAttribute("aria-hidden", "true");
  img.style.position = "absolute";
  img.style.width = "1px";
  img.style.height = "1px";
  img.style.opacity = "0";
  img.style.pointerEvents = "none";
  document.body.appendChild(img);
}

export function initPixels() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  initMetricool();

  if (META_ID) {
    (function (f: Window, b: Document, e: string, v: string) {
      if (f.fbq) return;
      const n = ((...args: unknown[]) => {
        if (n.callMethod) n.callMethod(...args);
        else n.queue.push(args);
      }) as MetaPixel;
      f.fbq = n;
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = "2.0";
      n.queue = [];
      const script = b.createElement(e) as HTMLScriptElement;
      script.async = true;
      script.src = v;
      const first = b.getElementsByTagName(e)[0];
      first.parentNode!.insertBefore(script, first);
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    window.fbq?.("init", META_ID);
    window.fbq?.("track", "PageView");
  }

  if (TIKTOK_ID) {
    (function (w: Window, d: Document, t: string) {
      w.TiktokAnalyticsObject = t;
      const ttq = (w.ttq ?? { push: (..._items: unknown[]) => 0 }) as TikTokQueue;
      w.ttq = ttq;
      ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie"];
      ttq.setAndDefer = function (queue: TikTokQueue, method: string) {
        queue[method] = (...args: unknown[]) => queue.push([method, ...args]);
      };
      for (const method of ttq.methods) ttq.setAndDefer(ttq, method);
      ttq.instance = function (id: string) {
        const instance = ttq._i[id] || [];
        for (const method of ttq.methods) ttq.setAndDefer(instance, method);
        return instance;
      };
      ttq.load = function (id: string) {
        const src = "https://analytics.tiktok.com/i18n/pixel/events.js";
        ttq._i = ttq._i || {};
        ttq._i[id] = [];
        ttq._i[id]._u = src;
        ttq._t = ttq._t || {};
        ttq._t[id] = +new Date();
        const script = d.createElement("script") as HTMLScriptElement;
        script.type = "text/javascript";
        script.async = true;
        script.src = `${src}?sdkid=${id}&lib=${t}`;
        const first = d.getElementsByTagName("script")[0];
        first.parentNode!.insertBefore(script, first);
      };
      ttq.load(TIKTOK_ID);
      ttq.page();
    })(window, document, "ttq");
  }

  if (GA4_ID) {
    loadScript(`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`, "ga4-gtag");
    window.dataLayer = window.dataLayer || [];
    const gtag = (...args: unknown[]) => window.dataLayer!.push(args);
    window.gtag = gtag;
    gtag("js", new Date());
    gtag("config", GA4_ID, { send_page_view: true });
  }
}

export function pixelPageView(path?: string) {
  if (typeof window === "undefined") return;
  try {
    window.fbq?.("track", "PageView");
    window.ttq?.page();
    if (GA4_ID) window.gtag?.("event", "page_view", { page_path: path ?? window.location.pathname });
  } catch {
    void 0;
  }
}

interface PixelContent {
  content_id: string;
  content_name?: string;
  quantity: number;
  price?: number;
}

interface PixelEventPayload {
  value?: number;
  currency?: string;
  content_ids?: string[];
  content_name?: string;
  content_type?: string;
  contents?: PixelContent[];
  num_items?: number;
}

const META_MAP: Record<string, string> = {
  product_view: "ViewContent",
  product_click: "ViewContent",
  add_to_cart: "AddToCart",
  checkout_start: "InitiateCheckout",
  purchase_success: "Purchase",
  identity_started: "SubmitForm",
  identity_created: "Lead",
};

const TIKTOK_MAP: Record<string, string> = {
  product_view: "ViewContent",
  product_click: "ClickButton",
  add_to_cart: "AddToCart",
  checkout_start: "InitiateCheckout",
  purchase_success: "CompletePayment",
  identity_started: "SubmitForm",
  identity_created: "SubmitForm",
};

const GA4_MAP: Record<string, string> = {
  product_view: "view_item",
  add_to_cart: "add_to_cart",
  checkout_start: "begin_checkout",
  purchase_success: "purchase",
  identity_created: "generate_lead",
};

export function pixelEvent(event: string, payload: PixelEventPayload = {}) {
  if (typeof window === "undefined") return;
  try {
    const contentIds = payload.content_ids ?? [];
    const contents = payload.contents ?? contentIds.map((id) => ({
      content_id: id,
      quantity: payload.num_items ?? 1,
      ...(typeof payload.value === "number" && contentIds.length === 1
        ? { price: payload.value }
        : {}),
    }));

    const shared = {
      value: payload.value,
      currency: payload.currency ?? "NGN",
      content_type: payload.content_type ?? "product",
      content_ids: contentIds,
      contents,
      ...(payload.content_name ? { content_name: payload.content_name } : {}),
      ...(payload.num_items ? { num_items: payload.num_items } : {}),
    };

    const meta = META_MAP[event];
    if (meta) window.fbq?.("track", meta, shared);

    const tt = TIKTOK_MAP[event];
    if (tt) window.ttq?.track(tt, shared);

    const ga = GA4_MAP[event];
    if (ga && window.gtag) {
      window.gtag("event", ga, {
        value: payload.value,
        currency: payload.currency ?? "NGN",
        items: contents.map((content) => ({
          item_id: content.content_id,
          item_name: content.content_name,
          quantity: content.quantity,
          price: content.price,
        })),
      });
    }
  } catch {
    void 0;
  }
}
