import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { useCartSync } from "@/hooks/useCartSync";
import { WhatsAppFloat } from "@/components/WhatsAppFloat";
import { useEffect } from "react";
import { captureAttributionFromUrl } from "@/lib/attribution";
import { auditCatalog } from "@/lib/productIntelligence";
import { initPixels, pixelPageView } from "@/lib/pixels";
import { captureRsidFromUrl } from "@/platform/identity";
import { captureLanding } from "@/platform/attribution";
import { reportEnvironment } from "@/platform/env";
import { organizationJsonLd, websiteJsonLd } from "@/platform/seo";


import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ResoFit — Africa's Personalized Wellness Platform" },
      { name: "description", content: "Discover premium Services, Custom Equipment  Offers & Proprietary ChatB2K™ Ancestral Intelligence deployment for clarity strength, longevity & healthy living." },
      { name: "author", content: "ResoFit" },
      { property: "og:title", content: "ResoFit — Africa's Personalized Wellness Platform" },
      { property: "og:description", content: "Discover premium Services, Custom Equipment  Offers & Proprietary ChatB2K™ Ancestral Intelligence deployment for clarity strength, longevity & healthy living." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "ResoFit — Africa's Personalized Wellness Platform" },
      { name: "twitter:description", content: "Discover premium Services, Custom Equipment  Offers & Proprietary ChatB2K™ Ancestral Intelligence deployment for clarity strength, longevity & healthy living." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/bdcgAbwS2IeBihMh9SoqBMc7zVy1/social-images/social-1778548309673-resofit-hero-banner-neural-architekt.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/bdcgAbwS2IeBihMh9SoqBMc7zVy1/social-images/social-1778548309673-resofit-hero-banner-neural-architekt.webp" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(organizationJsonLd()),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(websiteJsonLd()),
      },
    ],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AppInner />
    </QueryClientProvider>
  );
}

function AppInner() {
  useCartSync();
  const router = useRouter();
  useEffect(() => {
    captureAttributionFromUrl();
    captureRsidFromUrl();
    captureLanding();
    reportEnvironment();
    initPixels();

    try {
      const raw = localStorage.getItem("resofit:imgPriority:v1");
      if (raw) {
        const parsed = JSON.parse(raw) as { products?: Record<string, unknown> };
        const ids = Object.keys(parsed.products ?? {});
        if (ids.length) auditCatalog(ids);
      }
    } catch {
      /* noop */
    }
  }, []);
  useEffect(() => {
    // Fire PageView on every client-side navigation.
    const unsub = router.subscribe("onResolved", () => {
      pixelPageView(window.location.pathname);
    });
    return () => unsub();
  }, [router]);
  return (
    <>
      <Outlet />
      <WhatsAppFloat />
      <Toaster position="top-center" />
    </>
  );
}
