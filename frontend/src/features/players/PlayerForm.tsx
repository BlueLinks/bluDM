import { Sparkles } from "lucide-react";
import { type Dispatch, type FormEvent, type SetStateAction, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AbilitySelect,
  ConditionImmunityChecklist,
  DamageDefenseGroup,
  SenseControl,
} from "../../components/shared/CharacterFormControls";
import { CompactAbilityTable, SkillsTable } from "../../components/shared/CharacterSheetTables";
import { Button, Field, FormSection, IconNumberField, Textarea } from "../../components/ui";
import { api } from "../../lib/api";
import { proficiencyBonus } from "../../lib/domain/forms";
import { abilities, senseTypes } from "../../lib/domain/options";
import { effectiveCharacterLevel } from "../../lib/domain/progression";
import type { Campaign, Player, PlayerFormState } from "../../types";
import { PlayerBasicsSection } from "./PlayerBasicsSection";
import { PlayerSpellSlotsSection } from "./PlayerSpellSlotsSection";
import { PlayerVitalsSection } from "./PlayerVitalsSection";
import { UnsavedPlayerNavigationDialog } from "./UnsavedPlayerNavigationDialog";

const emptyPlayerForm: PlayerFormState = {
  campaignId: "",
  avatarAssetId: "",
  avatarUrl: "",
  characterName: "",
  playerName: "",
  className: "",
  level: "",
  experiencePoints: "0",
  species: "",
  background: "",
  feats: [],
  speed: "30",
  armorClass: "10",
  maxHitPoints: "1",
  temporaryHitPoints: "0",
  temporaryMaxHitPoints: "0",
  passivePerception: "10",
  passiveInvestigation: "10",
  passiveInsight: "10",
  spellSaveDC: "10",
  abilityScores: {
    str: "10",
    dex: "10",
    con: "10",
    int: "10",
    wis: "10",
    cha: "10",
  },
  savingThrowProficiencies: [],
  skillProficiencies: [],
  skillExpertise: [],
  damageVulnerabilities: [],
  damageResistances: [],
  damageImmunities: [],
  conditionImmunities: [],
  senses: {
    Blindsight: { enabled: false, range: "" },
    Darkvision: { enabled: false, range: "" },
    Tremorsense: { enabled: false, range: "" },
    Truesight: { enabled: false, range: "" },
  },
  spellcastingAbility: "",
  innateSpellcastingAbility: "",
  spellSlots1: "0",
  spellSlots2: "0",
  spellSlots3: "0",
  spellSlots4: "0",
  spellSlots5: "0",
  spellSlots6: "0",
  spellSlots7: "0",
  spellSlots8: "0",
  spellSlots9: "0",
  spellSlotsRemaining1: "0",
  spellSlotsRemaining2: "0",
  spellSlotsRemaining3: "0",
  spellSlotsRemaining4: "0",
  spellSlotsRemaining5: "0",
  spellSlotsRemaining6: "0",
  spellSlotsRemaining7: "0",
  spellSlotsRemaining8: "0",
  spellSlotsRemaining9: "0",
  notes: "",
};

function slotValue(source: unknown, level: number, fallback = "0") {
  if (!source || typeof source !== "object") return fallback;
  const value = (source as Record<string, unknown>)[String(level)];
  return String(typeof value === "number" || typeof value === "string" ? value : fallback);
}

