import { Dice5, HeartPulse, Shield, Swords } from "lucide-react";
import { useEffect, useState } from "react";
import { avatarImageSrc } from "../../components/AvatarImagePicker";
import {
  AbilityScoreCard,
  InitialsAvatar,
  StatChip,
  VitalStatCard,
} from "../../components/shared/displayPrimitives";
import { ContentStack } from "../../components/layout";
import { Button, Callout } from "../../components/ui";
import { api } from "../../lib/api";
import type { Creature, CreatureAction, CreatureSpellcastingProfile } from "../../types";
import {
  profileAbilities,
  profileFacts,
  profileFeatures,
  profileSpells,
} from "./creatureProfileData";

export function CreatureProfile({
  creature,
  actions = [],
  spellcasting,
}: {
  creature: Creature;
  actions?: CreatureAction[];
  spellcasting?: CreatureSpellcastingProfile;
}) {
  const spells = profileSpells(creature, spellcasting);
  return (
    <ContentStack className="creature-profile">
      <header className="flex items-start gap-3">
        <InitialsAvatar
          name={creature.name || "New creature"}
          src={avatarImageSrc(creature.imageAssetId, creature.avatarUrl)}
        />
        <div className="min-w-0">
          <h3 className="break-words text-2xl font-bold">{creature.name || "New creature"}</h3>
          <p className="text-sm text-muted-foreground">
            {[creature.size, creature.creatureType, creature.alignment].filter(Boolean).join(" · ")}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatChip
              label={creature.readOnly ? creature.sourceLabel || "SRD" : "My creation"}
              tone={creature.readOnly ? "official" : "personal"}
            />
            <StatChip
              label={creature.statBlock.defaultDisposition === "friendly" ? "Friendly" : "Enemy"}
              tone={creature.statBlock.defaultDisposition === "friendly" ? "shared" : "metadata"}
            />
          </div>
        </div>
      </header>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <VitalStatCard label="AC" value={creature.armorClass} icon={Shield} tone="primary" />
        <VitalStatCard label="HP" value={creature.hitPoints} icon={HeartPulse} tone="tertiary" />
        <VitalStatCard
          label="Hit dice"
          value={creature.hitDice || "—"}
          icon={Dice5}
          tone="secondary"
        />
        <VitalStatCard
          label="CR"
          value={creature.challengeRating || "—"}
          icon={Swords}
          tone="secondary"
        />
      </div>
      <p className="text-xs text-muted-foreground">{creature.xp.toLocaleString()} XP</p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {profileAbilities(creature).map((ability) => (
          <AbilityScoreCard
            key={ability.key}
            label={ability.label}
            score={ability.score}
            modifier={ability.modifier}
            layout="stacked"
          />
        ))}
      </div>
      <dl className="grid gap-2 text-sm">
        {profileFacts(creature).map(([label, value]) => (
          <div key={label}>
            <dt className="mr-2 inline font-semibold">{label}</dt>
            <dd className="inline text-muted-foreground">{value}</dd>
          </div>
        ))}
      </dl>
      {profileFeatures(creature, actions).map((group) => (
        <section className="border-t border-border pt-3" key={group.title}>
          <h4 className="mb-2 font-semibold text-primary">{group.title}</h4>
          {group.introduction && (
            <p className="mb-2 text-sm text-muted-foreground">{group.introduction}</p>
          )}
          <div className="grid gap-3">
            {group.items.map((item, index) => (
              <article key={`${item.name}-${index}`} className="text-sm leading-relaxed">
                <h5 className="inline font-semibold">{item.name}. </h5>
                <p className="inline whitespace-pre-wrap text-muted-foreground">
                  {item.description}
                </p>
                {item.detail && (
                  <p className="mt-1 text-xs font-medium text-primary">{item.detail}</p>
                )}
              </article>
            ))}
          </div>
        </section>
      ))}
      {spells && (
        <section className="border-t border-border pt-3">
          <h4 className="mb-2 font-semibold text-primary">Spellcasting</h4>
          <p className="text-sm leading-relaxed text-muted-foreground">{spells}</p>
        </section>
      )}
      {creature.description && (
        <section className="border-t border-border pt-3">
          <h4 className="mb-2 font-semibold">Notes</h4>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {creature.description}
          </p>
        </section>
      )}
    </ContentStack>
  );
}

export function LoadedCreatureProfile({ creature }: { creature: Creature }) {
  const [state, setState] = useState<{
    id: string;
    actions: CreatureAction[];
    spellcasting?: CreatureSpellcastingProfile;
    error?: string;
  }>();
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (creature.readOnly) return;
    let current = true;
    Promise.all([api.creatureActions(creature.id), api.creatureSpellcasting(creature.id)])
      .then(([actions, spells]) => {
        if (current)
          setState({
            id: creature.id,
            actions: actions.actions,
            spellcasting: spells.spellcasting,
          });
      })
      .catch((error) => {
        if (current)
          setState({
            id: creature.id,
            actions: [],
            error: error instanceof Error ? error.message : "Could not load actions and spells",
          });
      });
    return () => {
      current = false;
    };
  }, [creature.id, creature.readOnly, retry]);
  const loaded = state?.id === creature.id ? state : undefined;
  return (
    <>
      {!creature.readOnly && !loaded && (
        <p role="status" className="mb-3 text-sm text-muted-foreground">
          Loading actions and spells…
        </p>
      )}
      {loaded?.error && (
        <Callout tone="danger">
          Actions and spells could not be loaded. {loaded.error}{" "}
          <Button size="sm" variant="outline" onClick={() => setRetry((value) => value + 1)}>
            Retry
          </Button>
        </Callout>
      )}
      <CreatureProfile
        creature={creature}
        actions={loaded?.actions}
        spellcasting={loaded?.spellcasting}
      />
    </>
  );
}
