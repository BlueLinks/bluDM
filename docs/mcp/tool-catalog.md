# MCP Tool Catalogue

Every tool operates on bluDM's closed world, accepts IDs returned by discovery tools, returns
structured JSON with stable IDs, and declares an output schema, OAuth scope metadata, and MCP
annotations. Write tools require client approval. “Idempotent” means safe to retry with the same
key and normalized input.

List and search tools accept `limit` from 1 to 100 and an opaque `cursor`, and return a `page`
object. `search_campaign_content` also accepts entity-type filters. `search_creatures` accepts
text, creature type, inclusive CR range, and source-key filters.

## Discovery And Read

| Tool                      | Required scope                 | Notes                                            |
| ------------------------- | ------------------------------ | ------------------------------------------------ |
| `list_campaigns`          | `campaigns:read`               | Token-visible campaigns.                         |
| `get_campaign_context`    | `campaigns:read`               | Brief, counts, party summary, app links.         |
| `search_campaign_content` | `campaigns:read`               | Compact cross-domain discovery.                  |
| `list_players`            | `party:read`                   | Assignment-aware summary; omit campaign ID for all accessible players. |
| `get_player`              | `party:read`                   | Full character state, including Unassigned when permitted.             |
| `list_locations`          | `world:read`                   | Hierarchy and paths.                             |
| `get_location`            | `world:read`                   | Children, links, NPCs, encounters, maps, stock.  |
| `get_world_graph`         | `world:read`                   | Location nodes and explicit edges.               |
| `list_encounters`         | `encounters:read`              | Encounter IDs, status, revision, counts.         |
| `get_encounter`           | `encounters:read`              | Roster, provenance, difficulty evidence.         |
| `search_creatures`        | `library:read`                 | Campaign-visible custom and allowed SRD entries. |
| `get_creature`            | `library:read`                 | Stat block, typed actions, spellcasting, source. |
| `search_library`          | `library:read`                 | Spells, items, equipment, and rules.             |
| `get_library_entry`       | `library:read`                 | Exact `entryId`, type, and source lookup.        |
| `get_prep_gaps`           | `campaigns:read`, `world:read` | Deterministic missing-prep checks.               |
| `evaluate_encounter`      | `generation:run`               | Server-authoritative 2014 XP calculation.        |

## Export

| Tool                            | Required scope                    | Notes                                        |
| ------------------------------- | --------------------------------- | -------------------------------------------- |
| `check_statblock_compatibility` | matching reads                    | Exactly one creature or encounter target.    |
| `export_creature_statblock`     | `library:read`                    | Strict Basic 5e export by default.           |
| `export_encounter_statblocks`   | `encounters:read`, `library:read` | Deduplicated creature blocks and quantities. |
| `export_encounter_bundle`       | `encounters:read`, `library:read` | bluDM block plus Fantasy Statblocks blocks.  |

Exports accept profile `fantasy-statblocks-basic-5e@1`. Encounter exports accept `snapshot` or
`latest`; strict mode is the default and partial output requires explicit opt-in.

## Encounter Writes

| Tool                         | Required scope                       | Annotation                                   |
| ---------------------------- | ------------------------------------ | -------------------------------------------- |
| `create_generated_encounter` | `encounters:write`, `generation:run` | write, idempotent                            |
| `regenerate_encounter`       | `encounters:write`, `generation:run` | destructive replacement, idempotent          |
| `list_encounter_revisions`   | `encounters:read`                    | read-only                                    |
| `restore_encounter_revision` | `encounters:write`                   | destructive replacement, idempotent          |
| `create_encounter`           | `encounters:write`                   | write, idempotent                            |
| `update_encounter`           | `encounters:write`                   | write; roster replacement may be destructive |

There is no delete or live-combat tool.

## Campaign And Player Management

| Tool              | Required scope    | Annotation                                  |
| ----------------- | ----------------- | ------------------------------------------- |
| `create_campaign` | `campaigns:write` | write, idempotent; all-campaign tokens only |
| `update_campaign` | `campaigns:write` | write with `expectedUpdatedAt`              |
| `create_player`   | `party:write`     | write, idempotent                           |
| `update_player`   | `party:write`     | partial write with `expectedUpdatedAt`      |
| `move_player`     | `party:write`     | assignment write with `expectedUpdatedAt`   |
| `clone_player`    | `party:write`     | deterministic, assignment-preserving clone  |

Campaign ruleset inputs accept `2014` or `2024` and are stored as bluDM's canonical encounter
ruleset. If a ruleset update needs a standard source that is not enabled, bluDM enables that source
and returns a warning. Player moves accept an empty destination for Unassigned; moving to the
current campaign returns `operation: "unchanged"`. Clone retries with the same idempotency key
return the same copy rather than another player record.

## World And Connected Authoring

| Tool                       | Required scope                         | Annotation                      |
| -------------------------- | -------------------------------------- | ------------------------------- |
| `create_location`          | `world:write`                          | write, idempotent               |
| `update_location`          | `world:write`                          | write with `expectedUpdatedAt`  |
| `create_npc`               | `library:write`                        | write, idempotent               |
| `update_npc`               | `library:write`                        | write with `expectedUpdatedAt`  |
| `link_npc_to_location`     | `world:write`                          | write, idempotent               |
| `create_location_link`     | `world:write`                          | write, idempotent               |
| `preview_campaign_changes` | `content:import` plus operation scopes | validation/approval preview     |
| `apply_campaign_changes`   | `content:import` plus operation scopes | transactional write, idempotent |

The bulk profile supports location creation, NPC creation, NPC placement, and location links.
Unknown operations fail rather than being partially ignored.

