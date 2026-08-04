import { request } from "./request";

export type APIToken = {
  id: string;
  name: string;
  tokenPrefix: string;
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
  scopes: string[];
  campaignRestrictionMode: "all" | "selected" | "legacy_all";
  allowedCampaignIds: string[];
  authenticationVersion: number;
  revokedAt?: string;
};

export type APITokenPermissions = {
  scopes: string[];
  campaignRestrictionMode: "all" | "selected";
  allowedCampaignIds: string[];
};

export const apiTokenApi = {
  apiTokens: () => request<{ tokens: APIToken[] }>("/api/auth/api-tokens"),
  createAPIToken: (name: string, expiryDays: number, permissions?: APITokenPermissions) =>
    request<{ token: APIToken; secret: string }>("/api/auth/api-tokens", {
      method: "POST",
      body: JSON.stringify({ name, expiryDays, ...permissions }),
    }),
  revokeAPIToken: (tokenId: string) =>
    request<void>(`/api/auth/api-tokens/${encodeURIComponent(tokenId)}`, {
      method: "DELETE",
    }),
};
