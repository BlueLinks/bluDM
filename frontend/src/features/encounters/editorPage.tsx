import { FlaskConical, MapPin, Play, ScrollText, Swords, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BackButton, Breadcrumbs } from "../../app/shell";
import { UnsavedChangesBar } from "../../components/shared/UnsavedChangesBar";
import { Button, Callout, MutedPanel, Page, ToastViewport, useToasts } from "../../components/ui";
import { api } from "../../lib/api";
import { calculateEncounterDifficulty } from "../../lib/domain/combat";
import type {
  CampaignDetail,
  Creature,
  DraftCombatant,
  Encounter,
  EncounterCombatant,
  Player,
} from "../../types";
import { CombatantEditSheet } from "./editorComponents";
import { EncounterAddCombatantDialog } from "./EncounterAddCombatantDialog";
import { EncounterDifficultyPanel } from "./EncounterDifficultyPanel";
import {
  EncounterDetailsSection,
  EncounterEditNav,
  EncounterNotesSection,
  EncounterRosterSections,
  EncounterRunningSection,
  EncounterSummaryPanel,
} from "./EncounterEditorSections";
import {
  combatantChanged,
  draftFromCreature,
  draftFromPlayer,
  encounterDirty,
  encounterMetaChanged,
} from "./domain";
import "../campaigns/world/campaignWorldExperience.scss";

