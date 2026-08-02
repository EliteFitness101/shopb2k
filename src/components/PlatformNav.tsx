import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { PLATFORM_NAV, type NavLink, type NavSection } from "@/platform/platform.manifest";
import { isExternal } from "@/platform/routes";

const itemClass =
  "block text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-gold";

function NavItem({ link, onNavigate }: { link: NavLink; onNavigate?: () => void }) {
  const label = (
    <>
      {link.label}
      {link.badge ? <span className="ml-1 text-gold">{link.badge}</span> : null}
      {link.description ? (
        <span className="mt-0.5 block text-xs text-muted-foreground/70">{link.description}</span>
      ) : null}
    </>
  );
  if (link.external || isExternal(link.href)) {
    return (
      <a href={link.href} target="_blank" rel="noopener noreferrer" className={itemClass} onClick={onNavigate}>
        {label}
      </a>
    );
  }
  return (
    <Link to={link.href as any} className={itemClass} onClick={onNavigate}>
      {label}
    </Link>
  );
}

/** Desktop mega menu — one column per manifest section. */
export function PlatformMegaMenu() {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <nav aria-label="Platform" className="hidden items-center gap-6 text-[13px] lg:flex">
      {PLATFORM_NAV.map((section: NavSection) => (
        <div
          key={section.key}
          className="relative"
          onMouseEnter={() => setOpen(section.key)}
          onMouseLeave={() => setOpen(null)}
        >
          {section.href && !isExternal(section.href) ? (
            <Link
              to={section.href as any}
              activeOptions={section.href === "/" ? { exact: true } : undefined}
              className="text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-gold"
              activeProps={{ className: "text-foreground" }}
            >
              {section.label}
            </Link>
          ) : (
            <a
              href={section.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {section.label}
            </a>
          )}
          {open === section.key && section.links.length > 0 ? (
            <div className="absolute left-1/2 top-full z-50 w-64 -translate-x-1/2 pt-4">
              <div className="border border-border/60 bg-background/95 p-4 shadow-xl backdrop-blur-md">
                <p className="mb-3 text-[10px] uppercase tracking-[0.25em] text-gold">{section.label}</p>
                <div className="space-y-3">
                  {section.links.map((l) => (
                    <NavItem key={`${section.key}-${l.label}`} link={l} onNavigate={() => setOpen(null)} />
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ))}
    </nav>
  );
}

/** Mobile bottom sheet — same manifest model. */
export function PlatformMobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Open menu"
        className="inline-flex h-10 w-10 items-center justify-center border border-border/60 text-foreground lg:hidden"
      >
        <Menu className="h-5 w-5" aria-hidden />
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto border-border/60 bg-background">
        <SheetHeader>
          <SheetTitle className="font-display tracking-wider">
            RESO<span className="text-gold">FIT</span> Platform
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 grid grid-cols-2 gap-6 pb-8">
          {PLATFORM_NAV.map((section) => (
            <div key={section.key}>
              <p className="mb-2 text-[10px] uppercase tracking-[0.25em] text-gold">{section.label}</p>
              <div className="space-y-2">
                {section.links.map((l) => (
                  <NavItem key={`m-${section.key}-${l.label}`} link={l} onNavigate={() => setOpen(false)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
