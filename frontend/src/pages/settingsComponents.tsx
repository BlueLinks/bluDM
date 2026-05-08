import { Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "../components/ui";
import { api } from "../lib/api";
import type { AccountInfo } from "../types";

export function PasswordSettings({
  account,
  onSaved,
}: {
  account: AccountInfo;
  onSaved: (account: AccountInfo) => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      onSaved(await api.setPassword(currentPassword, newPassword));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Password saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="grid gap-3 rounded-md border border-border p-4"
      onSubmit={(event) => void submit(event)}
    >
      <div>
        <h3 className="font-semibold">
          {account.hasPassword ? "Change password" : "Set password"}
        </h3>
        <p className="text-sm text-muted-foreground">
          {account.hasPassword
            ? "Enter your current password before changing it."
            : "Set a local password as a fallback sign-in method."}
        </p>
      </div>
      {account.hasPassword && (
        <PasswordInput
          label="Current password"
          value={currentPassword}
          onChange={setCurrentPassword}
        />
      )}
      <div className="grid gap-3 md:grid-cols-2">
        <PasswordInput label="New password" value={newPassword} onChange={setNewPassword} />
        <PasswordInput
          label="Confirm new password"
          value={confirmPassword}
          onChange={setConfirmPassword}
        />
      </div>
      {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
      {message && <p className="text-sm font-semibold text-accent">{message}</p>}
      <div>
        <Button
          disabled={busy || newPassword.length < 12 || newPassword !== confirmPassword}
          type="submit"
        >
          {busy ? "Saving..." : "Save password"}
        </Button>
      </div>
    </form>
  );
}

export function UnlinkProvider({
  account,
  provider,
  onSaved,
}: {
  account: AccountInfo;
  provider: string;
  onSaved: (account: AccountInfo) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function unlink() {
    setError("");
    setBusy(true);
    try {
      onSaved(await api.unlinkIdentity(provider, password));
      setConfirming(false);
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not unlink account");
    } finally {
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <Button type="button" variant="danger" icon={Trash2} onClick={() => setConfirming(true)}>
        Unlink
      </Button>
    );
  }

  return (
    <div className="grid gap-2 md:w-72">
      {account.hasPassword && (
        <PasswordInput label="Current password" value={password} onChange={setPassword} />
      )}
      {error && <p className="text-xs font-semibold text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={() => setConfirming(false)}>
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          variant="danger"
          disabled={busy}
          onClick={() => void unlink()}
        >
          {busy ? "Unlinking..." : "Confirm unlink"}
        </Button>
      </div>
    </div>
  );
}

function PasswordInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <input
        className="rounded-md border border-border bg-background px-3 py-2"
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
