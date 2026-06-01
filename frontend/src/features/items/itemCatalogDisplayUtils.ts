export function compactSubtype(value: string): string {
  return value
    .replace(/\bWeapons?\b/gi, "")
    .replace(/\bArmor\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function derivedSubtype(raw: Record<string, unknown>): string {
  return (
    stringAt(raw, "gear_category", "name") ||
    stringAt(raw, "weapon_category", "name") ||
    stringAt(raw, "armor_category", "name") ||
    stringAt(raw, "tool_category", "name")
  );
}

export function rangeText(range: Record<string, unknown>): string {
  const normal = numberValue(range.normal);
  const long = numberValue(range.long);
  if (normal && long) return `${normal}/${long} ft`;
  if (normal) return `${normal} ft`;
  return "";
}

export function speedLabel(value: unknown): string {
  const speed = objectValue(value);
  const quantity = numberValue(speed.quantity);
  const unit = stringValue(speed.unit) || "ft";
  return quantity ? `${quantity} ${unit}` : "";
}

export function packContentLabel(entry: unknown): string {
  if (typeof entry === "string") return entry;
  const object = objectValue(entry);
  const quantity = numberValue(object.quantity);
  const item = objectValue(object.item);
  return [quantity ? `${quantity}x` : "", stringValue(item.name)].filter(Boolean).join(" ");
}

export function healingFromDescription(description: string): string {
  const match = description.match(/regain[s]? ([^.]+hit points?)/i);
  return match ? `Restores ${match[1].replace(/\s+/g, " ")}` : "";
}

export function truncate(value: string, length: number): string {
  return value.length > length ? `${value.slice(0, length - 1)}...` : value;
}

export function formatNumber(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

export function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function stringValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

export function numberValue(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function booleanValue(value: unknown): boolean {
  return value === true;
}

export function boolValue(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function stringAt(parent: Record<string, unknown>, key: string, child: string): string {
  return stringValue(objectValue(parent[key])[child]);
}

export function numberAt(parent: Record<string, unknown>, key: string, child: string): number {
  return numberValue(objectValue(parent[key])[child]);
}

export function stringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(stringValue).filter(Boolean);
  const text = stringValue(value);
  return text ? [text] : [];
}

export function isPresent<T>(value: T | null | undefined | false | ""): value is T {
  return Boolean(value);
}
