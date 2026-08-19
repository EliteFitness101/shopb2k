#!/usr/bin/env node

/**
 * ResoFit Content Intelligence OS
 *
 * Zero external dependencies. Uses the canonical product manifest only.
 * Produces a deterministic content opportunity queue for TikTok,
 * YouTube/Shorts and Google Business Profile.
 *
 * AI providers can consume the JSON output later; this script never invents
 * price, stock, delivery, discount or product claims.
 */

import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const manifestPath = path.join(ROOT, "scripts", "product-pages.json");
const outputDir = path.join(ROOT, "content-intelligence");
const outputPath = path.join(outputDir, "daily-opportunity-queue.json");

const { products, baseUrl, routePrefix } = JSON.parse(
  await fs.readFile(manifestPath, "utf8")
);

const today = new Date().toISOString().slice(0, 10);

const intentMap = [
  ["reset", "lifestyle reset"],
  ["life", "lifestyle reset"],
  ["nut", "nutrition"],
  ["meal", "nutrition"],
  ["glut", "glutes/body shaping"],
  ["butt", "glutes/body shaping"],
  ["muscle", "strength"],
  ["iron", "strength"],
  ["gym", "home/commercial gym"],
  ["home", "home gym"],
  ["rack", "home gym"],
  ["tower", "gym equipment"],
  ["trainer", "functional training"],
  ["row", "cardio/conditioning"],
  ["run", "running"],
  ["sport", "sports performance"],
  ["yoga", "mobility"],
  ["mob", "mobility"],
  ["recovery", "recovery"],
  ["skin", "recovery/self-care"],
  ["women", "women's wellness"],
  ["ladies", "women's wellness"],
  ["curvy", "women's wellness"],
  ["men", "men's wellness"],
  ["corp", "corporate wellness"],
  ["elite", "premium wellness"],
  ["bundle", "bundle/value"],
];

function titleFromHandle(handle) {
  return handle
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function inferIntent(product) {
  const haystack = `${product.sku} ${product.handle}`.toLowerCase();
  return (
    intentMap.find(([keyword]) => haystack.includes(keyword))?.[1] ||
    "personalized wellness"
  );
}

function opportunity(product, index) {
  const intent = inferIntent(product);
  const title = titleFromHandle(product.handle);
  const url = `${baseUrl}${routePrefix}${product.handle}`;

  const hooks = [
    `POV: you stop guessing and choose around your real ${intent} goal.`,
    `Before you buy ${title}, know what actually matters for your goal.`,
    `If your goal is ${intent}, start here before spending money.`,
    `Most people choose by product name. ResoFit starts with the person.`,
    `What would ResoFit recommend for your ${intent} goal?`,
    `The smarter way to approach ${intent}: match the solution to you.`,
    `One goal. Different budgets. Better-fit choices.`,
    `Don't browse for hours. Let your goal narrow the options.`,
    `Your next wellness step should fit your life—not somebody else's.`,
    `Give ResoFit 60 seconds and see what fits your goal.`,
  ];

  return {
    id: `${today}-${String(index + 1).padStart(3, "0")}`,
    date: today,
    sku: product.sku,
    handle: product.handle,
    intent,
    canonicalUrl: url,
    priority: index < 12 ? "high" : index < 36 ? "medium" : "explore",
    channels: {
      tiktok: {
        format: "POV / creator short",
        hook: hooks[index % hooks.length],
        cta: "Find what fits you → resofit.fit/me",
      },
      youtube: {
        format: "Short + searchable explainer",
        title: `${title}: what to consider for ${intent}`,
        cta: "Start your 60-second ResoFit assessment → resofit.fit/me",
      },
      googleBusiness: {
        format: "Helpful local update",
        headline: `${title} — a better-fit approach to ${intent}`,
        cta: "Discover your best-fit option → resofit.fit/me",
      },
    },
    captionFramework: [
      "Hook",
      "Customer problem or desired outcome",
      "One useful insight",
      "Proof/demo prompt without invented claims",
      "Customer-choice CTA",
    ],
    commercialIntent: "qualify first; recommend exact offer after assessment",
    sourceOfTruth: "Supabase canonical product registry",
    prohibitedClaims: [
      "invented price",
      "invented stock",
      "invented discount",
      "invented delivery promise",
      "medical guarantee",
    ],
  };
}

await fs.mkdir(outputDir, { recursive: true });

const queue = products.map(opportunity);

const report = {
  generatedAt: new Date().toISOString(),
  canonicalBaseUrl: baseUrl,
  assessmentRoute: `${baseUrl}/me`,
  totalProducts: products.length,
  totalOpportunities: queue.length,
  channels: ["tiktok", "youtube", "googleBusiness"],
  dailyCadence: {
    tiktok: 4,
    youtube: 4,
    googleBusiness: 4,
    totalUnits: 12,
    note: "4x4 means four content pillars with four daily publishing units across the three channels; do not blindly duplicate posts.",
  },
  queue,
};

await fs.writeFile(outputPath, JSON.stringify(report, null, 2));

console.log(`ResoFit Content Intelligence OS`);
console.log(`Products: ${products.length}`);
console.log(`Opportunities: ${queue.length}`);
console.log(`Output: ${path.relative(ROOT, outputPath)}`);
console.log(`Canonical CTA: ${baseUrl}/me`);
