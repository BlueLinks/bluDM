import { Image, KeyRound, Link2, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { AvatarImagePicker, avatarImageSrc } from "../components/AvatarImagePicker";
import { Button, DashboardCard, Page, PageHeader, SectionPanel } from "../components/ui";
import { api } from "../lib/api";
import type { AccountInfo, AuthProvider } from "../types";
import { DeleteAccountSettings, PasswordSettings, UnlinkProvider } from "./settingsComponents";

export function SettingsPage() {
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [providers, setProviders] = useState<AuthProvider[]>([]);
  const [error, setError] = useState(accountErrorFromURL());
  const [avatarMessage, setAvatarMessage] = useState("");

  async function load() {
    setError(accountErrorFromURL());
    try {
      const [accountPayload, providerPayload] = await Promise.all([
        api.account(),
        api.authProviders(),
      ]);
      setAccount(accountPayload);
      setProviders(providerPayload.providers);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load settings");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function saveAvatar(next: { assetId: string; url: string }) {
    setError("");
    setAvatarMessage("");
    try {
      setAccount(await api.updateAccountAvatar(next.assetId, next.url));
      setAvatarMessage(
        next.assetId || next.url ? "Account avatar saved" : "Account avatar cleared",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update account avatar");
    }
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Account"
        title="User settings"
        copy="Manage sign-in methods and review what belongs to this private workspace."
      />
      {error && (
        <p className="rounded-md border border-destructive p-3 text-sm text-destructive">{error}</p>
      )}
      {account && (
        <>
          <SectionPanel title="Profile" icon={Image}>
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-full border border-border bg-muted text-xl font-bold uppercase text-muted-foreground">
                  {avatarImageSrc(account.avatarAssetId, account.avatarUrl) ? (
                    <img
                      alt=""
                      className="h-full w-full object-cover"
                      src={avatarImageSrc(account.avatarAssetId, account.avatarUrl)}
                    />
                  ) : (
                    account.email.slice(0, 2)
                  )}
                </div>
                <div>
                  <div className="font-semibold">{account.email}</div>
                  <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
                    This avatar is used for your account menu. Uploaded images are stored as private
                    account assets and are deleted with the account.
                  </p>
                  {avatarMessage && (
                    <p className="mt-2 text-sm font-semibold text-accent">{avatarMessage}</p>
                  )}
                </div>
              </div>
              <AvatarImagePicker
                assetId={account.avatarAssetId ?? ""}
                label="Account avatar"
                name="account-avatar"
                uploadImage={(file, filename) => api.uploadImage(file, filename)}
                url={account.avatarUrl}
                onChange={(next) => void saveAvatar(next)}
              />
            </div>
          </SectionPanel>

          <div className="grid gap-4 md:grid-cols-3">
            <DashboardCard
              icon={UserRound}
              title="Campaigns"
              value={account.stats.campaigns}
              copy="Campaign workspaces owned by this account."
            />
            <DashboardCard
              icon={ShieldCheck}
              title="Player characters"
              value={account.stats.playerCharacters}
              copy="Character sheets across your campaigns."
            />
            <DashboardCard
              icon={KeyRound}
              title="Library items"
              value={account.stats.creatures + account.stats.spells + account.stats.actionTemplates}
              copy="Creatures, spells, and shared action templates."
            />
          </div>

          <SectionPanel title="Sign-in methods" icon={Link2}>
            <div className="grid gap-4">
              <div className="rounded-md border border-border bg-muted/30 p-4">
                <div className="font-semibold">{account.email}</div>
                <div className="text-sm text-muted-foreground">
                  {account.hasPassword
                    ? "This account has a local password."
                    : "This account does not have a local password yet."}
                </div>
              </div>
              <PasswordSettings account={account} onSaved={setAccount} />
              <div className="grid gap-3">
                {providers.map((provider) => {
                  const identity = account.identities.find((item) => item.provider === provider.id);
                  return (
                    <div
                      className="flex flex-col gap-3 rounded-md border border-border p-4 md:flex-row md:items-center md:justify-between"
                      key={provider.id}
                    >
                      <div>
                        <div className="font-semibold capitalize">{provider.id}</div>
                        <div className="text-sm text-muted-foreground">
                          {identity
                            ? `${identity.email} · ${identity.emailVerified ? "Verified" : "Unverified"}`
                            : "Not linked"}
                        </div>
                      </div>
                      {identity ? (
                        <UnlinkProvider
                          account={account}
                          provider={provider.id}
                          onSaved={setAccount}
                        />
                      ) : (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            window.location.href = `/api/auth/${provider.id}/link/start`;
                          }}
                        >
                          Link {provider.id}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </SectionPanel>

          <SectionPanel title="Danger zone" icon={Trash2}>
            <DeleteAccountSettings account={account} />
          </SectionPanel>
        </>
      )}
    </Page>
  );
}

function accountErrorFromURL() {
  const code = new URLSearchParams(window.location.search).get("accountError");
  if (code === "provider_already_linked") {
    return "That Google or Discord account is already linked to another bluDM account.";
  }
  if (code === "provider_link_failed") {
    return "That sign-in provider could not be linked. Try again or use a different provider account.";
  }
  return "";
}
