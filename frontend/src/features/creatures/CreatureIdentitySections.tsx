import { BookOpen, HeartPulse, Shield, Zap } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { AvatarImagePicker } from "../../components/AvatarImagePicker";
import {
  DiceFormulaInput,
  formatDiceFormula,
  parseDiceFormula,
} from "../../components/shared/CharacterFormControls";
import {
  Button,
  Checkbox,
  Field,
  FormSection,
  IconNumberField,
  Input,
  Select,
} from "../../components/ui";
import { api } from "../../lib/api";
import {
  alignments,
  challengeRatingXp,
  challengeRatings,
  creatureEnvironments,
  creatureSizes,
  creatureSubtypes,
  creatureTypes,
} from "../../lib/domain/options";
import type { CreatureFormState } from "../../types";

type CreatureFormSetter = Dispatch<SetStateAction<CreatureFormState>>;

export function CreatureIdentitySections({
  form,
  setForm,
}: {
  form: CreatureFormState;
  setForm: CreatureFormSetter;
}) {
  return (
    <>
      <CreatureBasicInfo form={form} setForm={setForm} />
      <CreatureMovement form={form} setForm={setForm} />
      <CreatureHealth form={form} setForm={setForm} />
      <CreatureChallenge form={form} setForm={setForm} />
    </>
  );
}

function CreatureBasicInfo({
  form,
  setForm,
}: {
  form: CreatureFormState;
  setForm: CreatureFormSetter;
}) {
  const subtypeOptions = creatureSubtypes[form.creatureType] ?? [];
  function setCreatureType(creatureType: string) {
    setForm((current) => ({
      ...current,
      creatureType,
      creatureSubtype: creatureSubtypes[creatureType]?.includes(current.creatureSubtype)
        ? current.creatureSubtype
        : "",
    }));
  }

  return (
    <FormSection title="Basic Info">
      <AvatarImagePicker
        label="NPC avatar"
        name={form.name}
        assetId={form.imageAssetId}
        url={form.avatarUrl}
        uploadImage={(file) => api.uploadImage(file)}
        onChange={(avatar) =>
          setForm({ ...form, imageAssetId: avatar.assetId, avatarUrl: avatar.url })
        }
      />
      <Field label="Name">
        <Input
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          required
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Size">
          <Select
            options={creatureSizes.map((size) => ({ label: size, value: size }))}
            placeholder="Select size"
            value={form.size}
            onValueChange={(value) => setForm({ ...form, size: value })}
          />
        </Field>
        <Field label="Alignment">
          <Select
            options={alignments.map((alignment) => ({ label: alignment, value: alignment }))}
            placeholder="Select alignment"
            value={form.alignment}
            onValueChange={(value) => setForm({ ...form, alignment: value })}
          />
        </Field>
        <Field label="Environment">
          <Select
            options={creatureEnvironments.map((environment) => ({
              label: environment,
              value: environment,
            }))}
            placeholder="Select environment"
            value={creatureEnvironments.includes(form.environment) ? form.environment : ""}
            onValueChange={(environment) => setForm({ ...form, environment })}
          />
        </Field>
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_minmax(220px,1fr)_auto]">
        <Field label="Type">
          <Select
            options={creatureTypes.map((type) => ({ label: type, value: type }))}
            placeholder="Select type"
            value={creatureTypes.includes(form.creatureType) ? form.creatureType : ""}
            onValueChange={setCreatureType}
          />
        </Field>
        {subtypeOptions.length > 0 && (
          <Field label="Subtype">
            <div className="flex gap-2">
              <Select
                options={subtypeOptions.map((subtype) => ({ label: subtype, value: subtype }))}
                placeholder="Optional subtype"
                value={form.creatureSubtype}
                onValueChange={(creatureSubtype) => setForm({ ...form, creatureSubtype })}
              />
              {form.creatureSubtype && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setForm({ ...form, creatureSubtype: "" })}
                >
                  Clear
                </Button>
              )}
            </div>
          </Field>
        )}
        <div className="self-end">
          <Checkbox
            label="Friendly by default"
            checked={form.defaultDisposition === "friendly"}
            onChange={(checked) =>
              setForm({ ...form, defaultDisposition: checked ? "friendly" : "enemy" })
            }
          />
        </div>
      </div>
      <Field label="Languages">
        <Input
          value={form.languages}
          onChange={(event) => setForm({ ...form, languages: event.target.value })}
          placeholder="Common, Deep Speech, Telepathy 120 ft."
        />
      </Field>
    </FormSection>
  );
}