function playerFormFromPlayer(player: Player): PlayerFormState {
  const sheet = player.characterSheet;
  const abilityScores =
    sheet.abilityScores && typeof sheet.abilityScores === "object"
      ? (sheet.abilityScores as Record<string, unknown>)
      : {};
  const senses =
    sheet.senses && typeof sheet.senses === "object"
      ? (sheet.senses as PlayerFormState["senses"])
      : emptyPlayerForm.senses;
  const list = (key: string) =>
    Array.isArray(sheet[key])
      ? sheet[key].filter((item): item is string => typeof item === "string")
      : [];
  const spellSlots = sheet.spellSlots;
  const remainingSlots = sheet.spellSlotsRemaining;
  return {
    ...emptyPlayerForm,
    campaignId: player.campaignId,
    avatarAssetId: player.avatarAssetId ?? "",
    avatarUrl: player.avatarUrl ?? "",
    characterName: player.characterName,
    playerName: player.playerName,
    armorClass: String(player.armorClass),
    maxHitPoints: String(player.maxHitPoints),
    temporaryHitPoints: String(player.temporaryHitPoints),
    temporaryMaxHitPoints: String(player.temporaryMaxHitPoints),
    className: typeof sheet.className === "string" ? sheet.className : "",
    level:
      typeof sheet.levelOverride === "number"
        ? String(sheet.levelOverride)
        : typeof sheet.levelOverride === "string"
          ? sheet.levelOverride
          : "",
    experiencePoints: String(player.experiencePoints ?? 0),
    species: typeof sheet.species === "string" ? sheet.species : "",
    background: typeof sheet.background === "string" ? sheet.background : "",
    feats: list("feats"),
    speed: String(typeof sheet.speed === "number" ? sheet.speed : 30),
    passivePerception: String(
      typeof sheet.passivePerception === "number" ? sheet.passivePerception : 10,
    ),
    passiveInvestigation: String(
      typeof sheet.passiveInvestigation === "number" ? sheet.passiveInvestigation : 10,
    ),
    passiveInsight: String(typeof sheet.passiveInsight === "number" ? sheet.passiveInsight : 10),
    spellSaveDC: String(typeof sheet.spellSaveDC === "number" ? sheet.spellSaveDC : 10),
    abilityScores: Object.fromEntries(
      abilities.map((ability) => [
        ability.key,
        String(typeof abilityScores[ability.key] === "number" ? abilityScores[ability.key] : 10),
      ]),
    ) as PlayerFormState["abilityScores"],
    savingThrowProficiencies: list("savingThrowProficiencies"),
    skillProficiencies: list("skillProficiencies"),
    skillExpertise: list("skillExpertise"),
    damageVulnerabilities: list("damageVulnerabilities"),
    damageResistances: list("damageResistances"),
    damageImmunities: list("damageImmunities"),
    conditionImmunities: list("conditionImmunities"),
    senses,
    spellcastingAbility:
      typeof sheet.spellcastingAbility === "string" ? sheet.spellcastingAbility : "",
    innateSpellcastingAbility:
      typeof sheet.innateSpellcastingAbility === "string" ? sheet.innateSpellcastingAbility : "",
    spellSlots1: slotValue(spellSlots, 1),
    spellSlots2: slotValue(spellSlots, 2),
    spellSlots3: slotValue(spellSlots, 3),
    spellSlots4: slotValue(spellSlots, 4),
    spellSlots5: slotValue(spellSlots, 5),
    spellSlots6: slotValue(spellSlots, 6),
    spellSlots7: slotValue(spellSlots, 7),
    spellSlots8: slotValue(spellSlots, 8),
    spellSlots9: slotValue(spellSlots, 9),
    spellSlotsRemaining1: slotValue(remainingSlots, 1, slotValue(spellSlots, 1)),
    spellSlotsRemaining2: slotValue(remainingSlots, 2, slotValue(spellSlots, 2)),
    spellSlotsRemaining3: slotValue(remainingSlots, 3, slotValue(spellSlots, 3)),
    spellSlotsRemaining4: slotValue(remainingSlots, 4, slotValue(spellSlots, 4)),
    spellSlotsRemaining5: slotValue(remainingSlots, 5, slotValue(spellSlots, 5)),
    spellSlotsRemaining6: slotValue(remainingSlots, 6, slotValue(spellSlots, 6)),
    spellSlotsRemaining7: slotValue(remainingSlots, 7, slotValue(spellSlots, 7)),
    spellSlotsRemaining8: slotValue(remainingSlots, 8, slotValue(spellSlots, 8)),
    spellSlotsRemaining9: slotValue(remainingSlots, 9, slotValue(spellSlots, 9)),
    notes: typeof sheet.notes === "string" ? sheet.notes : "",
  };
}

