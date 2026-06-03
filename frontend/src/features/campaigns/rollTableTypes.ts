export type RollTableSource = "provided" | "campaign";

export type RollTableCategory =
  | "custom"
  | "weather"
  | "rumor"
  | "npc"
  | "travel"
  | "treasure"
  | "encounter"
  | "magic";

export type RollTableRow = {
  id?: string;
  tableId?: string;
  minRoll: number;
  maxRoll: number;
  label: string;
  resultText: string;
  notes: string;
  sortOrder?: number;
};

export type RollTable = {
  id: string;
  campaignId: string;
  source: RollTableSource;
  name: string;
  description: string;
  category: RollTableCategory;
  tags: string[];
  dieExpression: string;
  rows: RollTableRow[];
  createdAt: string;
  updatedAt: string;
};

export type RollTableFormState = {
  name: string;
  description: string;
  category: RollTableCategory;
  tags: string;
  dieExpression: string;
  rows: RollTableRow[];
};

export type RollTableRollResult = {
  tableId: string;
  tableName: string;
  dieExpression: string;
  rolledValue: number;
  matchedRange: string;
  label: string;
  resultText: string;
  notes: string;
  rolledAt: string;
};
