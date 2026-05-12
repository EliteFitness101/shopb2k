export function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-12 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="font-display text-xl tracking-wider">
            RESO<span className="text-gold">FIT</span>
          </div>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Premium hardware for athletes who train with intent.
          </p>
        </div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          © {new Date().getFullYear()} ResoFit. Forged in Lagos.
        </p>
      </div>
    </footer>
  );
}