export function PlayerForm({
  campaigns,
  onCreated,
  initialPlayer,
  submitLabel = "Create player",
}: {
  campaigns: Campaign[];
  onCreated: (player: Player) => void;
  initialPlayer?: Player;
  submitLabel?: string;
}) {
  const [form, setForm] = useState<PlayerFormState>(() =>
    initialPlayer ? playerFormFromPlayer(initialPlayer) : { ...emptyPlayerForm },
  );
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    JSON.stringify(initialPlayer ? playerFormFromPlayer(initialPlayer) : emptyPlayerForm),
  );
  const [error, setError] = useState("");
  const [allowNavigation, setAllowNavigation] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const navigate = useNavigate();
  const isDirty = JSON.stringify(form) !== savedSnapshot;

  useEffect(() => {
    const nextForm = initialPlayer ? playerFormFromPlayer(initialPlayer) : { ...emptyPlayerForm };
    setForm(nextForm);
    setSavedSnapshot(JSON.stringify(nextForm));
    setAllowNavigation(false);
  }, [initialPlayer]);

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!isDirty || allowNavigation) return;
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [allowNavigation, isDirty]);

  useEffect(() => {
    function interceptAppNavigation(event: MouseEvent) {
      if (!isDirty || allowNavigation || event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(target instanceof HTMLAnchorElement)) return;
      const url = new URL(target.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      const destination = `${url.pathname}${url.search}${url.hash}`;
      if (
        destination ===
        `${window.location.pathname}${window.location.search}${window.location.hash}`
      ) {
        return;
      }
      event.preventDefault();
      setPendingNavigation(destination);
    }

    document.addEventListener("click", interceptAppNavigation, true);
    return () => document.removeEventListener("click", interceptAppNavigation, true);
  }, [allowNavigation, isDirty]);

  function toggleList(
    field:
      | "savingThrowProficiencies"
      | "skillProficiencies"
      | "skillExpertise"
      | "damageVulnerabilities"
      | "damageResistances"
      | "damageImmunities"
      | "conditionImmunities",
    value: string,
    checked: boolean,
  ) {
    setForm((current) => ({
      ...current,
      [field]: checked
        ? [...current[field], value]
        : current[field].filter((item) => item !== value),
    }));
  }

  async function savePlayer() {
    setError("");
    try {
      const payload = initialPlayer
        ? await api.updatePlayer(initialPlayer.id, form)
        : await api.createPlayer(form);
      const nextSnapshot = JSON.stringify(form);
      setSavedSnapshot(nextSnapshot);
      setAllowNavigation(true);
      if (!initialPlayer) {
        setForm({ ...emptyPlayerForm, campaignId: form.campaignId });
      }
      return payload.player;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save player");
      return null;
    }
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    const player = await savePlayer();
    if (player) {
      onCreated(player);
    }
  }

  async function saveAndProceed() {
    const player = await savePlayer();
    if (player && pendingNavigation) {
      void navigate(pendingNavigation);
    }
  }

  function proceedWithoutSaving() {
    if (!pendingNavigation) return;
    setAllowNavigation(true);
    void navigate(pendingNavigation);
  }

  return (
    <>
      <form className="grid gap-5" onSubmit={handleCreate}>
        <PlayerBasicsSection form={form} campaigns={campaigns} setForm={setForm} />
        <PlayerVitalsSection form={form} setForm={setForm} />
        <PlayerAbilitySections form={form} setForm={setForm} toggleList={toggleList} />
        <PlayerDefenses form={form} setForm={setForm} toggleList={toggleList} />
        <PlayerSpellAndNotes form={form} setForm={setForm} />
        {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
        <Button type="submit">{submitLabel}</Button>
      </form>
      <UnsavedPlayerNavigationDialog
        open={pendingNavigation !== null}
        onStay={() => setPendingNavigation(null)}
        onDiscard={proceedWithoutSaving}
        onSave={() => void saveAndProceed()}
      />
    </>
  );
}

type PlayerFormSetter = Dispatch<SetStateAction<PlayerFormState>>;
type TogglePlayerList = (
  field:
    | "savingThrowProficiencies"
    | "skillProficiencies"
    | "skillExpertise"
    | "damageVulnerabilities"
    | "damageResistances"
    | "damageImmunities"
    | "conditionImmunities",
  value: string,
  checked: boolean,
) => void;

function PlayerAbilitySections({
  form,
  setForm,
  toggleList,
}: {
  form: PlayerFormState;
  setForm: PlayerFormSetter;
  toggleList: TogglePlayerList;
}) {
  const characterLevel = effectiveCharacterLevel(form.level, form.experiencePoints);

  return (
    <>
      <FormSection title="Ability Scores">
        <CompactAbilityTable
          abilityScores={form.abilityScores}
          savingThrowProficiencies={form.savingThrowProficiencies}
          onSaveProficiencyChange={(ability, checked) =>
            toggleList("savingThrowProficiencies", ability, checked)
          }
          onScoreChange={(ability, value) =>
            setForm((current) => ({
              ...current,
              abilityScores: { ...current.abilityScores, [ability]: value },
            }))
          }
        />
      </FormSection>
      <FormSection title="Skills">
        <SkillsTable
          abilityScores={form.abilityScores}
          expertise={form.skillExpertise}
          proficiencyBonus={proficiencyBonus(String(characterLevel))}
          proficiencies={form.skillProficiencies}
          onExpertiseChange={(skill, checked) => toggleList("skillExpertise", skill, checked)}
          onProficiencyChange={(skill, checked) => toggleList("skillProficiencies", skill, checked)}
        />
      </FormSection>
    </>
  );
}

function PlayerDefenses({
  form,
  setForm,
  toggleList,
}: {
  form: PlayerFormState;
  setForm: PlayerFormSetter;
  toggleList: TogglePlayerList;
}) {
  return (
    <>
      <FormSection title="Senses">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {senseTypes.map((sense) => (
            <SenseControl
              key={sense}
              label={sense}
              value={form.senses[sense]}
              onChange={(next) =>
                setForm((current) => ({ ...current, senses: { ...current.senses, [sense]: next } }))
              }
            />
          ))}
        </div>
      </FormSection>
      <FormSection title="Resistances & Vulnerabilities">
        <DamageDefenseGroup
          damageImmunities={form.damageImmunities}
          damageResistances={form.damageResistances}
          damageVulnerabilities={form.damageVulnerabilities}
          onChange={toggleList}
        />
      </FormSection>
      <FormSection title="Condition Immunities">
        <ConditionImmunityChecklist
          selected={form.conditionImmunities}
          onChange={(condition, checked) => toggleList("conditionImmunities", condition, checked)}
        />
      </FormSection>
    </>
  );
}

function PlayerSpellAndNotes({
  form,
  setForm,
}: {
  form: PlayerFormState;
  setForm: PlayerFormSetter;
}) {
  return (
    <>
      <FormSection title="Spellcasting">
        <div className="grid gap-5">
          <div className="grid gap-4 sm:grid-cols-[220px_220px_140px]">
            <Field label="Spellcasting Ability">
              <AbilitySelect
                value={form.spellcastingAbility}
                onChange={(value) => setForm({ ...form, spellcastingAbility: value })}
              />
            </Field>
            <Field label="Innate Spellcasting Ability">
              <AbilitySelect
                value={form.innateSpellcastingAbility}
                onChange={(value) => setForm({ ...form, innateSpellcastingAbility: value })}
              />
            </Field>
            <IconNumberField
              className="w-28"
              icon={Sparkles}
              label="Spell Save DC"
              value={form.spellSaveDC}
              onChange={(value) => setForm({ ...form, spellSaveDC: value })}
            />
          </div>
          <PlayerSpellSlotsSection form={form} setForm={setForm} />
        </div>
      </FormSection>
      <FormSection title="Notes">
        <Field label="Character Notes">
          <Textarea
            value={form.notes}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
            rows={4}
          />
        </Field>
      </FormSection>
    </>
  );
}
