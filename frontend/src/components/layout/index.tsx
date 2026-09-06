import type React from "react";

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const actionAlignClasses = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
};

const actionGapClasses = {
  sm: "gap-2",
  md: "gap-3",
};

const actionJustifyClasses = {
  start: "justify-start",
  end: "justify-end",
  between: "justify-between",
};

export function ActionRow({
  align = "center",
  children,
  className = "",
  gap = "sm",
  justify = "start",
}: {
  align?: keyof typeof actionAlignClasses;
  children: React.ReactNode;
  className?: string;
  gap?: keyof typeof actionGapClasses;
  justify?: keyof typeof actionJustifyClasses;
}) {
  return (
    <div
      className={cx(
        "flex flex-wrap",
        actionAlignClasses[align],
        actionGapClasses[gap],
        actionJustifyClasses[justify],
        className,
      )}
    >
      {children}
    </div>
  );
}

const responsiveGridClasses = {
  cards3: "grid gap-3 lg:grid-cols-2 2xl:grid-cols-3",
  cards4: "grid gap-4 md:grid-cols-2 xl:grid-cols-4",
  equal2: "grid gap-4 lg:grid-cols-2",
  equal3: "grid gap-4 lg:grid-cols-3",
  form2: "grid gap-4 sm:grid-cols-2",
  stats3: "grid gap-3 sm:grid-cols-3",
};

export function ResponsiveGrid({
  children,
  className = "",
  variant,
}: {
  children: React.ReactNode;
  className?: string;
  variant: keyof typeof responsiveGridClasses;
}) {
  return <div className={cx(responsiveGridClasses[variant], className)}>{children}</div>;
}

const fieldGridClasses = {
  itemSearch: "grid gap-3 lg:grid-cols-[minmax(0,1fr)_15rem]",
  link: "grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]",
  worldMapForm: "grid gap-3 md:grid-cols-4 md:items-end",
};

export function FieldGrid({
  children,
  className = "",
  variant,
}: {
  children: React.ReactNode;
  className?: string;
  variant: keyof typeof fieldGridClasses;
}) {
  return <div className={cx(fieldGridClasses[variant], className)}>{children}</div>;
}

const sidebarDetailClasses = {
  catalog: "grid lg:grid-cols-[250px_minmax(0,1fr)]",
  compact: "grid gap-4 xl:grid-cols-[minmax(13rem,16rem)_minmax(0,1fr)] xl:items-stretch",
  editor: "grid gap-2 xl:grid-cols-[minmax(0,1.29fr)_minmax(28rem,0.71fr)] xl:items-start",
  initiative:
    "grid gap-[1.125rem] xl:grid-cols-[minmax(0,1.435fr)_minmax(22rem,1fr)] xl:items-stretch",
  summary: "grid gap-4 xl:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)] xl:items-start",
  workspace: "grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]",
};

export function SidebarDetailLayout({
  children,
  className = "",
  variant,
}: {
  children: React.ReactNode;
  className?: string;
  variant: keyof typeof sidebarDetailClasses;
}) {
  return <div className={cx(sidebarDetailClasses[variant], className)}>{children}</div>;
}

export function DetailAsideLayout({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "grid items-start gap-4 xl:grid-cols-[fit-content(22rem)_minmax(0,1fr)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ContentStack({
  as = "div",
  children,
  className = "",
}: {
  as?: "aside" | "div";
  children: React.ReactNode;
  className?: string;
}) {
  const Component = as;
  return (
    <Component className={cx("grid min-w-0 content-start gap-4", className)}>{children}</Component>
  );
}

const cardSectionTones = {
  background: "depth-flat",
  card: "depth-raised",
};

export function CardSection({
  children,
  className = "",
  tone = "card",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: keyof typeof cardSectionTones;
}) {
  return (
    <section className={cx("rounded-lg p-3", cardSectionTones[tone], className)}>
      {children}
    </section>
  );
}

export function SectionHeader({
  action,
  className = "",
  icon: Icon,
  meta,
  title,
}: {
  action?: React.ReactNode;
  className?: string;
  icon?: React.ElementType;
  meta?: React.ReactNode;
  title: React.ReactNode;
}) {
  return (
    <div className={cx("flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="flex min-w-0 items-start gap-2">
        {Icon ? (
          <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary shadow-sm">
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
        <div className="min-w-0">
          <h5 className="font-semibold leading-tight">{title}</h5>
          {meta ? (
            <span className="mt-1 block text-xs font-semibold text-muted-foreground">{meta}</span>
          ) : null}
        </div>
      </div>
      {action}
    </div>
  );
}

export * from "./surfaces";
