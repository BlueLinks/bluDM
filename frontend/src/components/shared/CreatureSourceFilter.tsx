import { BookOpen, UserRound } from "lucide-react";

export function CreatureSourceFilter({
  showStandard,
  showUser,
  onShowStandardChange,
  onShowUserChange,
}: {
  showStandard: boolean;
  showUser: boolean;
  onShowStandardChange: (show: boolean) => void;
  onShowUserChange: (show: boolean) => void;
}) {
  const options = [
    {
      checked: showUser,
      icon: UserRound,
      label: "My library",
      copy: "Homebrew you can edit",
      onChange: onShowUserChange,
      tone: "emerald",
    },
    {
      checked: showStandard,
      icon: BookOpen,
      label: "SRD library",
      copy: "Shared read-only content",
      onChange: onShowStandardChange,
      tone: "sky",
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
            option.checked
              ? option.tone === "emerald"
                ? "border-emerald-500 bg-emerald-500/10 text-emerald-800 shadow-sm dark:text-emerald-200"
                : "border-sky-500 bg-sky-500/10 text-sky-800 shadow-sm dark:text-sky-200"
              : "border-border bg-muted/20 text-muted-foreground hover:border-primary/50 hover:bg-muted",
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
