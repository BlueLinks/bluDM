import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const frontendDirectory = path.join(repositoryRoot, "frontend");
const severityRank = { info: 0, low: 1, moderate: 2, high: 3, critical: 4 };
const minimumSeverity = severityRank.high;

const exceptions = new Map([
  [
    "https://github.com/advisories/GHSA-qwww-vcr4-c8h2",
    {
      expires: "2026-08-31",
      reason:
        "bluDM is a client-rendered Vite SPA and does not use React Router RSC mode or server actions.",
    },
  ],
]);

const result = spawnSync("npm", ["audit", "--json"], {
  cwd: frontendDirectory,
  encoding: "utf8",
});

if (result.error) {
  console.error(`Unable to run npm audit: ${result.error.message}`);
  process.exit(1);
}

let report;
try {
  report = JSON.parse(result.stdout);
} catch {
  console.error("Unable to parse npm audit output.");
  if (result.stderr) console.error(result.stderr.trim());
  process.exit(1);
}

const vulnerabilities = report.vulnerabilities ?? {};
const ignored = new Set();
const visited = new Map();

function advisoryIsExcepted(advisory) {
  const exception = exceptions.get(advisory.url);
  if (!exception) return false;
  const today = new Date().toISOString().slice(0, 10);
  if (today > exception.expires) return false;
  ignored.add(advisory.url);
  return true;
}

function vulnerabilityIsExcepted(name) {
  if (visited.has(name)) return visited.get(name);
  const vulnerability = vulnerabilities[name];
  if (!vulnerability) return false;

  visited.set(name, false);
  const excepted = vulnerability.via.every((cause) => {
    if (typeof cause === "string") return vulnerabilityIsExcepted(cause);
    const rank = severityRank[cause.severity] ?? minimumSeverity;
    return rank < minimumSeverity || advisoryIsExcepted(cause);
  });
  visited.set(name, excepted);
  return excepted;
}

const failures = Object.entries(vulnerabilities).filter(([name, vulnerability]) => {
  const rank = severityRank[vulnerability.severity] ?? minimumSeverity;
  return rank >= minimumSeverity && !vulnerabilityIsExcepted(name);
});

for (const url of ignored) {
  const exception = exceptions.get(url);
  console.warn(`Scoped audit exception: ${url}`);
  console.warn(`Reason: ${exception.reason}`);
  console.warn(`Expires: ${exception.expires}`);
}

if (failures.length > 0) {
  console.error("Frontend dependency audit failed:");
  for (const [name, vulnerability] of failures) {
    console.error(`- ${name}: ${vulnerability.severity}`);
  }
  process.exit(1);
}

console.log("Frontend dependency audit passed.");
