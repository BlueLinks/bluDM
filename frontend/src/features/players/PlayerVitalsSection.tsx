import type { Dispatch, SetStateAction } from "react";
import { BookOpen, HeartPulse, Shield, Zap } from "lucide-react";
import { FormSection, IconNumberField } from "../../components/ui";
import type { PlayerFormState } from "../../types";

type PlayerFormSetter = Dispatch<SetStateAction<PlayerFormState>>;

export function PlayerVitalsSection({
  form,
  setForm,
}: {
  form: PlayerFormState;
  setForm: PlayerFormSetter;
}) {
  return (
    <FormSection title="Health and AC">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
          label="Max HP"
          value={form.maxHitPoints}
          onChange={(value) => setForm({ ...form, maxHitPoints: value })}
        />
        <IconNumberField
          className="w-full"
          icon={HeartPulse}
          label="Temp HP"
          value={form.temporaryHitPoints}
          onChange={(value) => setForm({ ...form, temporaryHitPoints: value })}
        />
        <IconNumberField
          className="w-full"
          icon={HeartPulse}
          label="Temp Max HP"
          value={form.temporaryMaxHitPoints}
          onChange={(value) => setForm({ ...form, temporaryMaxHitPoints: value })}
        />
        <IconNumberField
          className="w-full"
          icon={Zap}
          label="Speed"
          value={form.speed}
          onChange={(value) => setForm({ ...form, speed: value })}
        />
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
