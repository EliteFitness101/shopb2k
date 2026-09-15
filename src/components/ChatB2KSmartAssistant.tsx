import { useEffect, useMemo, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, MessageCircle, Sparkles, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCartStore } from "@/stores/cartStore";

const TIP_KEY = "resofit-chatb2k-tip-dismissed-v1";
const VISIT_KEY = "resofit-returning-visitor-v1";

function routeIntent(pathname: string) {
  if (pathname.startsWith("/wellness")) return { action: "Find a wellness option", to: "/wellness" };
  if (pathname.startsWith("/shop") || pathname.startsWith("/product")) return { action: "Help me choose", to: "/me" };
  if (pathname.startsWith("/programs")) return { action: "Match me to a plan", to: "/me" };
  if (pathname.startsWith("/knowledge") || pathname.startsWith("/blog")) return { action: "Turn this into my next step", to: "/me" };
  return { action: "Start my personalized assessment", to: "/me" };
}

const isFormElement = (target: EventTarget | null) => target instanceof HTMLElement && target.matches("input,textarea,select,[contenteditable='true']");

export function ChatB2KSmartAssistant() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();
  const cartCount = useCartStore((s) => s.items.reduce((n, item) => n + item.quantity, 0));
  const [open, setOpen] = useState(false);
  const [tipVisible, setTipVisible] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [focusedForm, setFocusedForm] = useState(false);
  const [returning, setReturning] = useState(false);

  useEffect(() => {
    try {
      setReturning(localStorage.getItem(VISIT_KEY) === "1");
      localStorage.setItem(VISIT_KEY, "1");
      setTipVisible(localStorage.getItem(TIP_KEY) !== "1");
    } catch {
      // Storage may be unavailable; assistant remains functional.
    }
  }, []);

  useEffect(() => {
    const updateKeyboard = () => setKeyboardOpen(Boolean(window.visualViewport && window.visualViewport.height < window.innerHeight * 0.78));
    const handleFocusIn = (event: FocusEvent) => setFocusedForm(isFormElement(event.target));
    const handleFocusOut = () => window.setTimeout(() => setFocusedForm(isFormElement(document.activeElement)), 0);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", updateKeyboard);
    window.addEventListener("focusin", handleFocusIn);
    window.addEventListener("focusout", handleFocusOut);
    updateKeyboard();
    return () => {
      vv?.removeEventListener("resize", updateKeyboard);
      window.removeEventListener("focusin", handleFocusIn);
      window.removeEventListener("focusout", handleFocusOut);
    };
  }, []);

  const intent = useMemo(() => routeIntent(pathname), [pathname]);
  const checkoutContext = pathname.includes("/checkout") || pathname.includes("/payment") || pathname === "/cart";
  const suppressed = keyboardOpen || focusedForm || checkoutContext;
  const tipSuppressed = pathname === "/auth" || pathname.startsWith("/admin") || checkoutContext;

  useEffect(() => {
    if (suppressed) setOpen(false);
  }, [suppressed]);

  if (suppressed) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 pb-[max(1rem,env(safe-area-inset-bottom))]" aria-live="polite">
      <div className="mx-auto flex max-w-7xl items-end justify-end px-4 sm:px-6">
        <div className="pointer-events-auto relative right-24 sm:right-48 flex flex-col items-end gap-2">
          {tipVisible && !tipSuppressed && !open && (
            <div className="max-w-[19rem] rounded-2xl border border-gold/20 bg-black/80 p-3 text-xs shadow-2xl backdrop-blur-xl">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-gold" aria-hidden />
                <p className="leading-5 text-muted-foreground">Not sure where to start? ChatB2K™ can guide your next step without making you browse everything.</p>
                <button type="button" aria-label="Dismiss tip" onClick={() => { setTipVisible(false); try { localStorage.setItem(TIP_KEY, "1"); } catch { /* Storage may be unavailable. */ } }} className="ml-auto rounded-full p-1 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          )}

          {open && (
            <div role="dialog" aria-label="ChatB2K assistant" className="w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-gold/20 bg-background/95 shadow-2xl backdrop-blur-2xl">
              <div className="border-b border-border/60 bg-black/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 text-gold"><Sparkles className="h-5 w-5" aria-hidden /></div><div><p className="font-medium">ChatB2K™</p><p className="text-[11px] text-muted-foreground">Personalized wellness guidance</p></div></div>
                  <button type="button" aria-label="Close ChatB2K" onClick={() => setOpen(false)} className="rounded-full p-2 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="space-y-3 p-4">
                <p className="text-sm leading-6">{user ? "Welcome back. Let’s make the next step simple." : returning ? "Welcome back. Pick up where you left off." : "Tell me what you want to improve and I’ll help you find the right next step."}</p>
                <Link to={intent.to as never} onClick={() => setOpen(false)} className="flex min-h-11 items-center justify-between rounded-2xl border border-gold/30 bg-gold/10 px-4 text-sm font-medium text-foreground transition hover:bg-gold/15 focus-visible:outline-2 focus-visible:outline-gold motion-reduce:transition-none">
                  <span>{intent.action}</span><ArrowRight className="h-4 w-4 text-gold" aria-hidden />
                </Link>
                {cartCount > 0 && <p className="text-[11px] text-muted-foreground">Your cart has {cartCount} item{cartCount === 1 ? "" : "s"}. I’ll stay out of the checkout flow.</p>}
              </div>
            </div>
          )}

          <button type="button" aria-label={open ? "Close ChatB2K assistant" : "Open ChatB2K assistant"} aria-expanded={open} onClick={() => setOpen((v) => !v)} className="group flex h-12 items-center gap-2 rounded-full border border-gold/30 bg-black/80 px-4 text-xs font-semibold uppercase tracking-widest text-foreground shadow-xl backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-gold/60 focus-visible:outline-2 focus-visible:outline-gold motion-reduce:transition-none">
            <MessageCircle className="h-4 w-4 text-gold" aria-hidden /><span className="hidden sm:inline">ChatB2K™</span><span className="sm:hidden">Help</span>
          </button>
        </div>
      </div>
    </div>
  );
}
