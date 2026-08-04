# Repeated-roster encounter fixture

The roster preserves quantity separately while the bundle contains one stat block for the distinct
creature.

```bludm-encounter
version: 1
id: fixture-repeated-roster
name: Wolves at the Gate
status: planned
combatants:
  - creatureId: fixture-dire-wolf
    name: Dire Wolf
    side: enemy
    quantity: 3
```

## Dire Wolf ×3

```statblock
layout: Basic 5e Layout
name: Dire Wolf
source: SRD 2014
size: Large
type: beast
alignment: unaligned
ac: 14
hp: 37
hit_dice: 5d10+10
speed: 50 ft.
stats: [17, 15, 15, 3, 12, 7]
damage_vulnerabilities: ""
damage_resistances: ""
damage_immunities: ""
condition_immunities: ""
senses: Passive Perception 13
languages: ""
cr: "1"
traits:
  - name: Keen Hearing and Smell
    desc: The wolf has advantage on Wisdom (Perception) checks that rely on hearing or smell.
actions:
  - name: Bite
    desc: "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 10 (2d6 + 3) piercing damage."
```
