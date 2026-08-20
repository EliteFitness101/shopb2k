import { ShieldCheck, Truck, MessageCircle, BadgeCheck } from "lucide-react";

const items = [
  { Icon: ShieldCheck, label: "Secure Checkout", sub: "Paystack encrypted" },
  { Icon: Truck, label: "Nationwide Delivery", sub: "Ships across Nigeria" },
  { Icon: MessageCircle, label: "WhatsApp Support", sub: "CoachB2K replies fast" },
  { Icon: BadgeCheck, label: "Verified Results", sub: "Real customer wins" },
];

export function TrustBar() {
  return (
    <section aria-label="Trust signals" className="border-y border-border/60 bg-card/40">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px bg-border/40 md:grid-cols-4">
        {items.map(({ Icon, label, sub }) => (
          <div key={label} className="flex items-center gap-3 bg-background px-5 py-5">
            <Icon className="h-6 w-6 shrink-0 text-gold" aria-hidden />
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">{label}</p>
              <p className="truncate text-xs text-muted-foreground">{sub}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
