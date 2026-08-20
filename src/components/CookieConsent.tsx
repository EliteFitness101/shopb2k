import { useEffect, useState } from "react";

const CONSENT_KEY = "resofit:cookie-consent:v1";

type Consent = "accepted" | "rejected";

export function hasAnalyticsConsent() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(CONSENT_KEY) === "accepted";
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!localStorage.getItem(CONSENT_KEY));
  }, []);

  const save = (value: Consent) => {
    localStorage.setItem(CONSENT_KEY, value);
    setVisible(false);
    window.dispatchEvent(new CustomEvent("resofit:consent-changed", { detail: value }));
  };

  if (!visible) return null;

  return (
    <aside
      aria-label="Cookie and analytics preferences"
      className="fixed inset-x-0 bottom-0 z-[70] border-t border-gold/30 bg-black/95 p-4 shadow-2xl backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-foreground">Privacy & cookie choices</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            ResoFit uses essential storage to operate the site and, with your permission, analytics
            and advertising technologies to understand traffic and improve experiences. You can
            change your choice at any time from Cookie Preferences.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => save("rejected")}
            className="rounded-sm border border-border px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            Reject non-essential
          </button>
          <a
            href="/cookies"
            className="rounded-sm border border-border px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            Learn more
          </a>
          <button
            type="button"
            onClick={() => save("accepted")}
            className="rounded-sm bg-gold px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-gold-foreground hover:opacity-90"
          >
            Accept analytics
          </button>
        </div>
      </div>
    </aside>
  );
}

export function CookiePreferencesLink() {
  const reset = () => {
    localStorage.removeItem(CONSENT_KEY);
    window.dispatchEvent(new Event("resofit:consent-reset"));
    window.location.reload();
  };

  return (
    <button type="button" onClick={reset} className="hover:text-gold">
      Cookie Preferences
    </button>
  );
}
