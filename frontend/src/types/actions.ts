export type ActionIconSource = "none" | "game-icons" | "asset" | "url";
export type ActionDisplaySection =
  | "trait"
  | "action"
  | "bonus_action"
  | "reaction"
  | "legendary_action"
  | "mythic_action"
  | "lair_action";

export type ActionRollPart = {
  id?: string;
  sortOrder?: number;
  rollKind: string;
  damageType: string;
  magical: boolean;
  diceCount: number;
  dieSize: number;
  fixedValue: number;
  rolledValue?: number;
  criticalRolledValue?: number;
  total?: number;
};

export type ActionTemplate = {
  id: string;
  name: string;
  description: string;
  recharge: string;
  limitedUses: number;
  limitType: string;
  reach: number;
  range: number;
  aoeType: string;
  aoeSize: number;
  actionType: string;
  displaySection: ActionDisplaySection;
  attackModifier: number;
  missEffect: string;
  hitSpecialEvent: string;
  iconSource: ActionIconSource;
  iconKey: string;
  iconAssetId?: string;
  iconUrl: string;
  iconAttribution: string;
  rolls: ActionRollPart[];
  createdAt: string;
  updatedAt: string;
};

export type CreatureAction = ActionTemplate & {
  creatureId: string;
  sourceTemplateId?: string;
  sortOrder: number;
};

export type ActionFormState = {
  id: string;
  name: string;
  description: string;
  recharge: string;
  limitedUses: string;
  limitType: string;
  reach: string;
  range: string;
  aoeType: string;
  aoeSize: string;
  actionType: string;
  displaySection: ActionDisplaySection;
  attackModifier: string;
  missEffect: string;
  hitSpecialEvent: string;
  sourceTemplateId?: string;
  iconSource: ActionIconSource;
  iconKey: string;
  iconAssetId: string;
  iconUrl: string;
  iconAttribution: string;
  rolls: ActionRollFormState[];
};

export type ActionRollFormState = {
  id: string;
  rollKind: string;
  damageType: string;
  magical: boolean;
  diceCount: string;
  dieSize: string;
  fixedValue: string;
};

export type ActionTemplateUsage = {
  actionId: string;
  creatureId: string;
  creatureName: string;
  actionName: string;
};
