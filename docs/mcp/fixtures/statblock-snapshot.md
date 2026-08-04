# Encounter snapshot fixture

This note represents `creatureData=snapshot`: the visible block comes from the saved combatant
snapshot, while bluDM retains the complete snapshot in adjacent structured bundle metadata.

```statblock
layout: Basic 5e Layout
name: Snapshot Warden
source: bluDM encounter snapshot
size: Medium
type: humanoid
alignment: neutral
ac: 14
hp: 45
hit_dice: 6d8+18
speed: 30 ft.
stats: [12, 14, 16, 11, 13, 10]
damage_vulnerabilities: ""
damage_resistances: ""
damage_immunities: ""
condition_immunities: ""
senses: Passive Perception 11
languages: Common
cr: "3"
traits:
  - name: Remembered Stance
    desc: This text remains stable even if the library creature later changes.
actions:
  - name: Warden's Spear
    desc: "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 6 (1d8 + 2) piercing damage."
```
