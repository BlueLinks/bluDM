import { BookOpen, HeartPulse, Shield, Sparkles, Zap } from "lucide-react";
import { type Dispatch, type FormEvent, type SetStateAction, useEffect, useState } from "react";
import {
  AbilityInput,
  AbilitySelect,
  ConditionImmunityChecklist,
  DamageDefenseGroup,
  SenseControl,
  SkillsTable,
} from "../../components/shared/CharacterFormControls";
import { Button, Field, FormSection, IconNumberField, Textarea } from "../../components/ui";
import { api } from "../../lib/api";
import { proficiencyBonus } from "../../lib/domain/forms";
import { abilities, senseTypes } from "../../lib/domain/options";
import type { Campaign, Player, PlayerFormState } from "../../types";
import { PlayerBasicsSection } from "./PlayerBasicsSection";

const emptyPlayerForm: PlayerFormState = {
  campaignId: "",
  avatarAssetId: "",
  avatarUrl: "",
  characterName: "",
  playerName: "",
  className: "",
  level: "1",
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
  notes: "",
};

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
    level: String(typeof sheet.level === "number" ? sheet.level : 1),
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
  const [error, setError] = useState("");

  useEffect(() => {
    if (!form.campaignId && campaigns.length > 0) {
      setForm((current) => ({ ...current, campaignId: campaigns[0].id }));
    }
  }, [campaigns, form.campaignId]);

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

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!form.campaignId) {
      setError("Create a campaign before adding players.");
      return;
    }
    try {
      const payload = initialPlayer
        ? await api.updatePlayer(initialPlayer.id, form)
        : await api.createPlayer(form);
      onCreated(payload.player);
      if (!initialPlayer) {
        setForm({ ...emptyPlayerForm, campaignId: form.campaignId });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save player");
    }
  }

  return (
    <form className="grid gap-5" onSubmit={handleCreate}>
      <PlayerBasicsSection form={form} campaigns={campaigns} setForm={setForm} />
      <PlayerVitals form={form} setForm={setForm} />
      <PlayerAbilitySections form={form} setForm={setForm} toggleList={toggleList} />
      <PlayerDefenses form={form} setForm={setForm} toggleList={toggleList} />
      <PlayerSpellAndNotes form={form} setForm={setForm} />
      {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
      <Button type="submit">{submitLabel}</Button>
    </form>
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

function PlayerVitals({ form, setForm }: { form: PlayerFormState; setForm: PlayerFormSetter }) {
  return (
    <FormSection title="Health and AC">
      <div className="flex flex-wrap gap-3">
        <IconNumberField
          icon={Shield}
          label="AC"
          value={form.armorClass}
          onChange={(value) => setForm({ ...form, armorClass: value })}
        />
        <IconNumberField
          icon={HeartPulse}
          label="Max HP"
          value={form.maxHitPoints}
          onChange={(value) => setForm({ ...form, maxHitPoints: value })}
        />
        <IconNumberField
          icon={HeartPulse}
          label="Temp HP"
          value={form.temporaryHitPoints}
          onChange={(value) => setForm({ ...form, temporaryHitPoints: value })}
        />
        <IconNumberField
          icon={HeartPulse}
          label="Temp Max HP"
          value={form.temporaryMaxHitPoints}
          onChange={(value) => setForm({ ...form, temporaryMaxHitPoints: value })}
        />
        <IconNumberField
          icon={Zap}
          label="Speed"
          value={form.speed}
          onChange={(value) => setForm({ ...form, speed: value })}
        />
        <IconNumberField
          icon={BookOpen}
          label="Passive Perception"
          value={form.passivePerception}
          onChange={(value) => setForm({ ...form, passivePerception: value })}
        />
        <IconNumberField
          icon={BookOpen}
          label="Passive Investigation"
          value={form.passiveInvestigation}
          onChange={(value) => setForm({ ...form, passiveInvestigation: value })}
        />
        <IconNumberField
          icon={BookOpen}
          label="Passive Insight"
          value={form.passiveInsight}
          onChange={(value) => setForm({ ...form, passiveInsight: value })}
        />
      </div>
    </FormSection>
  );
}

function PlayerAbilitySections({
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
      <FormSection title="Ability Scores">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {abilities.map((ability) => (
            <AbilityInput
              key={ability.key}
              label={ability.label}
              value={Number(form.abilityScores[ability.key])}
              saveProficient={form.savingThrowProficiencies.includes(ability.key)}
              onSaveProficiencyChange={(checked) =>
                toggleList("savingThrowProficiencies", ability.key, checked)
              }
              onChange={(next) =>
                setForm((current) => ({
                  ...current,
                  abilityScores: { ...current.abilityScores, [ability.key]: String(next) },
                }))
              }
            />
          ))}
        </div>
      </FormSection>
      <FormSection title="Skills">
        <SkillsTable
          abilityScores={form.abilityScores}
          expertise={form.skillExpertise}
          proficiencyBonus={proficiencyBonus(form.level)}
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
            icon={Sparkles}
            label="Spell Save DC"
            value={form.spellSaveDC}
            onChange={(value) => setForm({ ...form, spellSaveDC: value })}
          />
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
