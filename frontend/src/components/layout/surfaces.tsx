import type React from "react";

type SurfaceTone = "accent" | "neutral" | "primary" | "secondary" | "tertiary";

const toneClasses: Record<SurfaceTone, string> = {
  accent: "border-accent/35 bg-accent/14 text-accent",
  neutral: "border-border bg-surface text-muted-foreground",
  primary: "border-primary/35 bg-primary/14 text-primary",
  secondary: "border-secondary/35 bg-secondary/14 text-secondary",
  tertiary: "border-tertiary/35 bg-tertiary/14 text-tertiary",
};

const toneStrips: Record<SurfaceTone, string> = {
  accent: "from-accent/70 via-accent/45 to-accent/70",
  neutral: "from-border via-border to-border",
  primary: "from-primary/70 via-primary/45 to-primary/70",
  secondary: "from-secondary/70 via-secondary/45 to-secondary/70",
  tertiary: "from-tertiary/70 via-tertiary/45 to-tertiary/70",
};

const toneTextClasses: Record<SurfaceTone, string> = {
  accent: "text-accent",
  neutral: "text-muted-foreground",
  primary: "text-primary",
  secondary: "text-secondary",
  tertiary: "text-tertiary",
};

export function WorkspaceBanner({
  action,
  children,
  className = "",
  copy,
  eyebrow = "Workspace",
  icon: Icon,
  tone = "primary",
  title,
}: {
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  copy?: string;
  eyebrow?: React.ReactNode;
  icon?: React.ElementType;
  tone?: SurfaceTone;
  title: React.ReactNode;
}) {
  return (
    <section
      className={["depth-hero relative overflow-hidden rounded-2xl", className]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-95"
        style={{
          backgroundImage: [
            "linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--card)) 56%, hsl(var(--surface)) 100%)",
            `radial-gradient(circle at 20% 20%, hsl(var(--${tone}) / 0.22), transparent 18rem)`,
            `radial-gradient(circle at 82% 18%, hsl(var(--accent) / 0.16), transparent 16rem)`,
            `linear-gradient(120deg, transparent 0 44%, hsl(var(--${tone}) / 0.12) 44% 45%, transparent 45%)`,
          ].join(", "),
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(hsl(0 0% 100% / 0.05) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100% / 0.04) 1px, transparent 1px)",
          backgroundSize: "36px 36px",
        }}
      />
      <div className="relative grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-6 lg:p-7">
        <div className="grid min-w-0 gap-4">
          <div className="flex min-w-0 items-start gap-3">
            {Icon ? (
              <span
                className={[
                  "grid h-11 w-11 shrink-0 place-items-center rounded-xl border shadow-sm",
                  toneClasses[tone],
                ].join(" ")}
              >
                <Icon className="h-5 w-5" />
              </span>
            ) : null}
            <div className="min-w-0">
              <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {eyebrow}
              </div>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
              {copy ? (
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{copy}</p>
              ) : null}
            </div>
          </div>
          {children ? <div className="min-w-0">{children}</div> : null}
        </div>
        {action ? (
          <div className="flex min-w-0 flex-wrap justify-start gap-2 lg:justify-end">{action}</div>
        ) : null}
      </div>
    </section>
  );
}

export function FeatureCard({
  action,
  className = "",
  copy,
  icon: Icon,
  title,
  tone = "secondary",
  value,
}: {
  action?: React.ReactNode;
  className?: string;
  copy?: string;
  icon?: React.ElementType;
  title: React.ReactNode;
  tone?: SurfaceTone;
  value?: React.ReactNode;
}) {
  return (
    <article
      className={[
        "depth-featured relative overflow-hidden rounded-xl p-4 transition hover:-translate-y-0.5 hover:border-primary/20",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span
        aria-hidden="true"
        className={["absolute inset-x-0 top-0 h-1 bg-gradient-to-r", toneStrips[tone]].join(" ")}
      />
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-3">
            {Icon ? (
              <span
                className={[
                  "grid h-10 w-10 shrink-0 place-items-center rounded-lg border",
                  toneClasses[tone],
                ].join(" ")}
              >
                <Icon className="h-4 w-4" />
              </span>
            ) : null}
            <div className="min-w-0">
              <h3 className="font-semibold leading-tight">{title}</h3>
              {copy ? <p className="mt-1 text-sm text-muted-foreground">{copy}</p> : null}
            </div>
          </div>
        </div>
        {value ? (
          <div className="shrink-0 text-right text-sm font-semibold text-foreground">{value}</div>
        ) : null}
      </div>
      {action ? <div className="mt-4">{action}</div> : null}
    </article>
  );
}

export function MetricCard({
  className = "",
  detail,
  icon: Icon,
  label,
  tone = "neutral",
  value,
}: {
  className?: string;
  detail?: string;
  icon?: React.ElementType;
  label: React.ReactNode;
  tone?: SurfaceTone;
  value: React.ReactNode;
}) {
  return (
    <article
      className={["depth-featured relative overflow-hidden rounded-xl p-3 transition", className]
        .filter(Boolean)
        .join(" ")}
    >
      <span
        aria-hidden="true"
        className={["absolute inset-x-0 top-0 h-1 bg-gradient-to-r", toneStrips[tone]].join(" ")}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div
            className={["text-xs font-bold uppercase tracking-wide", toneTextClasses[tone]].join(
              " ",
            )}
          >
            {label}
          </div>
          <div className="mt-1 text-2xl font-semibold leading-tight text-foreground">{value}</div>
          {detail ? <p className="mt-1 text-sm text-muted-foreground">{detail}</p> : null}
        </div>
        {Icon ? (
          <span
            className={[
              "grid h-9 w-9 shrink-0 place-items-center rounded-lg border",
              toneClasses[tone],
            ].join(" ")}
          >
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
      </div>
    </article>
  );
}
