import type React from "react";
import { Field, Input } from "../../../components/ui";

export type SearchableOption = {
  id: string;
  label: string;
  description?: React.ReactNode;
  searchText: string;
};

export function SearchableOptionPicker({
  emptyMessage = "No matching options.",
  label,
  options,
  placeholder,
  search,
  selectedID,
  onSearchChange,
  onSelect,
}: {
  emptyMessage?: string;
  label: string;
  options: SearchableOption[];
  placeholder: string;
  search: string;
  selectedID: string;
  onSearchChange: (value: string) => void;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="grid gap-3">
      <Field label={`Search ${label.toLowerCase()}`}>
        <Input
          placeholder={placeholder}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </Field>
      <div
        aria-label={label}
        className="grid max-h-48 gap-1 overflow-auto rounded-md border border-border bg-surface p-1"
        role="listbox"
      >
        {options.length ? (
          options.map((option) => (
            <button
              aria-selected={option.id === selectedID}
              className={[
                "rounded px-2 py-1.5 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                option.id === selectedID
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-surface-foreground hover:bg-card hover:text-foreground",
              ].join(" ")}
              key={option.id}
              role="option"
              type="button"
              onClick={() => onSelect(option.id)}
            >
              <span className="block truncate">{option.label}</span>
              {option.description ? (
                <span className="block truncate text-xs text-muted-foreground">
                  {option.description}
                </span>
              ) : null}
            </button>
          ))
        ) : (
          <p className="px-2 py-3 text-sm text-muted-foreground">{emptyMessage}</p>
        )}
      </div>
    </div>
  );
}

export function filterSearchableOptions(options: SearchableOption[], search: string, limit = 12) {
  const query = search.trim().toLowerCase();
  if (!query) return options.slice(0, limit);
  return options
    .filter((option) => option.searchText.toLowerCase().includes(query))
    .slice(0, limit);
}
