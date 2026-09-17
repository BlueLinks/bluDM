export type PartyAdjustmentKind =
  | "damage"
  | "healing"
  | "temporary_hit_points"
  | "temporary_max_hit_points"
  | "aid"
  | "inspiring_leader";

export type PartyAdjustmentRequest = {
  targetIds: string[];
  kind: PartyAdjustmentKind;
  amount: number;
  actorId?: string;
  slotLevel?: number;
  consumeSpellSlot?: boolean;
  adjustCurrentHitPoints?: boolean;
  damageType?: string;
  reason?: string;
};
