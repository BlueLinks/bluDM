import { BookOpen, UserRound } from "lucide-react";
import { sourceToneClass, type ContentSourceTone } from "./sourceTones";

export function ContentSourceFilter({
  standardCopy = "Shared read-only content",
  standardLabel = "SRD library",
  showStandard,
  showUser,
  userCopy = "Homebrew you can edit",
  userLabel = "My library",
  onShowStandardChange,
  onShowUserChange,
}: {
  standardCopy?: string;
  standardLabel?: string;
  showStandard: boolean;
  showUser: boolean;
  userCopy?: string;
  userLabel?: string;
  onShowStandardChange: (show: boolean) => void;
  onShowUserChange: (show: boolean) => void;
}) {
  const options = [
    {
      checked: showUser,
      icon: UserRound,
      label: userLabel,
      copy: userCopy,
      onChange: onShowUserChange,
      tone: "personal" as const,
    },
    {
      checked: showStandard,
      icon: BookOpen,
      label: standardLabel,
      copy: standardCopy,
      onChange: onShowStandardChange,
      tone: "official" as const,
    },
  ];

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((option) => (
        <button
          type="button"
          key={option.label}
          className={[
            "group flex items-center gap-3 rounded-lg border p-3 text-left transition",
            sourceToggleClass(option.checked, option.tone),
          ].join(" ")}
          aria-pressed={option.checked}
          onClick={() => option.onChange(!option.checked)}
        >
          <span
            className={[
              "grid h-10 w-10 shrink-0 place-items-center rounded-full border",
              option.checked ? "border-current bg-background/70" : "border-border bg-background",
            ].join(" ")}
          >
            <option.icon className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block font-semibold">{option.label}</span>
            <span className="block text-xs opacity-80">{option.copy}</span>
          </span>
          <span
            className={[
              "ml-auto h-3 w-3 rounded-full border",
              option.checked ? "border-current bg-current" : "border-border bg-background",
            ].join(" ")}
          />
        </button>
      ))}
    </div>
  );
}

function sourceToggleClass(checked: boolean, tone: ContentSourceTone) {
  if (!checked) {
    return "border-border bg-surface text-surface-foreground hover:border-primary/50 hover:bg-card hover:text-foreground";
  }
  return `${sourceToneClass(tone)} shadow-sm`;
}