export function EncounterEditPage() {
  const { campaignID, encounterID } = useParams();
  const navigate = useNavigate();
  const toast = useToasts();
  const [detail, setDetail] = useState<CampaignDetail | null>(null);
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [encounterMeta, setEncounterMeta] = useState({
    name: "",
    description: "",
    status: "planned",
    location: "",
    locationId: "",
    roomNumber: "",
  });
  const [savedCombatants, setSavedCombatants] = useState<EncounterCombatant[]>([]);
  const [draftCombatants, setDraftCombatants] = useState<DraftCombatant[]>([]);
  const [creatures, setCreatures] = useState<Creature[]>([]);
  const [creatureSources, setCreatureSources] = useState(["srd-2014"]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<DraftCombatant | null>(null);
  const [addMode, setAddMode] = useState<"ally" | "enemy" | null>(null);
  const [saving, setSaving] = useState(false);
  const combatants = draftCombatants;
  const playerCombatants = combatants.filter((combatant) => combatant.side === "player");
  const friendlyCombatants = combatants.filter((combatant) => combatant.side === "friendly");
  const enemyCombatants = combatants.filter((combatant) => combatant.side === "enemy");
  const addedPlayerIds = new Set(
    playerCombatants.map((combatant) => combatant.playerId).filter(Boolean),
  );
  const availablePlayers = (detail?.players ?? []).filter(
    (player) => !addedPlayerIds.has(player.id),
  );
  const campaignCreatureIds = new Set((detail?.npcs ?? []).map((creature) => creature.id));
  const campaignSources = detail?.campaign.allowedStandardSources?.length
    ? detail.campaign.allowedStandardSources
    : ["srd-2014"];
  const hasCreatureSourceMismatch =
    Boolean(detail) && creatureSources.some((source) => !campaignSources.includes(source));
  const difficulty = useMemo(
    () => calculateEncounterDifficulty(detail?.players ?? [], enemyCombatants),
    [detail?.players, enemyCombatants],
  );

  async function load() {
    if (!campaignID || !encounterID) return;
    setLoading(true);
    setError("");
    try {
      const [campaignPayload, encounterPayload] = await Promise.all([
        api.campaign(campaignID),
        api.encounter(encounterID),
      ]);
      const allowedSources = campaignPayload.campaign.allowedStandardSources?.length
        ? campaignPayload.campaign.allowedStandardSources
        : ["srd-2014"];
      const creaturePayload = await api.creatures({
        includeStandard: true,
        source: allowedSources,
      });
      setCreatureSources(allowedSources);
      setDetail(campaignPayload);
      setEncounter(encounterPayload.encounter);
      setEncounterMeta({
        name: encounterPayload.encounter.name,
        description: encounterPayload.encounter.description,
        status: encounterPayload.encounter.status,
        location: encounterPayload.encounter.location,
        locationId: encounterPayload.encounter.locationId ?? "",
        roomNumber: encounterPayload.encounter.roomNumber,
      });
      setSavedCombatants(encounterPayload.encounter.combatants ?? []);
      setDraftCombatants(encounterPayload.encounter.combatants ?? []);
      setCreatures(creaturePayload.creatures);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load encounter");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [campaignID, encounterID]);

  useEffect(() => {
    if (!detail) return;
    api
      .creatures({ includeStandard: true, source: creatureSources })
      .then((payload) => setCreatures(payload.creatures))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load creatures"));
  }, [detail?.campaign.id, creatureSources.join(",")]);

  function addAllPlayers() {
    if (!encounter || availablePlayers.length === 0) return;
    setDraftCombatants((current) => [
      ...current,
      ...availablePlayers.map((player) => draftFromPlayer(encounter.id, player)),
    ]);
    toast.push("Party staged for encounter");
  }

  function addPlayer(player: Player) {
    if (!encounter) return;
    setDraftCombatants((current) => [...current, draftFromPlayer(encounter.id, player)]);
    toast.push(`${player.characterName} staged`);
  }

  function addCreature(
    creature: Creature,
    side: "friendly" | "enemy",
    quantity: number,
    rolledHp: boolean,
  ) {
    if (!encounter) return;
    const count = Math.max(1, quantity || 1);
    setDraftCombatants((current) => [
      ...current,
      ...Array.from({ length: count }, (_, index) =>
        draftFromCreature(encounter.id, creature, side, rolledHp, index, count),
      ),
    ]);
    toast.push(`${creature.name} staged`);
  }

  function saveCombatant(combatant: DraftCombatant) {
    setDraftCombatants((current) =>
      current.map((item) => (item.id === combatant.id ? combatant : item)),
    );
    toast.push(`${combatant.displayName} staged`);
    setEditing(null);
  }

  function removeCombatant(combatant: EncounterCombatant) {
    setDraftCombatants((current) => current.filter((item) => item.id !== combatant.id));
    toast.push(`${combatant.displayName} removed from draft`);
  }

  function revertEncounterChanges() {
    setDraftCombatants(savedCombatants);
    if (encounter) {
      setEncounterMeta({
        name: encounter.name,
        description: encounter.description,
        status: encounter.status,
        location: encounter.location,
        locationId: encounter.locationId ?? "",
        roomNumber: encounter.roomNumber,
      });
    }
    setEditing(null);
    toast.push("Encounter changes reverted");
  }

  async function saveEncounterChanges() {
    if (!encounter) return false;
    setSaving(true);
    setError("");
    try {
      const draftByID = new Map(
        draftCombatants
          .filter((combatant) => !combatant.pendingAdd)
          .map((combatant) => [combatant.id, combatant]),
      );
      const savedByID = new Map(savedCombatants.map((combatant) => [combatant.id, combatant]));
      const removals = savedCombatants.filter((combatant) => !draftByID.has(combatant.id));
      const updates = draftCombatants.filter(
        (combatant) =>
          !combatant.pendingAdd && combatantChanged(savedByID.get(combatant.id), combatant),
      );
      const additions = draftCombatants.filter((combatant) => combatant.pendingAdd);
      if (encounterMetaChanged(encounter, encounterMeta)) {
        await api.updateEncounter(encounter.id, encounterMeta);
      }
      for (const combatant of removals) {
        await api.deleteEncounterCombatant(combatant.id);
      }
      for (const combatant of updates) {
        await api.updateEncounterCombatant(combatant);
      }
      for (const combatant of additions) {
        const pending = combatant.pendingAdd;
        if (!pending) continue;
        await api.addEncounterCombatants(encounter.id, {
          sourceType: pending.sourceType,
          playerId: pending.playerId,
          creatureId: pending.creatureId,
          standardCreatureId: pending.standardCreatureId,
          side: combatant.side,
          displayName: combatant.displayName,
          colorLabel: combatant.colorLabel,
          avatarUrl: combatant.avatarUrl,
          armorClass: combatant.armorClass,
          maxHitPoints: combatant.maxHitPoints,
          currentHitPoints: combatant.currentHitPoints,
          rolledHp: pending.rolledHp,
        });
      }
      toast.push("Encounter changes saved");
      await load();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save encounter changes");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function saveAndStart(test: boolean) {
    if (!encounter) return;
    const saved = dirty ? await saveEncounterChanges() : true;
    if (!saved) return;
    try {
      const payload = await api.startEncounter(encounter.id, test);
      toast.push(test ? "Test run snapshot created" : "Encounter run snapshot created");
      setError("");
      void navigate(`/encounter-runs/${payload.run.id}/initiative`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start test run");
    }
  }

  const dirty =
    encounterDirty(savedCombatants, draftCombatants) ||
    encounterMetaChanged(encounter, encounterMeta);

  if (loading) {
    return <MutedPanel>Loading encounter builder...</MutedPanel>;
  }
  if (!detail || !encounter) {
    return (
      <Page>
        <Callout tone="danger">{error || "Encounter not found"}</Callout>
        <Button
          type="button"
          variant="secondary"
          onClick={() => void navigate(`/campaigns/${campaignID}`)}
        >
          Back to campaign
        </Button>
      </Page>
    );
  }

  return (
    <div className={dirty ? "pb-28" : ""}>
      <Page className="campaign-world-experience px-3 py-3 md:px-4 md:py-4 2xl:px-5" size="full">
        <ToastViewport toasts={toast.toasts} onDismiss={toast.dismiss} />
        <BackButton to={`/campaigns/${detail.campaign.id}`}>Back to campaign</BackButton>
        <Breadcrumbs
          items={[
            { label: "Campaigns", to: "/campaigns" },
            { label: detail.campaign.name, to: `/campaigns/${detail.campaign.id}` },
            { label: encounter.name },
            { label: "Edit" },
          ]}
        />
        <section className="rounded-md border border-border bg-card p-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(28rem,0.9fr)] xl:items-start">
            <div className="flex min-w-0 items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-md border border-destructive/25 bg-destructive/10 text-destructive">
                <Swords className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold tracking-tight [overflow-wrap:anywhere]">
                  {encounterMeta.name || encounter.name}
                </h1>
                <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {encounterMeta.location || "No location"}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <UsersRound className="h-4 w-4" />
                    {playerCombatants.length} party
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <ScrollText className="h-4 w-4" />
                    {encounterMeta.status}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap justify-start gap-2 xl:justify-end">
              <Button
                type="button"
                icon={Play}
                disabled={saving}
                onClick={() => void saveAndStart(false)}
              >
                {saving ? "Saving..." : "Run encounter"}
              </Button>
              <Button
                type="button"
                icon={FlaskConical}
                variant="tertiary"
                disabled={saving}
                onClick={() => void saveAndStart(true)}
              >
                Test
              </Button>
            </div>
          </div>
        </section>
        {error && <Callout tone="danger">{error}</Callout>}
        {hasCreatureSourceMismatch ? (
          <Callout>
            This encounter belongs to {detail.campaign.name}, but your current creature browse
            filters include sources outside the campaign set.
          </Callout>
        ) : null}
        <EncounterDifficultyPanel difficulty={difficulty} />
        <EncounterEditNav />
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)]">
          <EncounterRosterSections
            availablePlayers={availablePlayers}
            enemyCombatants={enemyCombatants}
            friendlyCombatants={friendlyCombatants}
            playerCombatants={playerCombatants}
            onAddAllPlayers={() => void addAllPlayers()}
            onAddAlly={() => setAddMode("ally")}
            onAddEnemy={() => setAddMode("enemy")}
            onAddPlayer={(player) => void addPlayer(player)}
            onEdit={setEditing}
            onRemove={removeCombatant}
          />
          <div className="grid content-start gap-4">
            <EncounterSummaryPanel
              createdAt={encounter.createdAt}
              enemyCount={enemyCombatants.length}
              meta={encounterMeta}
              partyCount={playerCombatants.length}
            />
            <EncounterDetailsSection meta={encounterMeta} onChange={setEncounterMeta} />
            <EncounterNotesSection meta={encounterMeta} onChange={setEncounterMeta} />
            <EncounterRunningSection
              saving={saving}
              onSaveAndRun={() => void saveAndStart(false)}
              onSaveAndTest={() => void saveAndStart(true)}
            />
          </div>
        </div>
        <EncounterAddCombatantDialog
          campaignCreatureIds={campaignCreatureIds}
          creatures={creatures}
          mode={addMode ?? "enemy"}
          npcs={detail.npcs}
          open={Boolean(addMode)}
          onAddCreature={addCreature}
          onOpenChange={(open) => !open && setAddMode(null)}
        />
        <CombatantEditSheet
          combatant={editing}
          onOpenChange={(open) => !open && setEditing(null)}
          onSave={saveCombatant}
          onRemove={removeCombatant}
        />
        {dirty && (
          <UnsavedChangesBar
            title="Unsaved encounter changes"
            copy="Save to persist this roster, or revert to the last saved encounter."
            saving={saving}
            onRevert={revertEncounterChanges}
            onSave={() => void saveEncounterChanges()}
          />
        )}
      </Page>
    </div>
  );
}
