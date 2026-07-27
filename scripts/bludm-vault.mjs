#!/usr/bin/env node

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const ignoredDirectories = new Set([".git", ".obsidian", "node_modules"]);
const encounterMarker = "bludm-encounter";

export function parseArgs(argv) {
  const [command = "help", ...values] = argv;
  const options = { command, files: [] };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) {
      throw new Error(`Unexpected argument: ${value}`);
    }
    const key = value.slice(2);
    if (key === "yes" || key === "json") {
      options[key] = true;
      continue;
    }
    const next = values[index + 1];
    if (!next || next.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }
    index += 1;
    if (key === "file") {
      options.files.push(next);
    } else {
      options[key] = next;
    }
  }
  return options;
}

export async function findVaultMarkdownFiles(vaultRoot, requestedFiles = []) {
  const root = path.resolve(vaultRoot);
  const targets = requestedFiles.length
    ? requestedFiles.map((file) => safeVaultPath(root, file))
    : [root];
  const found = [];
  for (const target of targets) {
    await collectMarkdownFiles(root, target, found);
  }
  return [...new Set(found)].sort();
}

export function safeVaultPath(vaultRoot, requestedPath) {
  const resolved = path.resolve(vaultRoot, requestedPath);
  const relative = path.relative(vaultRoot, resolved);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`Path is outside the Vault: ${requestedPath}`);
  }
  return resolved;
}

async function collectMarkdownFiles(root, target, found) {
  const entries = await readdir(target, { withFileTypes: true }).catch(async (error) => {
    if (error.code !== "ENOTDIR") throw error;
    if (isMarkdown(target)) found.push(target);
    return null;
  });
  if (!entries) return;
  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const child = path.join(target, entry.name);
    if (entry.isDirectory()) {
      await collectMarkdownFiles(root, child, found);
    } else if (entry.isFile() && isMarkdown(entry.name)) {
      safeVaultPath(root, child);
      found.push(child);
    }
  }
}

function isMarkdown(filename) {
  return [".md", ".markdown"].includes(path.extname(filename).toLowerCase());
}

