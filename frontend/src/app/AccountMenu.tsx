import { KeyRound, UserRound } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { avatarImageSrc } from "../components/AvatarImagePicker";
import { Button } from "../components/ui";
import type { AccountInfo, User } from "../types";

type AccountMenuProps = {
  user?: User;
  onLogout: () => Promise<void>;
  onLoadAccount: () => Promise<AccountInfo>;
  onSetPassword: (currentPassword: string, newPassword: string) => Promise<AccountInfo>;
};

export function AccountMenu({ user, onLogout, onLoadAccount, onSetPassword }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [accountError, setAccountError] = useState("");
  const [passwordOpen, setPasswordOpen] = useState(false);
  const avatarSrc = avatarImageSrc(
    account?.avatarAssetId ?? user?.avatarAssetId,
    account?.avatarUrl ?? user?.avatarUrl,
  );

  useEffect(() => {
    if (!open) return;
    setAccountError("");
    void onLoadAccount()
      .then(setAccount)
      .catch((err: unknown) => {
        setAccountError(err instanceof Error ? err.message : "Could not load account details");
      });
  }, [onLoadAccount, open]);

  return (
    <div className="relative">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        icon={UserRound}
        onClick={() => setOpen((current) => !current)}
      >
        Account
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-lg border border-border bg-card p-3 text-sm shadow-xl">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-border bg-muted text-sm font-bold uppercase text-muted-foreground">
              {avatarSrc ? (
                <img alt="" className="h-full w-full object-cover" src={avatarSrc} />
              ) : (
                (user?.email ?? "DM").slice(0, 2)
              )}
            </div>
            <div className="min-w-0">
              <div className="truncate font-semibold">{user?.email ?? "DM"}</div>
              <div className="text-xs text-muted-foreground">Private DM workspace</div>
            </div>
          </div>
          {accountError && (
            <p className="mt-2 text-xs font-semibold text-destructive">{accountError}</p>
          )}
          {account && (
            <div className="mt-3 grid gap-2 rounded-md border border-border bg-muted/30 p-3 text-xs">
              <div className="font-semibold text-foreground">
                {account.hasPassword ? "Local password enabled" : "No local password set"}
              </div>
              {account.identities.length > 0 && (
                <div className="grid gap-1 text-muted-foreground">
                  {account.identities.map((identity) => (
                    <div
                      className="flex items-center justify-between gap-2"
                      key={identity.provider}
                    >
                      <span className="capitalize">{identity.provider}</span>
                      <span>{identity.emailVerified ? "Verified" : "Unverified"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <Button
            className="mt-3 w-full"
            icon={KeyRound}
            variant="secondary"
            onClick={() => setPasswordOpen(true)}
          >
            {account?.hasPassword ? "Change password" : "Set password"}
          </Button>
          <Button className="mt-2 w-full" variant="ghost" onClick={() => void onLogout()}>
            Log out
          </Button>
          <Link
            className="mt-2 block rounded-md px-3 py-2 text-center text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
            to="/settings"
            onClick={() => setOpen(false)}
          >
            User settings
          </Link>
        </div>
      )}
      {passwordOpen && (
        <PasswordDialog
          account={account}
          onClose={() => setPasswordOpen(false)}
          onSaved={(nextAccount) => {
            setAccount(nextAccount);
            setPasswordOpen(false);
          }}
          onSetPassword={onSetPassword}
        />
      )}
    </div>
  );
}

function PasswordDialog({
  account,
  onClose,
  onSaved,
  onSetPassword,
}: {
  account: AccountInfo | null;
  onClose: () => void;
  onSaved: (account: AccountInfo) => void;
  onSetPassword: (currentPassword: string, newPassword: string) => Promise<AccountInfo>;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const hasPassword = account?.hasPassword ?? false;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      onSaved(await onSetPassword(currentPassword, newPassword));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/45 px-4">
      <form
        className="modal-content grid w-full max-w-lg gap-4 rounded-lg border border-border bg-card p-6 shadow-xl"
        data-state="open"
        onSubmit={(event) => void submit(event)}
      >
        <div>
          <h2 className="text-xl font-semibold">
            {hasPassword ? "Change password" : "Set password"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {hasPassword
              ? "Update the local password for this account."
              : "Add a local password so this OAuth account can also sign in with email and password."}
          </p>
        </div>
        {hasPassword && (
          <PasswordField
            label="Current password"
            value={currentPassword}
            onChange={setCurrentPassword}
          />
        )}
        <PasswordField label="New password" value={newPassword} onChange={setNewPassword} />
        <PasswordField
          label="Confirm new password"
          value={confirmPassword}
          onChange={setConfirmPassword}
        />
        {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={busy || newPassword.length < 12 || newPassword !== confirmPassword}
            type="submit"
          >
            {busy ? "Saving..." : "Save password"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function PasswordField({
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
        autoComplete="new-password"
        className="rounded-md border border-border bg-background px-3 py-2"
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
