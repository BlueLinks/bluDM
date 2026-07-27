import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { findVaultMarkdownFiles, parseArgs, safeVaultPath } from "./bludm-vault.mjs";

test("parseArgs keeps repeated file selections", () => {
  const options = parseArgs([
    "preview",
    "--campaign",
    "campaign-1",
    "--vault",
    "/vault",
    "--file",
    "one.md",
    "--file",
    "two.md",
  ]);
  assert.equal(options.command, "preview");
  assert.deepEqual(options.files, ["one.md", "two.md"]);
});

test("safeVaultPath rejects traversal outside the vault", () => {
  assert.throws(() => safeVaultPath("/tmp/vault", "../secret.md"), /outside the Vault/);
});

test("findVaultMarkdownFiles skips Obsidian settings", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "bludm-vault-test-"));
  await mkdir(path.join(root, ".obsidian"));
  await mkdir(path.join(root, "Locations"));
  await writeFile(path.join(root, ".obsidian", "plugin.md"), "ignored");
  await writeFile(path.join(root, "Locations", "Camp.md"), "# Camp");
  await writeFile(path.join(root, "Locations", "map.png"), "not markdown");

  const files = await findVaultMarkdownFiles(root);
  assert.deepEqual(files, [path.join(root, "Locations", "Camp.md")]);
});
