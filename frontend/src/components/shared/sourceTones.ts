export type ContentSourceTone = "custom" | "imported" | "official" | "personal" | "shared";

const sourceToneClasses: Record<ContentSourceTone, string> = {
  custom: "border-companion-custom bg-companion-custom/10 text-companion-custom",
  imported: "border-companion-imported bg-companion-imported/10 text-companion-imported",
  official: "border-companion-official bg-companion-official/10 text-companion-official",
  personal: "border-companion-personal bg-companion-personal/10 text-companion-personal",
  shared: "border-companion-shared bg-companion-shared/10 text-companion-shared",
};

const sourceBadgeClasses: Record<ContentSourceTone, string> = {
  custom: "border-companion-custom/30 bg-companion-custom/15 text-companion-custom",
  imported: "border-companion-imported/30 bg-companion-imported/15 text-companion-imported",
  official: "border-companion-official/30 bg-companion-official/15 text-companion-official",
  personal: "border-companion-personal/30 bg-companion-personal/15 text-companion-personal",
  shared: "border-companion-shared/30 bg-companion-shared/15 text-companion-shared",
};

export function sourceToneClass(tone: ContentSourceTone) {
  return sourceToneClasses[tone];
}

export function sourceBadgeClass(tone: ContentSourceTone) {
  return sourceBadgeClasses[tone];
}
