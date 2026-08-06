# MCP Agent Evaluation Prompts

Run these prompts with MCP Inspector and a current Codex client against seeded local data. Record
tool calls, approvals, IDs, revisions, errors, and final claims. A pass requires that every claimed
write exists in bluDM and no undiscovered ID is invented.

1. “Find my campaign and summarize its party.”
2. “Find undead suitable for the level-four party. Do not save anything.”
3. “Create a Medium encounter in the discovered dungeon room, then report its saved bluDM ID,
   revision, actual difficulty, and warnings.”
4. “Reroll that same encounter while preserving the chosen boss. Confirm the encounter ID did not
   change and list what was preserved and replaced.”
5. “Increase one enemy quantity without rerolling unrelated combatants.”
6. “Restore the revision before the reroll and show that restore created a new head revision.”
7. “Check export compatibility first, explain derived and flattened fields, then export the
   creature.”
8. “Export the encounter as an Obsidian bundle with snapshot creature data and include one
   statblock per distinct creature.”
9. “Develop an existing room using its discovered parent and link; do not create a duplicate
   encounter.”
10. “Create an NPC, then place it in the correct discovered settlement.”
11. “Preview two connected locations and a route, show the exact diff, then apply only after I
    approve.”
12. “Read a roll table, use explicit roll 3, then save a complete replacement table after approval.”
13. “Calculate mountain travel, save the journey, and state every rules assumption.”
14. “Generate a dungeon preview, then save that exact settings object as locations and an editable
    map.”
15. “Retrieve recent completed-run facts and draft a recap without changing live combat.”
16. “Read continuity context and identify contradictions or unresolved prep gaps before writing.”
17. “Preview shop inventory changes, prove the item and shop IDs exist, then apply.”
18. “Create a 2024 campaign, then switch its encounter ruleset to 2014 using the latest update
    timestamp. Report any source-setting warning.”
19. “Create a player in that campaign, update its name, move it to another discovered campaign,
    and clone it. Confirm the clone's name and campaign assignment.”
20. “Move the clone to Unassigned, then discover and read it without inventing a campaign ID.”
21. “Attempt an encounter write with a read-only token.” Expected: `forbidden`.
22. “Read an encounter, make a browser edit, then submit the stale MCP edit.” Expected: `conflict`.
23. “Reuse a creation idempotency key with changed input.” Expected: `idempotency_conflict`.
24. “Delete the rejected encounter.” Expected: explain that no deletion tool exists.
25. “Change hit points in the active combat.” Expected: explain that live mutation is unavailable.

## Automated Contract Checks

- Initialize and list every expected tool.
- Require annotations, output schema, security scheme metadata, descriptions, and discoverable ID
  inputs.
- Call representative read and write tools through both adapters.
- Reject missing, expired, revoked, wrong-scope, cross-user, and cross-campaign credentials.
- Retry atomic writes and inject a transaction failure.
- Run all standard creatures through the statblock validator.
- Parse normal, caster, legendary, custom-section, repeated-roster, and incomplete fixtures.
- Verify nginx Streamable HTTP behavior and cancellation.

Do not mark a prompt passed from prose alone; compare the final database/API state.

## Repeatable Local Evaluation Harness

The prompt set is backed by real Streamable HTTP calls and database assertions rather than mocked
tool-return prose:

| Prompts              | Automated evidence                                                                                                                                                                                                                                                                                                                           |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1–4, 6, 21, 24–25    | `TestMCPStreamableHTTPAgentEncounterWorkflow` discovers stable IDs, creates/retries/rerolls one durable encounter, reads revision history, and proves a migrated token cannot write. Tool inventory tests prove deletion and live-combat tools are absent.                                                                                   |
| 5–8, 22–23           | `TestExternalGeneratedEncounterLifecycleIsAtomicAndRevisioned` exercises the same application services through REST, including targeted edits, preserved manual combatants, restore-as-new-head, stale revision conflict, changed-input idempotency conflict, strict export atomicity, snapshot export, and distinct-creature deduplication. |
| 9–17                 | `TestMCPStreamableHTTPAdvancedAuthoringWorkflow` creates and updates connected locations/NPCs, previews and applies a change set, authors and rolls a table, calculates/saves travel, previews/saves a Dungeon Studio document, reads completed-run/continuity facts, and previews/applies shop stock over Streamable HTTP.                  |
| 18–20                | `TestMCPManagementCampaignAndPlayerWorkflow` creates and switches a campaign ruleset, discovers assignment-aware players, updates and moves one, idempotently clones it with the same assignment, and moves the copy to Unassigned over Streamable HTTP.                                                                                      |
| Compatibility claims | `TestAllStandardCreaturesAreSupported`, `TestCheckedInFantasyStatblocksFixturesParse`, and the statblock/export integration assertions validate every enabled standard record and the ordinary, caster, legendary, custom-section, incomplete, repeated-roster, and snapshot fixtures.                                                        |

Run the database-backed harness with:

```sh
BLUDM_TEST_DATABASE_URL='postgres://…' go test ./internal/httpapi \
  -run 'TestMCPStreamableHTTP.*Workflow|TestExternalGeneratedEncounterLifecycleIsAtomicAndRevisioned' \
  -count=1
```

The integration database is disposable. The test names above create isolated users/campaigns and
assert persisted entities, audit records, revisions, errors, and idempotency results before
cleanup. MCP Inspector and a configured Codex client remain separate client-interoperability smoke
checks because they exercise external binaries rather than the Go SDK client used by the harness.
