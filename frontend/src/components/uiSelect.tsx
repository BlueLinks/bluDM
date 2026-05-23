import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronsUpDown } from "lucide-react";
import React from "react";

export function Select({
  value,
  placeholder,
  options,
  onValueChange,
}: {
  value: string;
  placeholder: string;
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
    <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
      <SelectPrimitive.Trigger className="inline-flex min-h-10 w-full min-w-0 max-w-full items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-left text-sm outline-none ring-primary/30 transition hover:bg-muted/60 focus:ring-2">
        <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
          {SelectedIcon && (
            <SelectedIcon
              className={["h-4 w-4 shrink-0", selected?.iconClassName || "text-muted-foreground"]
                .filter(Boolean)
                .join(" ")}
            />
          )}
          <SelectPrimitive.Value className="truncate" placeholder={placeholder} />
        </span>
        <SelectPrimitive.Icon asChild>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content className="z-[70] max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-border bg-card text-card-foreground shadow-xl">
          <SelectPrimitive.Viewport className="p-1">
            {options.map((option) => (
              <SelectPrimitive.Item
                className="relative flex min-w-0 cursor-pointer select-none items-center rounded-sm py-2 pl-8 pr-3 text-sm outline-none hover:bg-muted focus:bg-muted data-[state=checked]:font-semibold"
                key={option.value}
                value={option.value}
              >
                {option.icon &&
                  React.createElement(option.icon, {
                    className: ["mr-2 h-4 w-4", option.iconClassName || "text-muted-foreground"]
                      .filter(Boolean)
                      .join(" "),
                  })}
                <SelectPrimitive.ItemIndicator className="absolute left-2 inline-flex items-center">
                  <Check className="h-4 w-4" />
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
