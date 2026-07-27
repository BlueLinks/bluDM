import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronsUpDown } from "lucide-react";
import React from "react";

const EMPTY_SELECT_VALUE = "__bludm_empty_select_value__";

export function Select({
  className = "",
  value,
  placeholder,
  options,
  size = "md",
  onValueChange,
}: {
  className?: string;
  value: string;
  placeholder: string;
  size?: "sm" | "md";
  options: Array<{
    label: string;
    value: string;
    icon?: React.ElementType;
    iconClassName?: string;
  }>;
  onValueChange: (value: string) => void;
}) {
  const selected = options.find((option) => option.value === value);
  const SelectedIcon = selected?.icon;
  return (
    <SelectPrimitive.Root
      value={value === "" ? EMPTY_SELECT_VALUE : value}
      onValueChange={(next) => onValueChange(next === EMPTY_SELECT_VALUE ? "" : next)}
    >
      <SelectPrimitive.Trigger
        className={[
          "inline-flex w-full min-w-0 max-w-full items-center justify-between gap-2 rounded-md border border-border bg-surface text-left text-sm text-surface-foreground outline-none ring-primary/30 transition hover:border-primary/20 hover:bg-card hover:text-foreground focus-visible:ring-2",
          size === "sm" ? "min-h-8 px-2 py-1" : "min-h-10 px-3 py-2",
          className,
        ].join(" ")}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
          {SelectedIcon && (
            <SelectedIcon
              className={["h-4 w-4 shrink-0", selected?.iconClassName || "text-surface-foreground"]
                .filter(Boolean)
                .join(" ")}
            />
          )}
          {selected ? (
            <span className="truncate">{selected.label}</span>
          ) : (
            <SelectPrimitive.Value className="truncate" placeholder={placeholder} />
          )}
        </span>
        <SelectPrimitive.Icon asChild>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          align="start"
          position="popper"
          sideOffset={6}
          className="z-[70] max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-border bg-card text-card-foreground shadow-xl"
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map((option) => (
              <SelectPrimitive.Item
                className="relative flex min-w-0 cursor-pointer select-none items-center rounded-sm py-2 pl-8 pr-3 text-sm outline-none transition hover:bg-surface hover:text-foreground focus:bg-surface focus:text-foreground data-[highlighted]:bg-surface data-[highlighted]:text-foreground data-[state=checked]:font-semibold"
                key={option.value}
                value={option.value === "" ? EMPTY_SELECT_VALUE : option.value}
              >
                {option.icon &&
                  React.createElement(option.icon, {
                    className: ["mr-2 h-4 w-4", option.iconClassName || "text-surface-foreground"]
                      .filter(Boolean)
                      .join(" "),
                  })}
                <SelectPrimitive.ItemIndicator className="absolute left-2 inline-flex items-center">
                  <Check className="h-4 w-4 text-primary" />
                </SelectPrimitive.ItemIndicator>
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
