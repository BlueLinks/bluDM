#!/usr/bin/env python3
"""Extract SRD 5.2.1 creature stat blocks from the official SRD PDF.

The PDF is two-column text. This parser intentionally captures stable combat
fields plus the raw stat-block text so the app can browse and run encounters
while future passes improve action automation.

Usage:
  python3 scripts/build-standard-creatures-521.py tmp/SRD_CC_v5.2.1.pdf > /tmp/srd521.json
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any

import pdfplumber

TYPE_RE = re.compile(r"^(Tiny|Small|Medium|Medium or Small|Large|Huge|Gargantuan)\s+(.+?),\s+(.+)$")
FIELD_RE = re.compile(
    r"^(AC|HP|Speed|Skills|Vulnerabilities|Resistances|Immunities|Gear|Senses|Languages|CR)\b",
)
SECTION_RE = re.compile(r"^(Traits|Actions|Bonus Actions|Reactions|Legendary Actions|Mythic Actions)$")
ABILITY_RE = re.compile(r"\b(Str|Dex|Con|Int|WIS|Cha)\s+(\d+)\s+([+−-]\d+)\s+([+−-]\d+)")
DAMAGE_RE = re.compile(r"(\d+)\s*\(([^)]+)\)\s+([A-Z][A-Za-z]+) damage")
CR_RE = re.compile(r"^CR\s+([^\s]+)\s+\(XP\s+([0-9,]+).*?PB\s+([+−-]\d+)\)")
DAMAGE_LEAD_RE = re.compile(
    r"^(Acid|Bludgeoning|Cold|Fire|Force|Lightning|Necrotic|Piercing|Poison|Psychic|Radiant|Slashing|Thunder) damage\b",
)
CONTINUATION_LEAD_RE = re.compile(r"^(Hit:|Failure:|Success:|Failure or Success:|Half damage\b)")

SOURCE = {
    "provider": "Wizards of the Coast",
    "apiVersion": "5.2.1",
    "sourceUrl": "https://www.dndbeyond.com/srd",
    "pdfUrl": "https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf",
}


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: build-standard-creatures-521.py <SRD_CC_v5.2.1.pdf>")
    pdf_path = Path(sys.argv[1])
    creatures = parse_creatures(pdf_path)
    json.dump(creatures, sys.stdout, indent=2, ensure_ascii=False)
    sys.stdout.write("\n")


def parse_creatures(pdf_path: Path) -> list[dict[str, Any]]:
    lines = extract_lines(pdf_path)
    starts = [index for index in range(len(lines) - 1) if is_creature_start(lines, index)]
    seeds = [to_seed(parse_block(lines[start : starts[pos + 1] if pos + 1 < len(starts) else len(lines)])) for pos, start in enumerate(starts)]
    return sorted(dedupe_by_slug(seeds), key=lambda item: item["name"])


def extract_lines(pdf_path: Path) -> list[str]:
    lines: list[str] = []
    with pdfplumber.open(pdf_path) as pdf:
        for page_number in range(258, 365):
            page = pdf.pages[page_number - 1]
            columns = [(0, 0, page.width / 2, page.height), (page.width / 2, 0, page.width, page.height)]
            for box in columns:
                text = page.crop(box).extract_text(x_tolerance=1, y_tolerance=3) or ""
                for raw_line in text.splitlines():
                    line = clean(raw_line)
                    if not line:
                        continue
                    if re.match(r"^\d+ System Reference Document 5\.2\.1$", line):
                        continue
                    if line in {"System Reference Document 5.2.1", "Monsters A -Z", "Monsters A –Z"}:
                        continue
                    lines.append(line)
    return lines


def is_creature_start(lines: list[str], index: int) -> bool:
    if index + 1 >= len(lines) or not TYPE_RE.match(lines[index + 1]):
        return False
    window = "\n".join(lines[index + 2 : index + 12])
    return bool(re.search(r"^AC\s+\d+", window, re.M) and re.search(r"^HP\s+\d+", window, re.M))


def parse_block(block: list[str]) -> dict[str, Any]:
    name = block[0]
    size, creature_type, subtype, alignment = parse_type(block[1])
    data: dict[str, Any] = {
        "name": name,
        "size": size,
        "creatureType": creature_type,
        "alignment": alignment,
        "armorClass": 10,
        "hitPoints": 1,
        "hitDice": "",
        "challengeRating": "",
        "xp": 0,
        "speed": {},
        "abilities": {},
        "saves": {},
        "skills": {},
        "vulnerabilities": [],
        "resistances": [],
        "immunities": [],
        "conditionImmunities": [],
        "senses": {},
        "languages": "",
        "proficiencyBonus": 0,
        "gear": "",
        "traits": [],
        "actions": [],
        "bonusActions": [],
        "reactions": [],
        "legendaryActions": [],
        "rawText": "\n".join(block),
    }
    if subtype:
        data["creatureSubtype"] = subtype

    section: str | None = None
    current: dict[str, Any] | None = None
    index = 2
    while index < len(block):
        line = block[index]
        if SECTION_RE.match(line):
            section = line
            current = None
            index += 1
            continue
        if line.startswith("AC "):
            if match := re.search(r"AC\s+(\d+)", line):
                data["armorClass"] = int(match.group(1))
        elif line.startswith("HP "):
            if match := re.search(r"HP\s+(\d+)(?:\s+\(([^)]+)\))?", line):
                data["hitPoints"] = int(match.group(1))
                data["hitDice"] = match.group(2) or ""
        elif line.startswith("Speed "):
            data["speed"] = parse_speed(line[6:])
        elif ABILITY_RE.search(line):
            for ability, score, _modifier, save in ABILITY_RE.findall(line):
                key = {"Str": "str", "Dex": "dex", "Con": "con", "Int": "int", "WIS": "wis", "Cha": "cha"}[ability]
                data["abilities"][key] = int(score)
                data["saves"][key] = signed_int(save)
        elif line.startswith("Skills "):
            data["skills"].update(parse_skills(line[7:]))
        elif line.startswith(("Vulnerabilities ", "Resistances ", "Immunities ")):
            text, index = collect_field(block, index)
            label, values = text.split(" ", 1)
            if label == "Vulnerabilities":
                data["vulnerabilities"] = split_list(values)
            elif label == "Resistances":
                data["resistances"] = split_list(values)
            elif label == "Immunities":
                data["immunities"], data["conditionImmunities"] = split_immunities(values)
            continue
        elif line.startswith("Gear "):
            text, index = collect_field(block, index)
            data["gear"] = text[5:]
            continue
        elif line.startswith("Senses "):
            text, index = collect_field(block, index)
            data["senses"] = parse_senses(text[7:])
            continue
        elif line.startswith("Languages "):
            text, index = collect_field(block, index)
            data["languages"] = text[10:]
            continue
        elif line.startswith("CR "):
            if match := CR_RE.match(line):
                data["challengeRating"] = match.group(1)
                data["xp"] = int(match.group(2).replace(",", ""))
                data["proficiencyBonus"] = signed_int(match.group(3))
        elif section in {"Traits", "Actions", "Bonus Actions", "Reactions", "Legendary Actions"}:
            target = {
                "Traits": "traits",
                "Actions": "actions",
                "Bonus Actions": "bonusActions",
                "Reactions": "reactions",
                "Legendary Actions": "legendaryActions",
            }[section]
            if is_named_feature_line(line):
                name_part, description = line.split(".", 1)
                current = {
                    "name": name_part.strip(),
                    "description": description.strip(),
                    "damage": parse_damage(line),
                }
                data[target].append(current)
            elif current:
                current["description"] = clean(current["description"] + " " + line)
                current["damage"] = parse_damage(current["description"])
        index += 1
    return data


def parse_type(line: str) -> tuple[str, str, str, str]:
    match = TYPE_RE.match(line)
    if not match:
        raise ValueError(f"invalid type line: {line}")
    size, rest, alignment = match.groups()
    subtype = ""
    if subtype_match := re.match(r"(.+?)\s+\(([^)]+)\)$", rest):
        creature_type, subtype = subtype_match.groups()
    else:
        creature_type = rest
    return size, creature_type, subtype, alignment


def parse_speed(text: str) -> dict[str, str]:
    speeds: dict[str, str] = {}
    for index, part in enumerate(text.split(",")):
        if match := re.search(r"(?:(Walk|Fly|Swim|Burrow|Climb)\s+)?(\d+)\s*ft\.?(?:\s*\(([^)]*)\))?", part, re.I):
            key = (match.group(1) or ("walk" if index == 0 else "speed")).lower()
            speeds[key] = f"{match.group(2)} ft." + (f" ({match.group(3)})" if match.group(3) else "")
    return speeds


def parse_skills(text: str) -> dict[str, int]:
    skills: dict[str, int] = {}
    for part in text.split(","):
        if match := re.match(r"\s*([A-Za-z ]+)\s+([+−-]\d+)", part):
            skills[match.group(1).strip().lower().replace(" ", "")] = signed_int(match.group(2))
    return skills


def parse_senses(text: str) -> dict[str, Any]:
    senses: dict[str, Any] = {}
    for part in text.split(";"):
        for chunk in part.split(","):
            chunk = clean(chunk)
            if match := re.match(r"([A-Za-z ]+)\s+(\d+)\s*ft\.?", chunk):
                senses[match.group(1).strip()] = f"{match.group(2)} ft."
            elif chunk.startswith("Passive Perception"):
                if perception_match := re.search(r"(\d+)", chunk):
                    senses["passivePerception"] = int(perception_match.group(1))
    return senses


def collect_field(block: list[str], start: int) -> tuple[str, int]:
    values: list[str] = []
    index = start
    while index < len(block):
        line = block[index]
        if index > start and (FIELD_RE.match(line) or SECTION_RE.match(line) or ABILITY_RE.search(line)):
            break
        values.append(line)
        index += 1
    return clean(" ".join(values)), index


def is_named_feature_line(line: str) -> bool:
    if DAMAGE_LEAD_RE.match(line) or CONTINUATION_LEAD_RE.match(line):
        return False
    return bool(re.match(r"^[A-Z][^.]{1,80}\.", line))


def split_list(text: str) -> list[str]:
    return [clean(part) for part in text.replace(";", ",").split(",") if clean(part)]


def split_immunities(text: str) -> tuple[list[str], list[str]]:
    parts = text.split(";")
    damage = split_list(parts[0]) if parts else []
    conditions = split_list(";".join(parts[1:])) if len(parts) > 1 else []
    return damage, conditions


def parse_damage(text: str) -> list[dict[str, Any]]:
    return [
        {"damageType": damage_type, "damageDice": dice, "average": int(average)}
        for average, dice, damage_type in DAMAGE_RE.findall(text)
    ]


def to_seed(data: dict[str, Any]) -> dict[str, Any]:
    stat_block: dict[str, Any] = {
        "source": SOURCE,
        "abilities": data["abilities"],
        "abilitySaveProficiencies": data["saves"],
        "skills": data["skills"],
        "speed": data["speed"],
        "senses": data["senses"],
        "languages": data["languages"],
        "proficiencyBonus": data["proficiencyBonus"],
        "defenses": {
            "vulnerabilities": data["vulnerabilities"],
            "resistances": data["resistances"],
            "immunities": data["immunities"],
            "conditionImmunities": data["conditionImmunities"],
        },
        "gear": data["gear"],
        "specialAbilities": data["traits"],
        "actions": data["actions"],
        "bonusActions": data["bonusActions"],
        "reactions": data["reactions"],
        "legendaryActions": data["legendaryActions"],
        "defaultDisposition": "enemy",
        "rawText": data["rawText"],
    }
    if data.get("creatureSubtype"):
        stat_block["creatureSubtype"] = data["creatureSubtype"]
    return {
        "sourceKey": "srd-5-2-1",
        "slug": f"srd-5-2-1-{slugify(data['name'])}",
        "name": data["name"],
        "description": description_for(data),
        "size": data["size"],
        "creatureType": data["creatureType"],
        "alignment": data["alignment"],
        "armorClass": data["armorClass"],
        "hitPoints": data["hitPoints"],
        "hitDice": data["hitDice"],
        "challengeRating": data["challengeRating"],
        "xp": data["xp"],
        "avatarUrl": "",
        "sourceLabel": "SRD 5.2.1",
        "sourceUrl": "https://www.dndbeyond.com/srd",
        "licenseName": "Creative Commons Attribution 4.0 International",
        "statBlock": stat_block,
    }


def description_for(data: dict[str, Any]) -> str:
    creature_type = data["creatureType"]
    if data.get("creatureSubtype"):
        creature_type += f" ({data['creatureSubtype']})"
    parts = [f"{data['size']} {creature_type}."]
    if data["languages"]:
        parts.append(f"Languages: {data['languages']}.")
    if passive := data["senses"].get("passivePerception"):
        parts.append(f"Passive Perception {passive}.")
    return " ".join(parts)


def dedupe_by_slug(seeds: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    output: list[dict[str, Any]] = []
    for seed in seeds:
        if seed["slug"] in seen:
            continue
        seen.add(seed["slug"])
        output.append(seed)
    return output


def clean(value: str) -> str:
    return re.sub(r"\s+", " ", value.replace("−", "-")).strip()


def signed_int(value: str) -> int:
    return int(value.replace("−", "-").replace("+", ""))


def slugify(value: str) -> str:
    return re.sub(r"(^-|-$)", "", re.sub(r"[^a-z0-9]+", "-", value.lower()))


if __name__ == "__main__":
    main()
