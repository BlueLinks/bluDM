import type React from "react";
import { Button } from "../../../components/ui";

export function CampaignWorldEmptyState({
  action,
  copy,
  icon: Icon,
  title,
}: {
  action?: React.ReactNode;
  copy: string;
  icon?: React.ElementType;
  title: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card px-4 py-3 text-sm shadow-sm">
      <div className="flex min-w-0 items-start gap-3">
        {Icon ? (
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-foreground">{title}</div>
          <p className="mt-1 text-muted-foreground">{copy}</p>
          {action ? <div className="mt-3">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}

export function EmptyStateAction({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Button type="button" size="sm" variant="secondary" onClick={onClick}>
      {children}
    </Button>
  );
}