async function request(baseURL, token, endpoint, init = {}) {
  const response = await fetch(new URL(endpoint, withTrailingSlash(baseURL)), {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = payload.error || `${response.status} ${response.statusText}`;
    const error = new Error(message);
    error.payload = payload;
    throw error;
  }
  return response;
}

async function loadVaultDocuments(options) {
  if (!options.vault) throw new Error("--vault is required");
  const root = path.resolve(options.vault);
  const files = await findVaultMarkdownFiles(root, options.files);
  const documents = [];
  for (const filename of files) {
    const markdown = await readFile(filename, "utf8");
    if (!markdown.includes(encounterMarker)) continue;
    documents.push({
      filename,
      markdown,
      sourcePath: path.relative(root, filename).split(path.sep).join("/"),
    });
  }
  if (documents.length === 0) {
    throw new Error("No Markdown files containing bludm-encounter blocks were found");
  }
  return documents;
}

async function previewDocuments(baseURL, token, campaignID, documents) {
  const previews = [];
  for (const document of documents) {
    try {
      const response = await request(
        baseURL,
        token,
        `/api/external/v1/campaigns/${encodeURIComponent(campaignID)}/encounters/markdown/preview`,
        {
          method: "POST",
          body: JSON.stringify({
            markdown: document.markdown,
            sourcePath: document.sourcePath,
          }),
        },
      );
      const payload = await response.json();
      previews.push({ document, preview: payload.preview });
    } catch (error) {
      previews.push({
        document,
        preview: {
          canImport: false,
          encounters: [],
          sourcePath: document.sourcePath,
          requestError: error.message,
        },
      });
    }
  }
  return previews;
}

async function importDocuments(baseURL, token, campaignID, previews) {
  const results = [];
  for (const item of previews) {
    const response = await request(
      baseURL,
      token,
      `/api/external/v1/campaigns/${encodeURIComponent(campaignID)}/encounters/markdown/import`,
      {
        method: "POST",
        body: JSON.stringify({
          markdown: item.document.markdown,
          sourcePath: item.document.sourcePath,
        }),
      },
    );
    results.push({ sourcePath: item.document.sourcePath, payload: await response.json() });
  }
  return results;
}

function printPreview(previews) {
  let ready = true;
  for (const { document, preview } of previews) {
    if (preview.requestError) {
      ready = false;
      console.error(`✗ ${document.sourcePath}: ${preview.requestError}`);
      continue;
    }
    const creates = preview.encounters.filter((item) => item.operation === "create").length;
    const updates = preview.encounters.filter((item) => item.operation === "update").length;
    const warnings = preview.encounters.flatMap((item) => item.warnings);
    const errors = preview.encounters.flatMap((item) => item.errors);
    if (!preview.canImport) ready = false;
    console.log(
      `${preview.canImport ? "✓" : "✗"} ${document.sourcePath}: ${creates} create, ${updates} update, ${warnings.length} warning, ${errors.length} error`,
    );
    for (const encounter of preview.encounters) {
      console.log(`  ${encounter.operation === "create" ? "+" : "~"} ${encounter.name}`);
      for (const warning of encounter.warnings) console.log(`    warning: ${warning}`);
      for (const error of encounter.errors) console.error(`    error: ${error}`);
    }
  }
  return ready;
}

async function run(options) {
  if (options.command === "help" || options.command === "--help") {
    console.log(helpText());
    return;
  }
  const baseURL = options.url || process.env.BLUDM_URL || "http://localhost:3080";
  const token = options.token || process.env.BLUDM_TOKEN;
  if (!token) throw new Error("Set BLUDM_TOKEN or pass --token");

  if (options.command === "campaigns") {
    const response = await request(baseURL, token, "/api/external/v1/campaigns");
    const payload = await response.json();
    if (options.json) {
      console.log(JSON.stringify(payload, null, 2));
      return;
    }
    for (const campaign of payload.campaigns) {
      console.log(`${campaign.id}\t${campaign.name}`);
    }
    return;
  }

  if (options.command === "export") {
    if (!options.encounter) throw new Error("--encounter is required");
    const response = await request(
      baseURL,
      token,
      `/api/external/v1/encounters/${encodeURIComponent(options.encounter)}/markdown`,
      { headers: { Accept: "text/markdown" } },
    );
    process.stdout.write(await response.text());
    return;
  }

  if (!["preview", "import"].includes(options.command)) {
    throw new Error(`Unknown command: ${options.command}`);
  }
  if (!options.campaign) throw new Error("--campaign is required");
  const documents = await loadVaultDocuments(options);
  const previews = await previewDocuments(baseURL, token, options.campaign, documents);
  if (options.json && options.command === "preview") {
    console.log(
      JSON.stringify(
        previews.map(({ preview }) => preview),
        null,
        2,
      ),
    );
  } else if (!options.json) {
    printPreview(previews);
  }
  const ready = previews.every((item) => item.preview.canImport);
  if (!ready) {
    throw new Error("Import blocked: fix every preview error before retrying");
  }
  if (options.command === "preview") return;
  if (!options.yes) {
    throw new Error("Import is write-enabled; rerun with --yes after reviewing the preview");
  }
  const results = await importDocuments(baseURL, token, options.campaign, previews);
  if (options.json) {
    console.log(
      JSON.stringify(
        { previews: previews.map(({ preview }) => preview), imports: results },
        null,
        2,
      ),
    );
  } else {
    const count = results.reduce((sum, item) => sum + item.payload.import.encounters.length, 0);
    console.log(
      `Imported ${count} encounter${count === 1 ? "" : "s"} from ${results.length} file${results.length === 1 ? "" : "s"}.`,
    );
  }
}

function withTrailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}

function helpText() {
  return `bluDM Vault bridge (read-only on disk)

Usage:
  node scripts/bludm-vault.mjs campaigns [--url URL] [--json]
  node scripts/bludm-vault.mjs preview --campaign ID --vault PATH [--file NOTE.md]
  node scripts/bludm-vault.mjs import --campaign ID --vault PATH [--file NOTE.md] --yes
  node scripts/bludm-vault.mjs export --encounter ID

Environment:
  BLUDM_URL     bluDM web URL (default http://localhost:3080)
  BLUDM_TOKEN   revocable API token created in bluDM Settings

The bridge reads Markdown and sends encounter blocks to bluDM. It never changes Vault files.
Repeat --file to select multiple notes. Omit --file to scan the Vault recursively.`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run(parseArgs(process.argv.slice(2))).catch((error) => {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  });
}
