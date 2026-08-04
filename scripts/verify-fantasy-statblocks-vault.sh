#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
vault_path="${1:-/Users/bluelinks/Documents/DND Vault/bluDM MCP QA Vault}"
plugin_manifest="$vault_path/.obsidian/plugins/obsidian-5e-statblocks/manifest.json"

if [[ ! -f "$plugin_manifest" ]]; then
  echo "Fantasy Statblocks manifest not found: $plugin_manifest" >&2
  exit 1
fi

plugin_version="$(jq -r '.version // empty' "$plugin_manifest")"
if [[ "$plugin_version" != "4.10.3" ]]; then
  echo "Expected Fantasy Statblocks 4.10.3, found ${plugin_version:-unknown}" >&2
  exit 1
fi

python3 - "$repository_root/docs/mcp/fixtures" "$vault_path" <<'PY'
import pathlib
import re
import sys

fixture_root = pathlib.Path(sys.argv[1])
vault_root = pathlib.Path(sys.argv[2])
mapping = {
    "statblock-ordinary.md": "01 Ordinary creature.md",
    "statblock-spellcasting.md": "02 Spellcasting creature.md",
    "statblock-legendary.md": "03 Legendary creature.md",
    "statblock-repeated-roster.md": "04 Repeated roster bundle.md",
    "statblock-custom-sections.md": "05 Custom sections.md",
    "statblock-incomplete-partial.md": "06 Incomplete diagnostic.md",
    "statblock-snapshot.md": "07 Encounter snapshot.md",
}
pattern = re.compile(r"```statblock\n.*?\n```", re.DOTALL)

for fixture_name, vault_name in mapping.items():
    fixture = fixture_root / fixture_name
    note = vault_root / vault_name
    if not note.is_file():
        raise SystemExit(f"Missing Vault QA note: {note}")
    expected = pattern.findall(fixture.read_text())
    actual = pattern.findall(note.read_text())
    if expected != actual:
        raise SystemExit(f"Statblock fences differ: {fixture_name} -> {vault_name}")

print(f"Verified {len(mapping)} Vault notes against checked-in statblock fixtures.")
PY

echo "Fantasy Statblocks plugin: $plugin_version"
echo "Vault: $vault_path"
