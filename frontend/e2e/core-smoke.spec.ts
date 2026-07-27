import { expect, test, type Page } from "@playwright/test";

const email = process.env.E2E_ADMIN_EMAIL ?? "e2e-dm@example.test";
const password = process.env.E2E_ADMIN_PASSWORD ?? "e2e-admin-password-123";

test.describe.configure({ mode: "serial" });

test("core bluDM browser journeys", async ({ page }) => {
  await expectHealthAndBrowserCapabilities(page);
  await signInOrCreateFirstAccount(page);

  const campaignID = await seedDemoCampaign(page);
  const detail = await getJSON<CampaignDetailResponse>(page, `/api/campaigns/${campaignID}`);
  const encounter = detail.encounters.find((item) => item.name === "Roadside Trouble");
  expect(encounter, "seeded demo encounter should exist").toBeTruthy();
  const player = detail.players[0];
  const npc = detail.npcs[0];
  expect(player, "seeded demo player should exist").toBeTruthy();
  expect(npc, "seeded demo NPC should exist").toBeTruthy();

  await page.goto("/campaigns");
  await expect(page.getByRole("heading", { name: "Choose the table" })).toBeVisible();
  await expect(page.getByText("Demo: Greenhill Ambush", { exact: true })).toBeVisible();

  await page.goto(`/campaigns/${campaignID}`);
  await expect(page.getByRole("heading", { name: "Demo: Greenhill Ambush" })).toBeVisible();
  await expect(page.getByText("Roadside Trouble")).toBeVisible();

  await page.goto(`/players/${player.id}/edit`);
  await expect(page.getByRole("heading", { name: `Edit ${player.characterName}` })).toBeVisible();
  await expect(page.getByLabel("Character Name")).toHaveValue(player.characterName);

  await page.goto("/npcs");
  await expect(page.getByRole("heading", { name: "Creature library" })).toBeVisible();
  await expect(page.getByRole("heading", { name: npc.name, exact: true })).toBeVisible();

  await page.goto(`/npcs/${npc.id}/edit`);
  await expect(page.getByRole("heading", { name: `Edit ${npc.name}` })).toBeVisible();

  await page.goto("/spells");
  await expect(page.getByRole("heading", { name: "Spell library" })).toBeVisible();
  await expect(page.getByLabel("Search spells")).toBeVisible();

  await page.goto(`/campaigns/${campaignID}/encounters/${encounter!.id}/edit`);
  await expect(page.getByRole("heading", { name: "Roadside Trouble" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Difficulty" })).toBeVisible();

  const runID = await startEncounterRun(page, encounter!.id);
  await page.goto(`/encounter-runs/${runID}/initiative`);
  await expect(page.getByRole("heading", { name: "Set initiative" })).toBeVisible();
  for (const [index, partyMember] of detail.players.entries()) {
    const input = page.getByLabel(`${partyMember.characterName} initiative`);
    await input.fill(String(15 - index));
    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().endsWith(`/api/encounter-runs/${runID}/commands/set-initiative`) &&
          response.ok(),
      ),
      input.press("Enter"),
    ]);
  }
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().endsWith(`/api/encounter-runs/${runID}/commands/roll-initiative`) &&
        response.ok(),
    ),
    page.getByRole("button", { name: "Roll NPCs & allies" }).click(),
  ]);
  const beginCombat = page.getByRole("button", { name: "Begin Combat" });
  await expect(beginCombat).toBeEnabled();
  await beginCombat.click();
  await expect.poll(() => new URL(page.url()).pathname).toBe(`/encounter-runs/${runID}`);
  await expect(page.getByRole("button", { name: "Finish Combat" })).toBeVisible();

  await page.goto(`/encounter-runs/${runID}/summary`);
  await expect(page.getByRole("heading", { name: "XP and loot" })).toBeVisible();
  await page.getByPlaceholder("Loot note or item").fill("Smoke-test silver ring");
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.getByText("Smoke-test silver ring")).toBeVisible();
});

test("production SPA fallback serves deep links", async ({ page }) => {
  await page.goto("/encounter-runs/smoke-missing-run/summary");
  await expect(page.locator("#root")).toBeVisible();
  await expect(page).toHaveTitle(/bluDM/);
});

async function expectHealthAndBrowserCapabilities(page: Page) {
  await expect((await page.request.get("/health")).status()).toBe(200);
  await expect((await page.request.get("/api/health")).status()).toBe(200);
  await page.goto("/");
  await expect(
    page.evaluate(() => ({
      cryptoRandomUUID: typeof crypto.randomUUID === "function",
      cryptoValues: typeof crypto.getRandomValues === "function",
      secureContext: window.isSecureContext,
    })),
  ).resolves.toEqual({
    cryptoRandomUUID: true,
    cryptoValues: true,
    secureContext: true,
  });
}

async function signInOrCreateFirstAccount(page: Page) {
  const status = await getJSON<AuthStatus>(page, "/api/auth/status");
  await page.goto("/");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page
    .getByRole("button", { name: status.setupRequired ? "Create account" : "Sign in" })
    .click();
  await expect(page.getByRole("heading", { name: "Choose the table" })).toBeVisible();
}

async function seedDemoCampaign(page: Page) {
  const response = await page.request.post("/api/dev/seed-test-data");
  expect(response.status()).toBe(201);
  const body = (await response.json()) as { campaignId: string };
  expect(body.campaignId).toBeTruthy();
  return body.campaignId;
}

async function startEncounterRun(page: Page, encounterID: string) {
  const response = await page.request.post(`/api/encounters/${encounterID}/start`, {
    data: { test: true },
  });
  expect(response.status()).toBe(201);
  const body = (await response.json()) as { run: { id: string } };
  expect(body.run.id).toBeTruthy();
  return body.run.id;
}

async function getJSON<T>(page: Page, path: string) {
  const response = await page.request.get(path);
  expect(response.ok()).toBe(true);
  return (await response.json()) as T;
}

type AuthStatus = {
  setupRequired: boolean;
};

type CampaignDetailResponse = {
  campaign: { id: string; name: string };
  encounters: Array<{ id: string; name: string }>;
  npcs: Array<{ id: string; name: string }>;
  players: Array<{ id: string; characterName: string }>;
};
