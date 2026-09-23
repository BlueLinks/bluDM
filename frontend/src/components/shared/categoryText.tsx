import type { ReactNode } from "react";

const classTextClasses: Record<string, string> = {
  artificer: "text-class-artificer",
  barbarian: "text-class-barbarian",
  bard: "text-class-bard",
  cleric: "text-class-cleric",
  druid: "text-class-druid",
  fighter: "text-class-fighter",
  monk: "text-class-monk",
  paladin: "text-class-paladin",
  ranger: "text-class-ranger",
  rogue: "text-class-rogue",
  sorcerer: "text-class-sorcerer",
  warlock: "text-class-warlock",
  wizard: "text-class-wizard",
};

export function classNameTextClass(className: string) {
  const key = className.trim().toLowerCase().split(/\s|\(/)[0];
  return classTextClasses[key] ?? "text-class-custom";
}

export function ClassNameText({ children }: { children: string }) {
  const parts = children.split(/(\s*(?:\/|,|&)\s*)/);
  return (
    <>
      {parts.map((part, index) => {
        if (/^(\s*(?:\/|,|&)\s*)$/.test(part)) {
          return (
            <span className="text-muted-foreground" key={`${part}-${index}`}>
              {part}
            </span>
          );
        }
        const match = part.match(/^(\s*)(.*?)(\s+\d+)?(\s*)$/);
        const [, leading = "", className = part, level = "", trailing = ""] = match ?? [];
        return (
          <span key={`${part}-${index}`}>
            {leading}
            <span className={classNameTextClass(className)}>{className}</span>
            <span className="text-muted-foreground">
              {level}
              {trailing}
            </span>
          </span>
        );
      })}
    </>
  );
}

export type DifficultyTone = {
  border: string;
  icon: string;
  surface: string;
  text: string;
};

const metadataTone = {
  border: "border-companion-metadata/30 bg-companion-metadata/10 text-companion-metadata",
  icon: "border-companion-metadata/30 bg-companion-metadata/10 text-companion-metadata",
  surface: "bg-companion-metadata/5",
  text: "text-companion-metadata",
};
const successTone = {
  border: "border-success/30 bg-success/10 text-success",
  icon: "border-success/30 bg-success/10 text-success",
  surface: "bg-success/5",
  text: "text-success",
};
const infoTone = {
  border: "border-info/30 bg-info/10 text-info",
  icon: "border-info/30 bg-info/10 text-info",
  surface: "bg-info/5",
  text: "text-info",
};
const warningTone = {
  border: "border-warning/30 bg-warning/10 text-warning",
  icon: "border-warning/30 bg-warning/10 text-warning",
  surface: "bg-warning/5",
  text: "text-warning",
};
const dangerTone = {
  border: "border-destructive/30 bg-destructive/10 text-destructive",
  icon: "border-destructive/30 bg-destructive/10 text-destructive",
  surface: "bg-destructive/5",
  text: "text-destructive",
};
const customTone = {
  border: "border-companion-custom/30 bg-companion-custom/10 text-companion-custom",
  icon: "border-companion-custom/30 bg-companion-custom/10 text-companion-custom",
  surface: "bg-companion-custom/5",
  text: "text-companion-custom",
};

const difficultyTones: Record<string, DifficultyTone> = {
  unrated: metadataTone,
  trivial: metadataTone,
  easy: successTone,
  low: successTone,
  medium: infoTone,
  moderate: infoTone,
  hard: warningTone,
  high: warningTone,
  deadly: dangerTone,
  "over high": dangerTone,
  "over deadly": customTone,
};

export function difficultyTone(label: string): DifficultyTone {
  return difficultyTones[label.trim().toLowerCase()] ?? difficultyTones.trivial;
}

export function DifficultyText({ children }: { children: ReactNode }) {
  const label = typeof children === "string" ? children : "";
  return (
    <span className={["font-semibold", difficultyTone(label).text].join(" ")}>{children}</span>
  );
}
