import { Link } from "@tanstack/react-router";
import { CTA } from "@/lib/ctas";
import { CookiePreferencesLink } from "@/components/CookieConsent";

const COLUMNS = [
  {
    heading: "Wellness",
    links: [
      { to: "/programs", label: "Programs" },
      { to: "/me", label: "ChatB2K™ Assessment" },
      { to: "/knowledge", label: "Knowledge Hub" },
      { to: "/success-stories", label: "Success Stories" },
    ],
  },
  {
    heading: "Ecosystem",
    links: [
      { to: "/shop", label: "Shop" },
      { to: "/community/play", label: "Community" },
      { to: "/auth", label: "Member Login" },
      { to: "/me", label: "ChatB2K™" },
      { href: "https://forge.resofit.fit", label: "ResoForge" },
    ],
  },
  {
    heading: "Company",
    links: [
      { to: "/about", label: "About" },
      { to: "/contact", label: "Contact" },
      { to: "/privacy", label: "Privacy" },
      { to: "/terms", label: "Terms" },
      { to: "/cookies", label: "Cookies" },
      { to: "/compliance", label: "Compliance & Data Practices" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-black/40">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-4">
          <div>
            <div className="font-display text-2xl tracking-wider">
              RESO<span className="text-gold">FIT</span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              Africa's personalized wellness platform. Powered by ResoFlex™ and ChatB2K™.
            </p>
            <form className="mt-5 flex gap-2" onSubmit={(e) => e.preventDefault()}>
              <label htmlFor="footer-email" className="sr-only">
                Email
              </label>
              <input
                id="footer-email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                className="h-10 flex-1 border border-border bg-background px-3 text-sm focus:border-gold focus:outline-none"
              />
              <button
                type="submit"
                className="h-10 border border-gold px-4 text-[11px] font-semibold uppercase tracking-widest text-gold hover:bg-gold hover:text-gold-foreground"
              >
                Subscribe
              </button>
            </form>
          </div>
          {COLUMNS.map((c) => (
            <div key={c.heading}>
              <p className="text-xs uppercase tracking-[0.25em] text-gold">{c.heading}</p>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {c.links.map((l) => (
                  <li key={l.label}>
                    {"href" in l ? (
                      <a
                        href={l.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-foreground focus-visible:outline-2 focus-visible:outline-gold"
                      >
                        {l.label}
                      </a>
                    ) : (
                      <Link
                        to={l.to as never}
                        className="hover:text-foreground focus-visible:outline-2 focus-visible:outline-gold"
                      >
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 border-t border-border/60 pt-8">
          <div className="flex flex-col gap-4 text-xs uppercase tracking-widest text-muted-foreground md:flex-row md:items-center md:justify-between">
            <p>© {new Date().getFullYear()} ResoFit. Africa's Personalized Wellness Platform.</p>
            <div className="flex flex-wrap items-center gap-5">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gold"
              >
                Instagram
              </a>
              <a
                href="https://x.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gold"
              >
                X
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gold"
              >
                YouTube
              </a>
              <CookiePreferencesLink />
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[10px] uppercase tracking-widest text-muted-foreground/80">
            <span>Secure checkout · Paystack</span>
            <span>Analytics by consent</span>
            <span>Privacy controls available</span>
            <span>Member access protected</span>
          </div>
        </div>
        <p className="sr-only">Primary CTA: {CTA.primary}</p>
      </div>
    </footer>
  );
}
