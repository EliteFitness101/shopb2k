import { createFileRoute, Link } from "@tanstack/react-router";
import { MARTIAL_X_ASSETS } from "@/content/martialXAssets";
import { MARTIAL_X3_EXECUTIVE_PRODUCTS } from "@/config/martialXExecProducts";

export const Route = createFileRoute("/martial-x3")({ component: MartialX3Page });

function MartialX3Page() {
 const hero=MARTIAL_X_ASSETS.filter(a=>a.type==="hero");
 return <main className="min-h-dvh bg-black text-white">
  <section className="relative overflow-hidden min-h-[70vh]">
   <img src={hero[0].url} alt={hero[0].altSeed} className="absolute inset-0 h-full w-full object-cover opacity-70" />
   <div className="absolute inset-0 bg-black/55" />
   <div className="relative mx-auto flex min-h-[70vh] max-w-6xl flex-col justify-end px-6 py-16">
    <p className="text-xs uppercase tracking-[.35em] text-amber-300">ResoFit · Martial-X3</p>
    <h1 className="mt-3 max-w-4xl text-5xl font-semibold md:text-7xl">Executive Command Performance</h1>
    <p className="mt-5 max-w-2xl text-white/75">A premium Martial-X3 experience surface for executive performance, structured training and command-level wellness.</p>
    <div className="mt-8 flex flex-wrap gap-3"><Link to="/martial-x3/executive" className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black">Executive Suites</Link><Link to="/martial-x3/rsdn" className="rounded-full border border-white/30 px-6 py-3 text-sm">RSDN Project</Link></div>
   </div>
  </section>
  <section className="mx-auto max-w-6xl px-6 py-16"><h2 className="text-3xl font-semibold">Martial-X3 Executive Collection</h2><div className="mt-8 grid gap-6 md:grid-cols-3">{MARTIAL_X3_EXECUTIVE_PRODUCTS.slice(0,3).map(p=><article key={p.sku} className="overflow-hidden rounded-2xl border border-white/10 bg-white/5"><img src={p.image} alt={`${p.name} visual`} className="aspect-[4/3] w-full object-cover"/><div className="p-5"><p className="text-xs tracking-widest text-white/50">{p.sku}</p><h3 className="mt-2 text-xl">{p.name}</h3><p className="mt-3 text-amber-300">₦{p.priceNGN.toLocaleString()}</p></div></article>)}</div></section>
 </main>;
}
