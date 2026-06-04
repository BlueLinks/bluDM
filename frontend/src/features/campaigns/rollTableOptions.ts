import type { RollTableCategory, RollTableFormState, RollTableRow } from "./rollTableTypes";

export const rollTableCategoryOptions: Array<{ value: RollTableCategory; label: string }> = [
  { value: "custom", label: "Custom" },
  { value: "weather", label: "Weather" },
  { value: "rumor", label: "Rumor" },
  { value: "npc", label: "NPC" },
  { value: "travel", label: "Travel" },
  { value: "treasure", label: "Treasure" },
  { value: "encounter", label: "Encounter" },
  { value: "magic", label: "Magic" },
];

export const rollTableDieOptions = [
  { value: "1d4", label: "1d4" },
  { value: "1d6", label: "1d6" },
  { value: "1d8", label: "1d8" },
  { value: "1d10", label: "1d10" },
  { value: "1d12", label: "1d12" },
  { value: "1d20", label: "1d20" },
  { value: "1d100", label: "1d100" },
];

export const blankRollTableForm: RollTableFormState = {
  name: "",
  description: "",
  category: "custom",
  tags: "",
  dieExpression: "1d6",
  rows: oneRowPerFace("1d6"),
};

export function oneRowPerFace(dieExpression: string): RollTableRow[] {
  return Array.from({ length: dieSize(dieExpression) }, (_, index) => ({
    minRoll: index + 1,
    maxRoll: index + 1,
    label: `Result ${index + 1}`,
    resultText: "",
    notes: "",
  }));
}

export function resizeRowsForDie(rows: RollTableRow[], dieExpression: string): RollTableRow[] {
  const size = dieSize(dieExpression);
  if (!size) return rows;
  return Array.from({ length: size }, (_, index) => {
    const current = rows[index];
    return {
      minRoll: index + 1,
      maxRoll: index + 1,
      label: current?.label ?? `Result ${index + 1}`,
      resultText: current?.resultText ?? "",
      notes: current?.notes ?? "",
    };
  });
}

export function normalizeRollTableTags(tags: string | string[]) {
  const values = Array.isArray(tags) ? tags : tags.split(",");
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const tag of values) {
    const next = tag.trim().toLowerCase();
    if (!next || seen.has(next)) continue;
    seen.add(next);
    normalized.push(next);
  }
  return normalized;
}

export function dieSize(dieExpression: string) {
  const match = /^1d(4|6|8|10|12|20|100)$/.exec(dieExpression);
  return match ? Number(match[1]) : 0;
}

export function rollTableCategoryLabel(value: string) {
  return rollTableCategoryOptions.find((option) => option.value === value)?.label ?? "Custom";
}

export function formFromRollTable(table: {
  name: string;
  description: string;
  category: RollTableCategory;
  tags: string[];
  dieExpression: string;
  rows: RollTableRow[];
}): RollTableFormState {
  return {
    name: table.name,
    description: table.description,
    category: table.category,
    tags: normalizeRollTableTags(table.tags).join(", "),
    dieExpression: table.dieExpression,
    rows: resizeRowsForDie(table.rows, table.dieExpression),
  };
}

export function validateRollTableForm(form: RollTableFormState) {
  const errors: string[] = [];
  const size = dieSize(form.dieExpression);
  if (!form.name.trim()) errors.push("Name is required.");
  if (!size) errors.push("Choose a supported die expression.");
  if (form.rows.length === 0) errors.push("Add at least one row.");
  const rows = [...form.rows].sort((a, b) => a.minRoll - b.minRoll || a.maxRoll - b.maxRoll);
  let expectedMin = 1;
  let stoppedEarly = false;
  for (const row of rows) {
    if (row.minRoll < 1 || row.maxRoll > size || row.minRoll > row.maxRoll) {
      errors.push("Rows must stay inside the die range.");
      stoppedEarly = true;
      break;
    }
    if (row.minRoll !== expectedMin) {
      errors.push("Rows must cover every die face without gaps or overlaps.");
      stoppedEarly = true;
      break;
    }
    if (!row.label.trim()) {
      errors.push("Every row needs a label.");
      stoppedEarly = true;
      break;
    }
    if (!row.resultText.trim()) {
      errors.push("Every row needs result text.");
      stoppedEarly = true;
      break;
    }
    expectedMin = row.maxRoll + 1;
  }
  if (!stoppedEarly && size && rows.length > 0 && expectedMin !== size + 1) {
    errors.push("Rows must cover the whole die.");
  }
  return Array.from(new Set(errors));
}
