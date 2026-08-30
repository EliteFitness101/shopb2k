#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const required = [
  "src/lib/wellness/findWellnessHubs.ts",
  "src/routes/wellness.tsx",
  "src/routes/wellness.states.cities.hubs.geo-locator.tsx",
];

const missing = [];
for (const relative of required) {
  try {
    await fs.access(path.join(ROOT, relative));
  } catch {
    missing.push(relative);
  }
}

if (missing.length) {
  console.error("Wellness production smoke failed. Missing:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

const locatorSource = await fs.readFile(
  path.join(ROOT, "src/lib/wellness/findWellnessHubs.ts"),
  "utf8",
);

for (const token of ["wellness-locator", "findWellnessHubs", "latitude", "longitude"]) {
  if (!locatorSource.includes(token)) {
    console.error(`Wellness production smoke failed: missing ${token}`);
    process.exit(1);
  }
}

console.log("Wellness production smoke: PASS");
console.log("Canonical /wellness route present");
console.log("Geo-Locator route present");
console.log("ChatB2K findWellnessHubs adapter present");
