import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  findVaultMarkdownFiles,
  loadReferencedAssets,
  markdownAssetReferences,
  parseArgs,
  safeVaultPath,
} from "./bludm-vault.mjs";

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

test("markdownAssetReferences only reads NPC and dungeon image fields", () => {
  const markdown = [
    "image: prose-map.png",
    "```bludm-npc",
    "avatar: ../Assets/keeper.png",
    "```",
    "```bludm-encounter",
    "image: ignored.png",
    "```",
    "```bludm-dungeon",
    "  image: Maps/keep.webp",
    "```",
  ].join("\n");

  assert.deepEqual(markdownAssetReferences(markdown), ["../Assets/keeper.png", "Maps/keep.webp"]);
});

test("loadReferencedAssets resolves note-relative images without changing the Vault", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "bludm-vault-assets-"));
  const notes = path.join(root, "Locations");
  const assets = path.join(root, "Assets");
  await mkdir(notes);
  await mkdir(assets);
  const note = path.join(notes, "Keep.md");
  const image = path.join(assets, "keeper.png");
  await writeFile(note, "# Keep");
  await writeFile(image, Buffer.from("89504e470d0a1a0a", "hex"));

  const loaded = await loadReferencedAssets(
    root,
    note,
    "```bludm-npc\navatar: ../Assets/keeper.png\n```",
  );

  assert.deepEqual(loaded, [
    {
      path: "Assets/keeper.png",
      filename: "keeper.png",
      contentType: "image/png",
      dataBase64: "iVBORw0KGgo=",
    },
  ]);
});
