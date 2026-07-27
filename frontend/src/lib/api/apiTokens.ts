import { request } from "./request";

export type APIToken = {
  id: string;
  name: string;
  tokenPrefix: string;
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
};

export const apiTokenApi = {
  apiTokens: () => request<{ tokens: APIToken[] }>("/api/auth/api-tokens"),
  createAPIToken: (name: string, expiryDays: number) =>
    request<{ token: APIToken; secret: string }>("/api/auth/api-tokens", {
      method: "POST",
      body: JSON.stringify({ name, expiryDays }),
    }),
  revokeAPIToken: (tokenId: string) =>
    request<void>(`/api/auth/api-tokens/${encodeURIComponent(tokenId)}`, {
      method: "DELETE",
    }),
};
