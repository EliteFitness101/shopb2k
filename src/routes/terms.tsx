import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/terms")({ component: TermsPage });

function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-16">
        <p className="text-xs uppercase tracking-[0.3em] text-gold">Legal</p>
        <h1 className="mt-3 font-display text-4xl">Terms of Use</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          These operational terms describe the general rules for using ResoFit web experiences,
          assessments, content and commerce services.
        </p>
        <div className="mt-10 space-y-8 text-sm leading-7 text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground">Using ResoFit</h2>
            <p className="mt-2">
              Use the services lawfully and provide information that is accurate enough for the
              requested service. Do not attempt to interfere with security, access another person's
              account, abuse automated systems, or misuse assessment and commerce functionality.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">Wellness information</h2>
            <p className="mt-2">
              ChatB2K and ResoFit wellness experiences provide informational and personalized
              guidance. They are not a substitute for professional medical diagnosis, emergency care
              or treatment by a qualified clinician.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">Commerce and payment</h2>
            <p className="mt-2">
              Product and program purchases are subject to the applicable offer, checkout terms,
              availability and fulfillment information shown at the time of purchase. Payment
              processing is handled through the payment provider presented at checkout.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">Accounts and member access</h2>
            <p className="mt-2">
              Members are responsible for protecting their credentials and for activity performed
              through their account. Access may be limited or suspended where necessary for
              security, abuse prevention or service integrity.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">Intellectual property</h2>
            <p className="mt-2">
              ResoFit names, marks, content, software and proprietary experiences remain protected
              by applicable intellectual-property rights unless otherwise stated.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">Legal review</h2>
            <p className="mt-2">
              This is an operational web terms foundation and should be reviewed for the specific
              jurisdictions, corporate entities, consumer rules, refund terms and dispute provisions
              that apply before being treated as the definitive legal agreement.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
