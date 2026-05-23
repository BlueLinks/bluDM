import type { ReactNode } from "react";

export function SpellSubsection({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <div className="grid gap-3 rounded-md border border-border bg-background p-3">
      <div className="grid gap-1">
        <h4 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">{title}</h4>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export function SpellNotice({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
      {children}
    </p>
  );
}