## Advanced Preparation

| Tool                              | Required scope                         | Notes                                                                               |
| --------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------- |
| `list_roll_tables`                | `world:read`                           | Campaign-authored tables and rows.                                                  |
| `roll_on_table`                   | `world:read`                           | Stable seeded roll or explicit reproducible roll; no hidden nondeterministic state. |
| `create_roll_table`               | `world:write`                          | Complete, non-overlapping 1dN ranges.                                               |
| `update_roll_table`               | `world:write`                          | Optimistic concurrency.                                                             |
| `calculate_travel`                | `world:read`                           | Deterministic 2014 travel assumptions.                                              |
| `create_journey`                  | `world:write`                          | Idempotent saved journey.                                                           |
| `generate_dungeon_preview`        | `world:read`, `generation:run`         | No campaign content write.                                                          |
| `save_generated_dungeon`          | `world:write`, `generation:run`        | Root, rooms, editable map in one transaction.                                       |
| `get_completed_run_summary`       | `sessions:read`                        | Ended run only; no live commands.                                                   |
| `get_campaign_continuity_context` | campaign/world/encounter/session reads | Recent outcomes and discoverable run IDs.                                           |
| `preview_shop_stock_changes`      | `world:write`, `library:read`          | Exact upsert preview; no deletes.                                                   |
| `apply_shop_stock_changes`        | `world:write`, `library:read`          | Bound transactional apply.                                                          |

## Error Handling

Tool failures preserve domain codes: `unauthorized`, `forbidden`, `not_found`,
`validation_failed`, `conflict`, `idempotency_conflict`, `rate_limited`, `timeout`, and
`unsupported`.
Re-read on conflict. Do not guess another ID, silently drop a requested operation, or retry with a
new idempotency key unless the user intends a new entity.

## Example Calls

Discovery IDs are placeholders below; use IDs returned by the current token's list/search calls.

```json
{
  "tool": "search_creatures",
  "arguments": {
    "campaignId": "11111111-1111-4111-8111-111111111111",
    "creatureType": "undead",
    "maxCr": 2,
    "limit": 20
  },
  "resultShape": {
    "creatures": [
      { "id": "66666666-6666-4666-8666-666666666666", "name": "Ghoul", "challengeRating": "1" }
    ],
    "page": { "limit": 20 }
  }
}
```

```json
{
  "tool": "create_generated_encounter",
  "arguments": {
    "campaignId": "11111111-1111-4111-8111-111111111111",
    "idempotencyKey": "room-12-medium-01",
    "name": "Wolves at the Broken Gate",
    "locationId": "22222222-2222-4222-8222-222222222222",
    "playerIds": ["33333333-3333-4333-8333-333333333333"],
    "options": { "archetype": "beasts", "challenge": "medium", "enemyCount": 3 },
    "seed": 4102
  },
  "resultShape": {
    "encounter": { "id": "44444444-4444-4444-8444-444444444444", "status": "planned" },
    "revision": 1,
    "difficultyEvidence": {
      "requestedDifficulty": "Medium",
      "actualDifficulty": "Hard",
      "rawXp": 300,
      "adjustedXp": 600,
      "withinTarget": false,
      "warnings": ["The generated encounter is outside the requested difficulty band."]
    },
    "idempotencyReplay": false
  }
}
```

```json
{
  "tool": "regenerate_encounter",
  "arguments": {
    "campaignId": "11111111-1111-4111-8111-111111111111",
    "encounterId": "44444444-4444-4444-8444-444444444444",
    "idempotencyKey": "room-12-reroll-01",
    "expectedRevision": 1,
    "options": { "archetype": "beasts", "challenge": "medium", "enemyCount": 3 },
    "freshSeed": true,
    "replaceManagedCombatantsOnly": true,
    "preserveCombatantIds": ["55555555-5555-4555-8555-555555555555"]
  },
  "resultShape": {
    "encounter": { "id": "44444444-4444-4444-8444-444444444444" },
    "revision": 2,
    "preservedCombatantCount": 2,
    "replacedCombatantCount": 3
  }
}
```

```json
{
  "tool": "preview_campaign_changes",
  "arguments": {
    "campaignId": "11111111-1111-4111-8111-111111111111",
    "changes": [
      {
        "operation": "create_location",
        "clientRef": "gatehouse",
        "data": { "name": "Broken Gatehouse", "locationType": "room" }
      },
      {
        "operation": "create_npc",
        "clientRef": "warden",
        "data": {
          "name": "The Ash Warden",
          "size": "Medium",
          "creatureType": "humanoid",
          "armorClass": 14,
          "hitPoints": 27,
          "hitDice": "5d8+5",
          "challengeRating": "2",
          "xp": 450,
          "statBlock": {
            "abilityScores": { "str": 12, "dex": 14, "con": 12, "int": 10, "wis": 13, "cha": 11 },
            "speed": { "walk": 30 }
          }
        }
      },
      {
        "operation": "link_npc_to_location",
        "data": { "creatureId": "ref:warden", "locationId": "ref:gatehouse" }
      }
    ]
  },
  "resultShape": {
    "previewToken": "opaque-review-token",
    "changes": [{ "operation": "create_location" }],
    "warnings": []
  }
}
```

Apply calls submit the unchanged operations, returned `previewToken`, and a stable
`idempotencyKey`. Compatibility/export results contain the full canonical block and arrays for
`mappedFields`, `derivedFields`, `flattenedFields`, `adjacentOnlyFields`, `omittedFields`, and
`blockingFields`; the schemas exposed by `tools/list` are authoritative for every field not shown
in these compact examples.
