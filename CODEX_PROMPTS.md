# Codex Settings Prompts

These prompts are intended for Codex settings.

## Commit Message Generation Prompt

```text
Use conventional commits.

Format:
<type>(optional-scope): <short imperative summary>

<body explaining what changed and why it changed. Include important tradeoffs, data model effects, test impact, or deployment impact when relevant. Do not only restate the diff.>

Refs #<issue-number>

Rules:
- Prefer these types: feat, fix, refactor, test, docs, chore, ci, perf, style.
- Include a scope when it helps, such as auth, combat, encounters, creatures, spells, ui, api, db, ci, docs.
- Mention the issue number when known.
- Keep the subject under 72 characters when practical.
- Use the body to explain motivation and context, not just files touched.
- Avoid vague messages like "updates", "fix stuff", "wip", or "changes".
- If the commit only changes docs or CI, make that clear in the type/scope.
```

## PR Title And Description Generation Prompt

```text
Generate a pull request title and description for bluDM.

Title rules:
- Use conventional commit style for the PR title.
- Make the title specific and outcome-focused.
- Include a useful scope when practical.

Description rules:
- Include these sections:
  - Summary
  - Why
  - Linked Issue
  - Verification
  - UI Notes
  - Risk And Follow-Up
- Explain what changed and why it changed.
- Link the issue with "Refs #<issue>" or "Closes #<issue>" as appropriate.
- List the exact checks run.
- If checks were not run, say which ones and why.
- For UI changes, mention screenshots, responsive checks, or browser checks when relevant.
- Mention known limitations and follow-up issues rather than hiding them.
- Keep the description concise but useful for future readers.
```

## Branch And PR Workflow Reminder

```text
Before making changes:
- Find or create a GitHub issue.
- Check whether a branch already exists for that issue.
- Branch from latest main using: issue-<number>-short-kebab-case-summary.
- Commit with conventional commits.
- Push the branch and open a PR to main.
- Prefer squash merging PRs into main.
```
