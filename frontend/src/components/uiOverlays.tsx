import * as Dialog from "@radix-ui/react-dialog";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import React, { type FormEvent, useState } from "react";
import { createId } from "../lib/domain/ids";
import type { AuthProvider } from "../types";
import { AuthProviderButton } from "./AuthProviderButton";
import { Button, Field, Input } from "./uiBase";

export function Sheet({
  title,
  trigger,
  children,
  open,
  onOpenChange,
}: {
  title: string;
  trigger: React.ReactNode;
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay forceMount className="dialog-overlay fixed inset-0 z-50 bg-black/45" />
        <Dialog.Content
          forceMount
          className="sheet-content fixed right-0 top-0 z-50 h-full w-full max-w-xl overflow-y-auto border-l border-border bg-card p-6 shadow-xl"
        >
          <div className="mb-6 flex items-center justify-between gap-4">
            <Dialog.Title className="text-xl font-semibold">{title}</Dialog.Title>
            <Dialog.Close className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function Modal({
  title,
  trigger,
  children,
  open,
  onOpenChange,
}: {
  title: string;
  trigger: React.ReactNode;
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay forceMount className="dialog-overlay fixed inset-0 z-50 bg-black/45" />
        <Dialog.Content
          forceMount
          className="modal-content fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100vw-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-xl"
        >
          <div className="mb-6 flex items-center justify-between gap-4">
            <Dialog.Title className="text-xl font-semibold">{title}</Dialog.Title>
            <Dialog.Close className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function ConfirmDialog({
  open,
  title,
  confirmLabel,
  children,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  confirmLabel: string;
  children: React.ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay forceMount className="dialog-overlay fixed inset-0 z-50 bg-black/45" />
        <Dialog.Content
          forceMount
          className="modal-content fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-6 shadow-xl"
        >
          <Dialog.Title className="text-xl font-semibold">{title}</Dialog.Title>
          <div className="mt-3 text-sm leading-6 text-muted-foreground">{children}</div>
          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function IconNumberField({
  icon: Icon,
  label,
  value,
  onChange,
  className = "w-36",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={["grid gap-2 text-sm font-medium", className].filter(Boolean).join(" ")}>
      <span className="flex min-h-8 items-center gap-2 leading-tight">
        <Icon className="h-4 w-4 text-accent" />
        {label}
      </span>
      <Input
        className="w-full text-center font-semibold"
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function FloatingInput({
  icon: Icon,
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  required = false,
}: {
  icon?: React.ElementType;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="group relative block min-w-0">
      {Icon && (
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary" />
      )}
      <Input
        className={[
          Icon ? "pl-9" : "",
          "peer h-12 w-full pt-5 font-medium placeholder:text-transparent",
        ].join(" ")}
        placeholder={placeholder || label}
        required={required}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <span
        className={[
          Icon ? "left-9" : "left-3",
          "pointer-events-none absolute top-1.5 text-[0.68rem] font-semibold text-muted-foreground transition peer-focus:text-primary",
        ].join(" ")}
      >
        {label}
      </span>
    </label>
  );
}

export function SlotStepper({
  level,
  value,
  onChange,
}: {
  level: number;
  value: string;
  onChange: (value: string) => void;
}) {
  const current = Number(value) || 0;
  const suffix = level === 1 ? "st" : level === 2 ? "nd" : level === 3 ? "rd" : "th";
  return (
    <div className="grid justify-items-center gap-1 rounded-lg border border-border bg-background p-2">
      <button
        className="grid h-7 w-full place-items-center rounded-md bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground"
        type="button"
        onClick={() => onChange(String(current + 1))}
      >
        <ChevronUp className="h-4 w-4" />
      </button>
      <label className="grid justify-items-center gap-1">
        <span className="text-[0.68rem] font-bold uppercase text-muted-foreground">
          {level}
          {suffix}
        </span>
        <input
          className="h-10 w-12 rounded-md border border-border bg-card text-center text-lg font-semibold outline-none ring-primary/30 focus:ring-2"
          inputMode="numeric"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
      <button
        className="grid h-7 w-full place-items-center rounded-md bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground"
        type="button"
        onClick={() => onChange(String(Math.max(0, current - 1)))}
      >
        <ChevronDown className="h-4 w-4" />
      </button>
    </div>
  );
}

export type ToastItem = {
  id: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
};

export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  function dismiss(id: string) {
    setToasts((current) => {
      const toast = current.find((item) => item.id === id);
      toast?.onDismiss?.();
      return current.filter((item) => item.id !== id);
    });
  }
  function push(
    message: string,
    options: { actionLabel?: string; onAction?: () => void; durationMs?: number } = {},
  ) {
    const id = createId();
    setToasts((current) => [
      ...current,
      { id, message, actionLabel: options.actionLabel, onAction: options.onAction },
    ]);
    window.setTimeout(() => dismiss(id), options.durationMs ?? 3200);
    return id;
  }
  return { toasts, push, dismiss };
}

export function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss?: (id: string) => void;
}) {
  return (
    <div className="fixed right-4 top-20 z-[80] grid w-[min(360px,calc(100vw-2rem))] gap-2">
      {toasts.map((toast) => (
        <div
          className="toast-item rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium shadow-xl"
          key={toast.id}
        >
          <div className="flex items-center gap-3">
            <span className="min-w-0 flex-1">{toast.message}</span>
            {toast.actionLabel && toast.onAction && (
              <button
                type="button"
                className="font-bold text-primary hover:underline"
                onClick={toast.onAction}
              >
                {toast.actionLabel}
              </button>
            )}
            {onDismiss && (
              <button
                type="button"
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => onDismiss(toast.id)}
                title="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatusPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="grid w-full gap-3 rounded-lg border border-border bg-card p-6 shadow-lg">
      <h2 className="text-2xl font-semibold">{title}</h2>
      {children}
    </div>
  );
}

export function AuthCard({
  title,
  submitLabel,
  onSubmit,
  localAuthEnabled = true,
  providers = [],
}: {
  title: string;
  submitLabel: string;
  onSubmit: (email: string, password: string) => Promise<void>;
  localAuthEnabled?: boolean;
  providers?: AuthProvider[];
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await onSubmit(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="grid w-full gap-4 rounded-lg border border-border bg-card p-6 shadow-lg"
      onSubmit={handleSubmit}
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-accent">bluDM</p>
        <h2 className="text-2xl font-semibold">{title}</h2>
      </div>
      {providers.length > 0 && (
        <div className="grid gap-2">
          {providers.map((provider) => (
            <AuthProviderButton key={provider.id} provider={provider} />
          ))}
        </div>
      )}
      {providers.length > 0 && localAuthEnabled && (
        <div className="flex items-center gap-3 text-xs font-semibold uppercase text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          Local login
          <span className="h-px flex-1 bg-border" />
        </div>
      )}
      {localAuthEnabled && (
        <>
          <Field label="Email">
            <Input
              autoComplete="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </Field>
          <Field label="Password">
            <Input
              autoComplete={title.includes("Create") ? "new-password" : "current-password"}
              minLength={12}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </Field>
        </>
      )}
      {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
      {localAuthEnabled ? (
        <Button disabled={busy} type="submit">
          {busy ? "Working..." : submitLabel}
        </Button>
      ) : (
        providers.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No sign-in providers are configured yet. Add OAuth provider settings on the server.
          </p>
        )
      )}
    </form>
  );
}
