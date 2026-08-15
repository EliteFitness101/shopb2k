import { Link } from "@tanstack/react-router";
import { CTA } from "@/lib/ctas";

const COLUMNS: Array<{ heading: string; links: Array<{ to: string; label: string; external?: boolean }> }> = [
  {
    heading: "Wellness",
    links: [
      { to: "/programs", label: "Programs" },
      { to: "/personalize", label: "ChatB2K™ Assessment" },
      { to: "/knowledge", label: "Knowledge Hub" },
      { to: "/success-stories", label: "Success Stories" },
    ],
  },
  {
    heading: "Shop",
    links: [
      { to: "/shop", label: "All Equipment" },
      { to: "/blog", label: "Journal" },
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
      { to: "/refund-policy", label: "Refunds" },
      { to: "/shipping-policy", label: "Shipping" },
      { to: "/accessibility", label: "Accessibility" },
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
            <form
              className="mt-5 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
              }}
            >
              <label htmlFor="footer-email" className="sr-only">
                Email
              </label>
              <input
                id="footer-email"
                type="email"
                placeholder="you@example.com"
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
                  <li key={l.to}>
                    <Link
                      to={l.to as any}
                      className="hover:text-foreground focus-visible:outline-2 focus-visible:outline-gold"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-border/60 pt-8 text-xs uppercase tracking-widest text-muted-foreground md:flex-row md:items-center">
          <p>© {new Date().getFullYear()} ResoFit. Africa's Personalized Wellness Platform.</p>
          <div className="flex items-center gap-5">
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:text-gold">
              Instagram
            </a>
            <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="hover:text-gold">
              X
            </a>
            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="hover:text-gold">
              YouTube
            </a>
          </div>
        </div>
        <p className="sr-only">Primary CTA: {CTA.primary}</p>
      </div>
    </footer>
  );
}
