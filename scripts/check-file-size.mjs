import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

const defaults = [
  { pattern: /^frontend\/src\/.*\.(ts|tsx|scss)$/, max: 500 },
  { pattern: /^backend\/.*\.go$/, max: 500 }
];

// Legacy ratchet: these files are known debt. The limit is intentionally close
// to today's size so future work must shrink or split them instead of growing them.
const overrides = new Map([
  ["frontend/src/main.tsx", 140]
]);

const jsxBlockMax = 130;
const jsxBlockOverrides = new Map();

const ignoredDirs = new Set([".git", "dist", "node_modules"]);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        files.push(...await walk(path.join(dir, entry.name)));
      }
    } else {
      files.push(path.join(dir, entry.name));
    }
  }
  return files;
}

function relative(file) {
  return path.relative(root, file).replaceAll(path.sep, "/");
}

function maxLinesFor(file) {
  if (overrides.has(file)) return overrides.get(file);
  return defaults.find((rule) => rule.pattern.test(file))?.max;
}

const failures = [];
for (const absolute of await walk(root)) {
  const file = relative(absolute);
  const max = maxLinesFor(file);
  const text = await readFile(absolute, "utf8");
  const lines = text.split(/\r?\n/);
  if (max && lines.length > max) {
    failures.push(`${file}: ${lines.length} lines exceeds ${max}`);
  }
  if (file.startsWith("frontend/src/") && file.endsWith(".tsx")) {
    const jsxFailures = oversizedJSXBlocks(file, lines);
    failures.push(...jsxFailures);
  }
}

if (failures.length > 0) {
  console.error("File size limits failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("File size limits passed.");

function oversizedJSXBlocks(file, lines) {
  const max = jsxBlockOverrides.get(file) ?? jsxBlockMax;
  const failures = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].trim() !== "return (") continue;
    const end = findReturnBlockEnd(lines, index);
    if (!end) continue;
    const length = end - index + 1;
    if (length > max) {
      failures.push(`${file}:${index + 1}: JSX return block has ${length} lines, exceeds ${max}`);
    }
  }
  return failures;
}

function findReturnBlockEnd(lines, start) {
  let depth = 0;
  for (let index = start; index < lines.length; index += 1) {
    for (const char of lines[index]) {
      if (char === "(") depth += 1;
      if (char === ")") depth -= 1;
    }
    if (index > start && depth <= 0) return index;
  }
  return 0;
}
