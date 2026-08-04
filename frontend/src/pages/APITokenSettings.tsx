import { Copy, KeyRound, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ActionRow, ResponsiveGrid } from "../components/layout";
import {
  Button,
  Callout,
  ConfirmDialog,
  Field,
  Input,
  SectionPanel,
  Select,
} from "../components/ui";
import { api } from "../lib/api";
import type { APIToken } from "../lib/api/apiTokens";
import type { Campaign } from "../types";
import { APITokenAccessFields, tokenPresets } from "./APITokenAccessFields";

export function APITokenSettings() {
  const [tokens, setTokens] = useState<APIToken[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [name, setName] = useState("Codex read-only");
  const [expiryDays, setExpiryDays] = useState("90");
  const [preset, setPreset] = useState<keyof typeof tokenPresets>("read_only");
  const [scopes, setScopes] = useState<string[]>([...tokenPresets.read_only]);
  const [campaignMode, setCampaignMode] = useState<"all" | "selected">("all");
  const [campaignIds, setCampaignIds] = useState<string[]>([]);
  const [secret, setSecret] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revokeToken, setRevokeToken] = useState<APIToken | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api
      .apiTokens()
      .then((payload) => {
        if (!cancelled) setTokens(payload.tokens);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load API tokens");
        }
      });
    void api
      .campaigns()
      .then((payload) => {
        if (!cancelled) setCampaigns(payload.campaigns);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  async function createToken() {
    setBusy(true);
    setError("");
    setMessage("");
    setSecret("");
    try {
      const payload = await api.createAPIToken(name, Number(expiryDays), {
        scopes,
        campaignRestrictionMode: campaignMode,
        allowedCampaignIds: campaignMode === "selected" ? campaignIds : [],
      });
      setTokens((current) => [payload.token, ...current]);
      setSecret(payload.secret);
      setMessage("Token created. Copy it now; bluDM will not show it again.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create API token");
    } finally {
      setBusy(false);
    }
  }

  async function copySecret() {
    try {
      await navigator.clipboard.writeText(secret);
      setMessage("Token copied. Store it somewhere private.");
    } catch {
      setMessage("Copy the token manually before leaving this page.");
    }
  }

  async function confirmRevoke() {
    if (!revokeToken) return;
    setBusy(true);
    setError("");
    try {
      await api.revokeAPIToken(revokeToken.id);
      setTokens((current) => current.filter((token) => token.id !== revokeToken.id));
      setRevokeToken(null);
      setMessage("Token revoked.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not revoke API token");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SectionPanel title="AI and Vault access" icon={KeyRound}>
        <div className="grid gap-5">
          <p className="text-sm leading-6 text-muted-foreground">
            Create a revocable token for the local Markdown bridge or another trusted tool. Tokens
            can access only your account and expire automatically.
          </p>
          <ResponsiveGrid variant="form2">
            <Field label="Token name">
              <Input
                maxLength={80}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
            <Field label="Expires">
              <Select
                value={expiryDays}
                placeholder="Choose expiry"
                options={[
                  { value: "30", label: "30 days" },
                  { value: "90", label: "90 days" },
                  { value: "180", label: "180 days" },
                  { value: "365", label: "1 year" },
                ]}
                onValueChange={setExpiryDays}
              />
            </Field>
          </ResponsiveGrid>
          <APITokenAccessFields
            preset={preset}
            scopes={scopes}
            campaignMode={campaignMode}
            campaigns={campaigns}
            campaignIds={campaignIds}
            onPresetChange={setPreset}
            onScopesChange={setScopes}
            onCampaignModeChange={setCampaignMode}
            onCampaignIdsChange={setCampaignIds}
          />
          <ActionRow>
            <Button
              type="button"
              icon={Plus}
              disabled={
                busy ||
                !name.trim() ||
                scopes.length === 0 ||
                (campaignMode === "selected" && campaignIds.length === 0)
              }
              onClick={() => void createToken()}
            >
              Create token
            </Button>
          </ActionRow>
          {error && <Callout tone="danger">{error}</Callout>}
          {secret && <NewTokenSecret secret={secret} onCopy={() => void copySecret()} />}
          {message && <Callout tone={secret ? "warning" : "success"}>{message}</Callout>}
          <div className="grid gap-2">
            {tokens.length ? (
              tokens.map((token) => (
                <APITokenRow key={token.id} token={token} onRevoke={() => setRevokeToken(token)} />
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No external tools can access this account.
              </p>
            )}
          </div>
        </div>
      </SectionPanel>
      <ConfirmDialog
        open={Boolean(revokeToken)}
        title="Revoke API token?"
        confirmLabel="Revoke token"
        onCancel={() => setRevokeToken(null)}
        onConfirm={() => void confirmRevoke()}
      >
        {revokeToken?.name} will stop working immediately. Any local bridge using it will need a new
        token.
      </ConfirmDialog>
    </>
  );
}

function NewTokenSecret({ secret, onCopy }: { secret: string; onCopy: () => void }) {
  return (
    <div className="rounded-md border border-warning/35 bg-warning/10 p-4">
      <div className="text-sm font-semibold text-warning">Shown once</div>
      <code className="mt-2 block break-all rounded-md border border-border bg-background p-3 text-sm text-foreground">
        {secret}
      </code>
      <ActionRow className="mt-3">
        <Button type="button" icon={Copy} size="sm" variant="secondary" onClick={onCopy}>
          Copy token
        </Button>
      </ActionRow>
    </div>
  );
}

function APITokenRow({ token, onRevoke }: { token: APIToken; onRevoke: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-background p-3">
      <div className="min-w-0">
        <div className="font-semibold">{token.name}</div>
        <div className="mt-1 text-sm text-muted-foreground">
          <code>{token.tokenPrefix}…</code> · expires {formatTokenDate(token.expiresAt)}
          {token.lastUsedAt ? ` · last used ${formatTokenDate(token.lastUsedAt)}` : " · never used"}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {token.authenticationVersion < 2 || token.campaignRestrictionMode === "legacy_all"
            ? "Legacy token · existing bridge access only · MCP writes disabled"
            : `${token.scopes.length} capabilities · ${
                token.campaignRestrictionMode === "selected"
                  ? `${token.allowedCampaignIds.length} selected campaigns`
                  : "all campaigns"
              }`}
        </div>
        {token.authenticationVersion >= 2 && token.campaignRestrictionMode !== "legacy_all" && (
          <div className="mt-1 break-words text-xs text-muted-foreground">
            Scopes: {token.scopes.join(", ")}
          </div>
        )}
      </div>
      <Button type="button" icon={Trash2} size="sm" variant="danger" onClick={onRevoke}>
        Revoke
      </Button>
    </div>
  );
}

function formatTokenDate(value?: string) {
  if (!value) return "never";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}
