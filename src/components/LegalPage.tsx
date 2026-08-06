import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import type { LegalDocument } from "@/platform/legal";

/** Shared presentation shell for every compliance page. */
export function LegalPage({ doc }: { doc: LegalDocument }) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-20">
        <p className="mb-4 text-xs uppercase tracking-[0.3em] text-gold">Legal</p>
        <h1 className="font-display text-4xl leading-tight md:text-6xl">{doc.title}</h1>
        <p className="mt-6 text-base text-muted-foreground">{doc.intro}</p>
        <p className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">
          Last updated{" "}
          <time dateTime={doc.updated}>
            {new Date(doc.updated).toLocaleDateString("en-GB", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>
        </p>

        <div className="mt-14 space-y-12">
          {doc.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="font-display text-2xl tracking-wide">{section.heading}</h2>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
                {section.body.map((line) => (
                  <li key={line} className="border-l border-border/60 pl-4">
                    {line}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
