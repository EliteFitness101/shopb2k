#!/usr/bin/env node

/**
 * ResoFit Revenue Intelligence OS
 *
 * First-party, dependency-free scoring layer. It consumes an optional
 * JSON/JSONL event export and compares content -> funnel -> revenue signals.
 * It never invents product economics. Missing economic inputs remain null.
 *
 * Usage:
 *   node scripts/revenue-intelligence.mjs
 *   RESOFIT_ATTRIBUTION_FILE=./revenue/attribution.json node scripts/revenue-intelligence.mjs
 */

import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const inputPath =
  process.env.RESOFIT_ATTRIBUTION_FILE || path.join(ROOT, "revenue", "attribution.json");
const outputDir = path.join(ROOT, "revenue");
const outputPath = path.join(outputDir, "winner-graph.json");

const empty = { events: [] };
let source = empty;
try {
  source = JSON.parse(await fs.readFile(inputPath, "utf8"));
} catch {
  // First run is intentionally valid with no external data.
}

const events = Array.isArray(source) ? source : source.events || [];
const byContent = new Map();

for (const event of events) {
  const contentId = event.content_id || event.contentId;
  if (!contentId) continue;
  const row = byContent.get(contentId) || {
    contentId,
    platform: event.platform || null,
    impressions: 0,
    clicks: 0,
    meStarts: 0,
    assessments: 0,
    recommendations: 0,
    checkouts: 0,
    paidOrders: 0,
    revenue: 0,
    contributionMargin: null,
  };

  const type = event.event || event.event_name;
  if (type === "impression") row.impressions += 1;
  if (type === "click") row.clicks += 1;
  if (type === "me_started") row.meStarts += 1;
  if (type === "assessment_completed") row.assessments += 1;
  if (type === "recommendation_generated" || type === "recommendation.created")
    row.recommendations += 1;
  if (type === "checkout_started" || type === "checkout.started") row.checkouts += 1;
  if (type === "payment_success" || type === "payment.succeeded" || type === "order.created")
    row.paidOrders += 1;
  if (Number.isFinite(Number(event.revenue))) row.revenue += Number(event.revenue);
  if (Number.isFinite(Number(event.contribution_margin))) {
    row.contributionMargin = (row.contributionMargin || 0) + Number(event.contribution_margin);
  }
  byContent.set(contentId, row);
}

function rate(a, b) {
  return b > 0 ? a / b : 0;
}

const ranked = [...byContent.values()]
  .map((row) => {
    const qualifiedRate = rate(row.paidOrders, Math.max(row.meStarts, 1));
    const clickRate = rate(row.clicks, Math.max(row.impressions, 1));
    const assessmentRate = rate(row.assessments, Math.max(row.meStarts, 1));
    const recommendationRate = rate(row.recommendations, Math.max(row.assessments, 1));
    const checkoutRate = rate(row.checkouts, Math.max(row.recommendations, 1));
    const revenueSignal = Math.min(row.revenue / 100000, 1);

    // Revenue dominates vanity metrics; engagement is only a supporting signal.
    const score =
      0.35 * Math.min(qualifiedRate, 1) +
      0.2 * Math.min(checkoutRate, 1) +
      0.15 * Math.min(recommendationRate, 1) +
      0.1 * Math.min(assessmentRate, 1) +
      0.05 * Math.min(clickRate, 1) +
      0.15 * revenueSignal;

    return {
      ...row,
      rates: { clickRate, assessmentRate, recommendationRate, checkoutRate, qualifiedRate },
      score: Number(score.toFixed(6)),
      decision:
        row.paidOrders > 0 && score >= 0.25
          ? "scale_candidate"
          : row.clicks > 0
            ? "test_or_fix"
            : "needs_data",
    };
  })
  .sort((a, b) => b.score - a.score);

const report = {
  generatedAt: new Date().toISOString(),
  source: inputPath,
  eventCount: events.length,
  contentCount: ranked.length,
  rankingRule:
    "qualified revenue > checkout > recommendation acceptance > /me completion > clicks > engagement > impressions",
  winners: ranked.filter((row) => row.decision === "scale_candidate").slice(0, 20),
  graph: ranked,
  guardrails: {
    noHardcodedOfferAmount: true,
    noAiAuthorityOverPriceStockPayment: true,
    contributionMarginRequiredForProfitability: true,
    bufferIsDistributionOnly: true,
  },
};

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(outputPath, JSON.stringify(report, null, 2));
console.log(`ResoFit Revenue Intelligence OS`);
console.log(`Events: ${events.length}`);
console.log(`Content scored: ${ranked.length}`);
console.log(`Winner graph: ${path.relative(ROOT, outputPath)}`);