function CreatureMovement({
  form,
  setForm,
}: {
  form: CreatureFormState;
  setForm: CreatureFormSetter;
}) {
  return (
    <FormSection title="Movement">
      <div className="flex flex-wrap gap-3">
        {(["walkSpeed", "swimSpeed", "flySpeed", "burrowSpeed", "climbSpeed"] as const).map(
          (key) => (
            <IconNumberField
              key={key}
              icon={Zap}
              label={speedLabel(key)}
              value={form[key]}
              onChange={(value) => setForm({ ...form, [key]: value })}
            />
          ),
        )}
      </div>
    </FormSection>
  );
}

function CreatureHealth({
  form,
  setForm,
}: {
  form: CreatureFormState;
  setForm: CreatureFormSetter;
}) {
  const hitDice = parseDiceFormula(form.hitDice);
  return (
    <FormSection title="Health and AC">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <IconNumberField
          className="w-full"
          icon={Shield}
          label="AC"
          value={form.armorClass}
          onChange={(value) => setForm({ ...form, armorClass: value })}
        />
        <IconNumberField
          className="w-full"
          icon={HeartPulse}
          label="HP"
          value={form.hitPoints}
          onChange={(value) => setForm({ ...form, hitPoints: value })}
        />
        <Field label="Hit Dice">
          <DiceFormulaInput
            value={hitDice}
            onChange={(next) => setForm({ ...form, hitDice: formatDiceFormula(next) })}
          />
        </Field>
        <IconNumberField
          className="w-full"
          icon={BookOpen}
          label="Passive Perception"
          value={form.passivePerception}
          onChange={(value) => setForm({ ...form, passivePerception: value })}
        />
        <IconNumberField
          className="w-full"
          icon={BookOpen}
          label="Passive Investigation"
          value={form.passiveInvestigation}
          onChange={(value) => setForm({ ...form, passiveInvestigation: value })}
        />
        <IconNumberField
          className="w-full"
          icon={BookOpen}
          label="Passive Insight"
          value={form.passiveInsight}
          onChange={(value) => setForm({ ...form, passiveInsight: value })}
        />
      </div>
    </FormSection>
  );
}

function CreatureChallenge({
  form,
  setForm,
}: {
  form: CreatureFormState;
  setForm: CreatureFormSetter;
}) {
  return (
    <FormSection title="Challenge">
      <div className="grid gap-4 sm:grid-cols-[180px_160px_80px]">
        <Field label="Challenge Rating">
          <Select
            options={challengeRatings.map((rating) => ({ label: rating, value: rating }))}
            placeholder="Select CR"
            value={form.challengeRating}
            onValueChange={(challengeRating) =>
              setForm({
                ...form,
                challengeRating,
                xp: String(challengeRatingXp[challengeRating] ?? 0),
              })
            }
          />
        </Field>
        <div className="grid gap-1 self-end rounded-md border border-border bg-background px-3 py-2">
          <span className="text-[0.68rem] font-bold uppercase tracking-wide text-muted-foreground">
            XP Award
          </span>
          <span className="text-xl font-black leading-none text-foreground">
            {(Number(form.xp) || 0).toLocaleString()}
          </span>
        </div>
        <div className="grid gap-1 self-end rounded-md border border-border bg-muted px-3 py-2 text-center">
          <span className="text-[0.68rem] font-bold uppercase tracking-wide text-muted-foreground">
            PB
          </span>
          <span className="text-sm font-black">+{creatureProficiency(form)}</span>
        </div>
      </div>
    </FormSection>
  );
}

function creatureProficiency(form: CreatureFormState) {
  const cr = Number(form.challengeRating.includes("/") ? 0 : form.challengeRating) || 0;
  return Math.max(2, Math.min(9, Math.ceil((cr + 3) / 4) + 1));
}

function speedLabel(key: "walkSpeed" | "swimSpeed" | "flySpeed" | "burrowSpeed" | "climbSpeed") {
  return key
    .replace("Speed", "")
    .replace(/^[a-z]/, (match) => match.toUpperCase())
    .concat(" speed");
}
