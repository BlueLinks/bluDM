# Custom section fixture

This note exercises every bluDM-authored visual section supported by the profile.

```statblock
layout: Basic 5e Layout
name: Section Keeper
source: bluDM custom
size: Medium
type: construct
alignment: unaligned
ac: 16
hp: 68
hit_dice: 8d8+32
speed: 30 ft.
stats: [16, 12, 18, 14, 14, 10]
damage_vulnerabilities: ""
damage_resistances: ""
damage_immunities: poison
condition_immunities: poisoned
senses: Darkvision 60 ft., Passive Perception 12
languages: Common
cr: "5"
traits:
  - name: Typed Trait
    desc: Preserved as a trait.
actions:
  - name: Measured Strike
    desc: The keeper makes one melee attack.
bonus_actions:
  - name: Recalibrate
    desc: The keeper gains advantage on its next attack.
reactions:
  - name: Deflect
    desc: The keeper adds 2 to its AC against one attack.
legendary_description: The keeper can take two legendary actions.
legendary_actions:
  - name: Observe
    desc: The keeper makes a Wisdom (Perception) check.
mythic_description: When first reduced to 0 hit points, the keeper reassembles.
mythic_actions:
  - name: Fractured Advance
    desc: The keeper moves up to its speed without provoking opportunity attacks.
lair_actions:
  - name: Lock the Hall
    desc: Doors in the chamber lock until initiative count 20 on the next round.
regional_effects:
  - name: Bent Paths
    desc: Roads twist within one mile.
```
