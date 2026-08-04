#!/usr/bin/env node

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const ignoredDirectories = new Set([".git", ".obsidian", "node_modules"]);
const contentMarkers = ["bludm-encounter", "bludm-npc", "bludm-dungeon"];

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
    const kinds = contentMarkers.filter((marker) => markdown.includes(marker));
    if (kinds.length === 0) continue;
    const sourcePath = path.relative(root, filename).split(path.sep).join("/");
    documents.push({
      filename,
      markdown,
      sourcePath,
      kinds,
      assets: await loadReferencedAssets(root, filename, markdown),
    });
  }
  if (documents.length === 0) {
    throw new Error("No Markdown files containing bluDM content blocks were found");
  }
  return documents;
}

async function previewDocuments(baseURL, token, campaignID, documents) {
  const previews = [];
  for (const document of documents) {
    try {
      const [encounter, world] = await Promise.all([
        document.kinds.includes("bludm-encounter")
          ? requestJSON(
              baseURL,
              token,
              `/api/external/v1/campaigns/${encodeURIComponent(campaignID)}/encounters/markdown/preview`,
              markdownRequest(document),
            )
          : null,
        document.kinds.some((kind) => kind === "bludm-npc" || kind === "bludm-dungeon")
          ? requestJSON(
              baseURL,
              token,
              `/api/external/v1/campaigns/${encodeURIComponent(campaignID)}/content/markdown/preview`,
              markdownRequest(document),
            )
          : null,
      ]);
      previews.push({
        document,
        preview: {
          sourcePath: document.sourcePath,
          canImport:
            (!encounter || encounter.preview.canImport) && (!world || world.preview.canImport),
          encounter: encounter?.preview,
          world: world?.preview,
        },
      });
    } catch (error) {
      previews.push({
        document,
        preview: {
          canImport: false,
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
    const [encounter, world] = await Promise.all([
      item.preview.encounter
        ? requestJSON(
            baseURL,
            token,
            `/api/external/v1/campaigns/${encodeURIComponent(campaignID)}/encounters/markdown/import`,
            markdownRequest(item.document),
          )
        : null,
      item.preview.world
        ? requestJSON(
            baseURL,
            token,
            `/api/external/v1/campaigns/${encodeURIComponent(campaignID)}/content/markdown/import`,
            markdownRequest(item.document),
          )
        : null,
    ]);
    results.push({ sourcePath: item.document.sourcePath, encounter, world });
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
    const changes = [
      ...(preview.encounter?.encounters ?? []),
      ...(preview.world?.npcs ?? []),
      ...(preview.world?.dungeons ?? []),
    ];
    const creates = changes.filter((item) => item.operation === "create").length;
    const updates = changes.filter((item) => item.operation === "update").length;
    const warnings = changes.flatMap((item) => item.warnings);
    const errors = changes.flatMap((item) => item.errors);
    if (!preview.canImport) ready = false;
    console.log(
      `${preview.canImport ? "✓" : "✗"} ${document.sourcePath}: ${creates} create, ${updates} update, ${warnings.length} warning, ${errors.length} error`,
    );
    for (const change of changes) {
      console.log(`  ${change.operation === "create" ? "+" : "~"} ${change.name}`);
      for (const warning of change.warnings) console.log(`    warning: ${warning}`);
      for (const error of change.errors) console.error(`    error: ${error}`);
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
    const counts = results.reduce(
      (total, item) => ({
        encounters: total.encounters + (item.encounter?.import.encounters.length ?? 0),
        npcs: total.npcs + (item.world?.import.npcs.length ?? 0),
        dungeons: total.dungeons + (item.world?.import.dungeons.length ?? 0),
      }),
      { encounters: 0, npcs: 0, dungeons: 0 },
    );
    console.log(
      `Imported ${counts.encounters} encounter${counts.encounters === 1 ? "" : "s"}, ${counts.npcs} NPC${counts.npcs === 1 ? "" : "s"}, and ${counts.dungeons} dungeon${counts.dungeons === 1 ? "" : "s"} from ${results.length} file${results.length === 1 ? "" : "s"}.`,
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

The bridge reads Markdown plus referenced NPC/map images and sends fenced bluDM content blocks
to bluDM. It never changes Vault files.
Repeat --file to select multiple notes. Omit --file to scan the Vault recursively.`;
}

async function requestJSON(baseURL, token, endpoint, payload) {
  const response = await request(baseURL, token, endpoint, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.json();
}

function markdownRequest(document) {
  return {
    markdown: document.markdown,
    sourcePath: document.sourcePath,
    assets: document.assets,
  };
}

export async function loadReferencedAssets(vaultRoot, markdownFile, markdown) {
  const references = markdownAssetReferences(markdown);
  const assets = [];
  for (const reference of references) {
    if (/^https?:\/\//i.test(reference)) continue;
    const fromNote = safeVaultPath(vaultRoot, path.resolve(path.dirname(markdownFile), reference));
    let filename = fromNote;
    let data;
    try {
      data = await readFile(filename);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      filename = safeVaultPath(vaultRoot, reference);
      data = await readFile(filename);
    }
    if (data.length === 0 || data.length > 5 * 1024 * 1024) {
      throw new Error(`Referenced image must be between 1 byte and 5 MB: ${reference}`);
    }
    const contentType = imageContentType(filename);
    if (!contentType) throw new Error(`Referenced asset is not a supported image: ${reference}`);
    assets.push({
      path: path.relative(vaultRoot, filename).split(path.sep).join("/"),
      filename: path.basename(filename),
      contentType,
      dataBase64: data.toString("base64"),
    });
  }
  return assets;
}

export function markdownAssetReferences(markdown) {
  const references = new Set();
  let active = false;
  for (const line of markdown.replaceAll("\r\n", "\n").split("\n")) {
    const trimmed = line.trim();
    if (/^(```|~~~)bludm-(npc|dungeon)$/i.test(trimmed)) {
      active = true;
      continue;
    }
    if (active && /^(```|~~~)$/.test(trimmed)) {
      active = false;
      continue;
    }
    if (!active) continue;
    const match = trimmed.match(/^(?:avatar|image):\s*(.+)$/i);
    if (!match) continue;
    const value = match[1].trim().replace(/^['"]|['"]$/g, "");
    if (value) references.add(value);
  }
  return [...references];
}

function imageContentType(filename) {
  switch (path.extname(filename).toLowerCase()) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    default:
      return "";
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run(parseArgs(process.argv.slice(2))).catch((error) => {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  });
}
