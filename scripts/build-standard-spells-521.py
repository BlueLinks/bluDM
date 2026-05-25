#!/usr/bin/env python3
"""Extract SRD 5.2.1 spell records from the official SRD PDF.

The spell section in the PDF is visually rich and occasionally overlays
subheadings into body text. This parser captures reliable browse/search fields
and preserves extracted text for follow-up validation.

Usage:
  python3 scripts/build-standard-spells-521.py tmp/SRD_CC_v5.2.1.pdf > /tmp/srd521-spells.json
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any

import pdfplumber

LEVEL_RE = re.compile(
    r"^(?:(?P<school1>[A-Z][a-z]+) Cantrip|Level (?P<level>\d+) (?P<school2>[A-Z][a-z]+))(?: \((?P<classes>.*))?$",
)
FIELD_RE = re.compile(r"^(Casting Time|Range|Components|Duration):\s*(.*)$")
DAMAGE_RE = re.compile(r"(\d+d\d+(?:\s*[+−-]\s*\d+)?)\s+([A-Z][A-Za-z]+) damage")
DC_RE = re.compile(r"(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) saving throw", re.I)
NAME_RE = re.compile(r"^[A-Z][A-Za-z’' -]*(?:/[A-Z][A-Za-z’' -]*)?$")
STOP_WORDS = {"And", "At", "By", "For", "From", "In", "Of", "Or", "The", "To", "With"}
SOURCE = {
    "provider": "Wizards of the Coast",
    "apiVersion": "5.2.1",
    "sourceUrl": "https://www.dndbeyond.com/srd",
    "pdfUrl": "https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf",
}
TEXT_OVERRIDES = {
    "Acid Arrow": {
        "description": "A shimmering green arrow streaks toward a target within range and bursts in a spray of acid. Make a ranged spell attack against the target. On a hit, the target takes 4d4 Acid damage and 2d4 Acid damage at the end of its next turn. On a miss, the arrow splashes the target with acid for half as much of the initial damage only.",
        "higherLevel": "The damage, both initial and later, increases by 1d4 for each spell slot level above 2.",
    },
    "Acid Splash": {
        "description": "You create an acidic bubble at a point within range, where it explodes in a 5-foot-radius Sphere. Each creature in that Sphere must succeed on a Dexterity saving throw or take 1d6 Acid damage.",
        "higherLevel": "The damage increases by 1d6 when you reach levels 5 (2d6), 11 (3d6), and 17 (4d6).",
    },
    "Aid": {
        "description": "Choose up to three creatures within range. Each target's Hit Point maximum and current Hit Points increase by 5 for the duration.",
        "higherLevel": "Each target's Hit Points increase by 5 for each spell slot level above 2.",
    },
    "Animate Objects": {
        "description": "Objects animate at your command. Choose a number of nonmagical objects within range that aren't being worn or carried, aren't fixed to a surface, and aren't Gargantuan. The maximum number of objects is equal to your spellcasting ability modifier; for this number, a Medium or smaller target counts as one object, a Large target counts as two, and a Huge target counts as three. Each target animates, sprouts legs, and becomes a Construct that uses the Animated Object stat block; this creature is under your control until the spell ends or until it is reduced to 0 Hit Points. Each creature you make with this spell is an ally to you and your allies. In combat, it shares your Initiative count and takes its turn immediately after yours. Until the spell ends, you can take a Bonus Action to mentally command any creature you made with this spell if the creature is within 500 feet of you. If you control multiple creatures, you can command any of them at the same time, issuing the same command to each one. If you issue no commands, the creature takes the Dodge action and moves only to avoid harm. When the creature drops to 0 Hit Points, it reverts to its object form, and any remaining damage carries over to that form.",
        "higherLevel": "The creature's Slam damage increases by 1d4 (Medium or smaller), 1d6 (Large), or 1d12 (Huge) for each spell slot level above 5.",
    },
    "Contact Other Plane": {
        "description": "You mentally contact a demigod, the spirit of a long-dead sage, or some other knowledgeable entity from another plane. Contacting this otherworldly intelligence can break your mind. When you cast this spell, make a DC 15 Intelligence saving throw. On a successful save, you can ask the entity up to five questions. You must ask your questions before the spell ends. The GM answers each question with one word, such as \"yes,\" \"no,\" \"maybe,\" \"never,\" \"irrelevant,\" or \"unclear\" if the entity doesn't know the answer to the question. If a one-word answer would be misleading, the GM might instead offer a short phrase as an answer. On a failed save, you take 6d6 Psychic damage and have the Incapacitated condition until you finish a Long Rest. A Greater Restoration spell cast on you ends this effect.",
        "higherLevel": "",
    },
    "Heroism": {
        "description": "A willing creature you touch is imbued with bravery. Until the spell ends, the creature is immune to the Frightened condition and gains Temporary Hit Points equal to your spellcasting ability modifier at the start of each of its turns.",
        "higherLevel": "You can target one additional creature for each spell slot level above 1.",
    },
}


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: build-standard-spells-521.py <SRD_CC_v5.2.1.pdf>")
    spells = parse_spells(Path(sys.argv[1]))
    json.dump(spells, sys.stdout, indent=2, ensure_ascii=False)
    sys.stdout.write("\n")


def parse_spells(pdf_path: Path) -> list[dict[str, Any]]:
    with pdfplumber.open(pdf_path) as pdf:
        headings = spell_headings(pdf)
        spells: list[dict[str, Any]] = []
        for index, heading in enumerate(headings):
            next_heading = headings[index + 1] if index + 1 < len(headings) else None
            if spell := parse_spell(heading["name"], crop_text(pdf, heading, next_heading)):
                spells.append(spell)
    return sorted(dedupe_by_slug(spells), key=lambda spell: (spell["level"], spell["name"]))


def spell_headings(pdf: pdfplumber.PDF) -> list[dict[str, Any]]:
    headings: list[dict[str, Any]] = []
    for page_number in range(107, 176):
        page = pdf.pages[page_number - 1]
        columns = [(0, 0, page.width / 2, page.height), (page.width / 2, 0, page.width, page.height)]
        for column, box in enumerate(columns):
            words = page.crop(box).extract_words(extra_attrs=["size", "fontname"])
            candidates = [
                word
                for word in words
                if "GillSans-SemiBold" in word["fontname"]
                and (word["size"] >= 11.5 or "SC700" in word["fontname"])
            ]
            for group in group_heading_words(candidates):
                name = normalize_spell_name(group)
                if name == "Spell Descriptions" or not NAME_RE.match(name):
                    continue
                headings.append(
                    {
                        "page": page_number - 1,
                        "column": column,
                        "top": min(word["top"] for word in group) - 2,
                        "name": name,
                    },
                )
    return sorted(headings, key=lambda heading: (heading["page"], heading["column"], heading["top"]))


def group_heading_words(words: list[dict[str, Any]]) -> list[list[dict[str, Any]]]:
    groups: list[list[dict[str, Any]]] = []
    for word in words:
        if groups and abs(groups[-1][0]["top"] - word["top"]) < 7:
            groups[-1].append(word)
        else:
            groups.append([word])
    for group in groups:
        group.sort(key=lambda word: word["x0"])
    return groups


def normalize_spell_name(words: list[dict[str, Any]]) -> str:
    tokens = [word["text"] for word in words]
    merged: list[str] = []
    index = 0
    while index < len(tokens):
        if len(tokens[index]) == 1 and index + 1 < len(tokens):
            merged.append(tokens[index] + tokens[index + 1].lower())
            index += 2
        else:
            merged.append(tokens[index])
            index += 1
    words = " ".join(merged).title().replace("’S", "’s").replace("'S", "'s").split()
    return " ".join(word.lower() if 0 < index < len(words) - 1 and word in STOP_WORDS else word for index, word in enumerate(words))


def crop_text(pdf: pdfplumber.PDF, start: dict[str, Any], end: dict[str, Any] | None) -> str:
    parts: list[str] = []
    end_page = end["page"] + 1 if end else 175
    for page_index in range(start["page"], end_page):
        page = pdf.pages[page_index]
        columns = [(0, 0, page.width / 2, page.height), (page.width / 2, 0, page.width, page.height)]
        for column, box in enumerate(columns):
            if (page_index, column) < (start["page"], start["column"]):
                continue
            if end and (page_index, column) > (end["page"], end["column"]):
                continue
            y0 = start["top"] if page_index == start["page"] and column == start["column"] else 0
            y1 = end["top"] if end and page_index == end["page"] and column == end["column"] else page.height
            if y1 <= y0:
                continue
            text = page.crop((box[0], y0, box[2], y1)).extract_text(x_tolerance=1, y_tolerance=3) or ""
            parts.append(text)
    return "\n".join(parts)


def parse_spell(name: str, text: str) -> dict[str, Any] | None:
    lines = [clean(line) for line in text.splitlines() if clean(line)]
    level_index = next((index for index, line in enumerate(lines[:40]) if LEVEL_RE.match(line)), None)
    if level_index is None:
        return None
    level_line = lines[level_index]
    index = level_index + 1
    while index < len(lines) and not FIELD_RE.match(lines[index]) and ")" not in level_line:
        level_line += " " + lines[index]
        index += 1
    match = LEVEL_RE.match(level_line)
    if not match:
        return None
    level = 0 if match.group("school1") else int(match.group("level"))
    school = match.group("school1") or match.group("school2") or ""
    classes = parse_classes(level_line)
    fields = {"Casting Time": "", "Range": "", "Components": "", "Duration": ""}
    description: list[str] = []
    current_field: str | None = None

    while index < len(lines):
        line = lines[index]
        if field_match := FIELD_RE.match(line):
            current_field = field_match.group(1)
            fields[current_field] = field_match.group(2)
        elif current_field and current_field != "Duration" and not fields["Duration"]:
            fields[current_field] = clean(fields[current_field] + " " + line)
        elif current_field == "Duration" and not description and not looks_like_prose(line):
            fields[current_field] = clean(fields[current_field] + " " + line)
        else:
            current_field = None
            description.append(line)
        index += 1

    return to_seed(name, level, school, classes, fields, clean(" ".join(description)))


def to_seed(
    name: str,
    level: int,
    school: str,
    classes: list[str],
    fields: dict[str, str],
    description: str,
) -> dict[str, Any]:
    components = fields["Components"]
    text_override = TEXT_OVERRIDES.get(name, {})
    if text_override:
        description = text_override["description"]
    return {
        "sourceKey": "srd-5-2-1",
        "slug": f"srd-5-2-1-{slugify(name)}",
        "name": name,
        "level": level,
        "school": school,
        "castingTime": fields["Casting Time"],
        "range": fields["Range"],
        "components": {
            "verbal": has_component(components, "V"),
            "somatic": has_component(components, "S"),
            "material": material_component(components),
            "raw": components,
        },
        "duration": fields["Duration"],
        "ritual": "Ritual" in fields["Casting Time"],
        "concentration": fields["Duration"].startswith("Concentration"),
        "description": description,
        "higherLevel": text_override.get("higherLevel", higher_level_text(description)),
        "sourceNote": "SRD 5.2.1",
        "sourceLabel": "SRD 5.2.1",
        "sourceUrl": "https://www.dndbeyond.com/srd",
        "licenseName": "Creative Commons Attribution 4.0 International",
        "mechanics": {
            "source": SOURCE,
            "damage": parse_damage(description),
            "dc": parse_dc(description),
            "classes": classes,
            "rawText": description,
        },
    }


def parse_classes(level_line: str) -> list[str]:
    if match := re.search(r"\((.*?)\)", level_line):
        return [item.strip() for item in match.group(1).split(",") if item.strip()]
    return []


def looks_like_prose(line: str) -> bool:
    return bool(
        re.match(
            r"^(You|A|An|As|Choose|Target|Make|The|This|If|Until|When|For|Objects|Wish|One|Roll|Describe|Select|Create|Creatures|Each)\b",
            line,
        ),
    )


def has_component(components: str, component: str) -> bool:
    return bool(re.search(rf"(^|, ){component}(,| |$|\()", components))


def material_component(components: str) -> str:
    if match := re.search(r"M \((.*)\)", components):
        return match.group(1)
    return "Material component" if has_component(components, "M") else ""


def parse_damage(description: str) -> list[dict[str, str]]:
    return [{"damageDice": dice, "damageType": damage_type} for dice, damage_type in DAMAGE_RE.findall(description)]


def parse_dc(description: str) -> dict[str, str] | None:
    if match := DC_RE.search(description):
        return {"dcType": match.group(1).title()}
    return None


def higher_level_text(description: str) -> str:
    for marker in ["Using a Higher-Level Spell Slot.", "At Higher Levels."]:
        index = description.find(marker)
        if index >= 0:
            return description[index + len(marker) :].strip()
    return ""


def dedupe_by_slug(spells: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    output: list[dict[str, Any]] = []
    for spell in spells:
        if spell["slug"] in seen:
            continue
        seen.add(spell["slug"])
        output.append(spell)
    return output


def clean(value: str) -> str:
    return re.sub(r"\s+", " ", value.replace("−", "-")).strip()


def slugify(value: str) -> str:
    return re.sub(r"(^-|-$)", "", re.sub(r"[^a-z0-9]+", "-", value.lower()))


if __name__ == "__main__":
    main()
