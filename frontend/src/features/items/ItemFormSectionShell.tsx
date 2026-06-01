import type { ReactNode } from "react";
import type { ItemFormState } from "../../types";

export type SetItemFormField = <Key extends keyof ItemFormState>(
  key: Key,
  value: ItemFormState[Key],
) => void;

export function DetailSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="grid gap-4 rounded-lg border border-border bg-background p-3">
      <h3 className="font-semibold">{title}</h3>
      {children}
    </section>
  );
}
