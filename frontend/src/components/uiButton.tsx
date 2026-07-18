import type React from "react";

export function Button({
  children,
  icon: Icon,
  variant = "primary",
  size = "md",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: React.ElementType;
  variant?:
    | "primary"
    | "secondary"
    | "tertiary"
    | "outline"
    | "ghost"
    | "info"
    | "success"
    | "warning"
    | "danger";
  size?: "sm" | "md";
}) {
  const variants = {
    primary:
      "border-transparent bg-primary text-primary-foreground shadow-[0_1px_0_hsl(0_0%_100%/0.18),0_12px_24px_hsl(var(--primary)/0.22)] hover:bg-primary/95 hover:text-primary-foreground hover:shadow-[0_1px_0_hsl(0_0%_100%/0.18),0_16px_30px_hsl(var(--primary)/0.28)] active:bg-primary/90 active:text-primary-foreground active:shadow-none",
    secondary:
      "border-transparent bg-secondary text-secondary-foreground shadow-[0_1px_0_hsl(0_0%_100%/0.14),0_10px_20px_hsl(var(--secondary)/0.2)] hover:bg-secondary/95 hover:text-secondary-foreground hover:shadow-[0_1px_0_hsl(0_0%_100%/0.14),0_14px_26px_hsl(var(--secondary)/0.25)] active:bg-secondary/90 active:text-secondary-foreground active:shadow-none",
    tertiary:
      "border-transparent bg-tertiary text-tertiary-foreground shadow-[0_1px_0_hsl(0_0%_100%/0.14),0_10px_20px_hsl(var(--tertiary)/0.2)] hover:bg-tertiary/95 hover:text-tertiary-foreground hover:shadow-[0_1px_0_hsl(0_0%_100%/0.14),0_14px_26px_hsl(var(--tertiary)/0.25)] active:bg-tertiary/90 active:text-tertiary-foreground active:shadow-none",
    outline:
      "border-border bg-background text-foreground shadow-sm hover:border-primary/35 hover:bg-surface hover:text-surface-foreground active:bg-surface/80 active:text-surface-foreground active:shadow-none",
    ghost:
      "border-transparent bg-transparent text-surface-foreground hover:border-border hover:bg-surface hover:text-foreground active:bg-surface/80 active:text-surface-foreground active:shadow-none",
    info: "border-transparent bg-info text-info-foreground shadow-[0_1px_0_hsl(0_0%_100%/0.14),0_12px_24px_hsl(var(--info)/0.2)] hover:bg-info/95 hover:text-info-foreground active:bg-info/90 active:text-info-foreground active:shadow-none",
    success:
      "border-transparent bg-success text-success-foreground shadow-[0_1px_0_hsl(0_0%_100%/0.14),0_12px_24px_hsl(var(--success)/0.2)] hover:bg-success/95 hover:text-success-foreground active:bg-success/90 active:text-success-foreground active:shadow-none",
    warning:
      "border-transparent bg-warning text-warning-foreground shadow-[0_1px_0_hsl(0_0%_100%/0.14),0_12px_24px_hsl(var(--warning)/0.2)] hover:bg-warning/95 hover:text-warning-foreground active:bg-warning/90 active:text-warning-foreground active:shadow-none",
    danger:
      "border-transparent bg-destructive text-destructive-foreground shadow-[0_1px_0_hsl(0_0%_100%/0.14),0_12px_24px_hsl(var(--destructive)/0.2)] hover:bg-destructive/95 hover:text-destructive-foreground active:bg-destructive/90 active:text-destructive-foreground active:shadow-none",
  };
  const sizes = {
    sm: "px-2.5 py-1.5 text-xs",
    md: "px-3 py-2 text-sm",
  };
  return (
    <button
      {...props}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-lg border font-medium transition active:translate-y-px disabled:cursor-not-allowed disabled:border-border disabled:bg-surface/75 disabled:text-muted-foreground disabled:shadow-none disabled:transform-none disabled:opacity-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-0",
        variants[variant],
        sizes[size],
        props.className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </button>
  );
}
