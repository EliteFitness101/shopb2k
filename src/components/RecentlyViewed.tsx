import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

const KEY = "resofit:recentlyViewed:v1";
const MAX = 8;

export interface RecentItem {
  handle: string;
  title: string;
  image?: string;
  price?: string;
}

export function recordRecentlyViewed(item: RecentItem) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(KEY);
    const list: RecentItem[] = raw ? JSON.parse(raw) : [];
    const next = [item, ...list.filter((i) => i.handle !== item.handle)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* noop */
  }
}

export function RecentlyViewed({ excludeHandle }: { excludeHandle?: string }) {
  const [items, setItems] = useState<RecentItem[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* noop */
    }
  }, []);

  const filtered = items.filter((i) => i.handle !== excludeHandle).slice(0, 4);
  if (filtered.length < 2) return null;

  return (
    <section className="mt-12 border-t border-border/60 pt-8">
      <h2 className="mb-6 text-xs uppercase tracking-widest text-muted-foreground">
        Recently viewed
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {filtered.map((it) => (
          <Link
            key={it.handle}
            to="/product/$handle"
            params={{ handle: it.handle }}
            className="group block"
          >
            {it.image && (
              <div className="aspect-square overflow-hidden border border-border/60">
                <img
                  src={it.image}
                  alt={it.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              </div>
            )}
            <p className="mt-2 line-clamp-2 text-xs text-foreground group-hover:text-gold">
              {it.title}
            </p>
            {it.price && <p className="mt-1 text-xs text-gold">{it.price}</p>}
          </Link>
        ))}
      </div>
    </section>
  );
}
