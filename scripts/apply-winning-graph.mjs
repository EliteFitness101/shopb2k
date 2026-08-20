#!/usr/bin/env node

import fs from "node:fs/promises";

const queuePath = "content-intelligence/daily-opportunity-queue.json";
const graphPath = "revenue/winner-graph.json";
const outputPath = "content-intelligence/prioritized-opportunity-queue.json";

const queue = JSON.parse(await fs.readFile(queuePath, "utf8"));
let graph = { graph: [] };
try {
  graph = JSON.parse(await fs.readFile(graphPath, "utf8"));
} catch {
  // No performance history yet: preserve deterministic content order.
}

const byContent = new Map((graph.graph || []).map((row) => [row.contentId, row]));
const prioritized = queue.queue
  .map((item) => {
    const result = byContent.get(item.id);
    return {
      ...item,
      revenueScore: result?.score ?? null,
      optimizationDecision: result?.decision ?? "needs_data",
    };
  })
  .sort((a, b) => {
    const score = (b.revenueScore ?? -1) - (a.revenueScore ?? -1);
    return score || a.priority.localeCompare(b.priority);
  });

await fs.writeFile(
  outputPath,
  JSON.stringify(
    {
      ...queue,
      prioritizedAt: new Date().toISOString(),
      optimizationRule:
        "qualified revenue > checkout > recommendation acceptance > /me completion > clicks > engagement > impressions",
      queue: prioritized,
    },
    null,
    2,
  ),
);

console.log(`Prioritized opportunities: ${prioritized.length}`);
console.log(`Output: ${outputPath}`);
