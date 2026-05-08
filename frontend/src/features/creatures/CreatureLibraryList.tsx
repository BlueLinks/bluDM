import { BookOpen, Eye, Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { avatarImageSrc } from "../../components/AvatarImagePicker";
import { Badge, Button, EmptyMini, Modal, StatPill } from "../../components/ui";
import { creatureDefaultDisposition } from "../../lib/domain/forms";
import type { Creature } from "../../types";

export function CreatureLibraryList({
  creatures,
  onPreview,
  onRemove,
}: {
  creatures: Creature[];
  onPreview: (creature: Creature) => void;
  onRemove: (creature: Creature) => void;
}) {
  const [visibleCount, setVisibleCount] = useState(80);

  useEffect(() => {
    setVisibleCount(80);
  }, [creatures]);

  if (creatures.length === 0) {
    return <EmptyMini copy="No creatures in the selected library view." />;
  }
  const visibleCreatures = creatures.slice(0, visibleCount);
  return (
    <div className="grid gap-3">
      {visibleCreatures.map((creature) => (
        <CreatureLibraryCard
          creature={creature}
          key={creature.id}
          onPreview={onPreview}
          onRemove={onRemove}
        />
      ))}
      {visibleCount < creatures.length && (
        <Button
          type="button"
          variant="secondary"
          onClick={() => setVisibleCount((current) => current + 80)}
        >
          Load more creatures ({creatures.length - visibleCount} remaining)
        </Button>
      )}
    </div>
  );
}

export function CreaturePreviewModal({
  creature,
  onClose,
}: {
  creature: Creature | null;
  onClose: () => void;
}) {
  return (
    <Modal
      title={creature ? creature.name : "Creature"}
      open={Boolean(creature)}
      onOpenChange={(open) => !open && onClose()}
      trigger={<span />}
    >
      {creature && <CreaturePreviewSheet creature={creature} />}
    </Modal>
  );
}

function CreatureLibraryCard({
  creature,
  onPreview,
  onRemove,
}: {
  creature: Creature;
  onPreview: (creature: Creature) => void;
  onRemove: (creature: Creature) => void;
}) {
  const avatarSrc = avatarImageSrc(creature.imageAssetId, creature.avatarUrl);
  return (
    <div
      className={[
        "rounded-lg border bg-background p-4 transition",
        creature.readOnly ? "border-sky-300/80 shadow-sm dark:border-sky-800" : "border-border",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-md bg-muted text-sm font-bold text-muted-foreground">
            {avatarSrc ? (
              <img
                className="h-full w-full object-cover"
                src={avatarSrc}
                alt=""
                loading="lazy"
                decoding="async"
              />
            ) : (
              creature.name.slice(0, 2).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-semibold">{creature.name}</h3>
              {creature.readOnly && <SrdBadge label={creature.sourceLabel} />}
            </div>
            <p className="text-sm text-muted-foreground">
              {[creature.size, creature.creatureType, creature.alignment]
                .filter(Boolean)
                .join(" · ") || "Creature"}
            </p>
          </div>
        </div>
        <CreatureLibraryCardActions creature={creature} onPreview={onPreview} onRemove={onRemove} />
      </div>
      <CreatureStatBadges creature={creature} />
    </div>
  );
}

function CreatureLibraryCardActions({
  creature,
  onPreview,
  onRemove,
}: {
  creature: Creature;
  onPreview: (creature: Creature) => void;
  onRemove: (creature: Creature) => void;
}) {
  if (creature.readOnly) {
    return (
      <Button icon={Eye} size="sm" variant="secondary" onClick={() => onPreview(creature)}>
        View
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      <Link to={`/npcs/${creature.id}/edit`}>
        <Button icon={Pencil} size="sm" variant="secondary">
          Edit
        </Button>
      </Link>
      <Button icon={Trash2} size="sm" variant="danger" onClick={() => onRemove(creature)}>
        Remove
      </Button>
    </div>
  );
}

function CreatureStatBadges({ creature }: { creature: Creature }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2 text-xs">
      <Badge>AC {creature.armorClass}</Badge>
      <Badge>HP {creature.hitPoints}</Badge>
      <Badge>CR {creature.challengeRating || "-"}</Badge>
      <Badge tone={creatureDefaultDisposition(creature) === "friendly" ? "friendly" : "default"}>
        Default: {creatureDefaultDisposition(creature)}
      </Badge>
    </div>
  );
}

function CreaturePreviewSheet({ creature }: { creature: Creature }) {
  const abilities = abilityScores(creature);
  const avatarSrc = avatarImageSrc(creature.imageAssetId, creature.avatarUrl);
  return (
    <div className="grid gap-5">
      <div className="rounded-lg border border-sky-300 bg-sky-50 p-4 text-sky-950 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-100">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <SrdBadge label={creature.sourceLabel} />
          <span className="text-sm font-semibold">
            {creature.sourceLabel || "Standard content"}
          </span>
        </div>
        <p className="text-sm leading-6 opacity-90">
          This is shared read-only library content. Copy-to-library editing will come in the next
          data import slice.
        </p>
      </div>
      <div className="flex flex-wrap items-start gap-4">
        <div className="grid h-28 w-28 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-muted text-2xl font-bold text-muted-foreground">
          {avatarSrc ? (
            <img
              className="h-full w-full object-cover"
              src={avatarSrc}
              alt=""
              loading="eager"
              decoding="async"
            />
          ) : (
            creature.name.slice(0, 2).toUpperCase()
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-2xl font-bold">{creature.name}</h3>
          <p className="mt-1 italic text-muted-foreground">
            {[creature.size, creature.creatureType, creature.alignment].filter(Boolean).join(", ")}
          </p>
        </div>
      </div>
      {creature.description && (
        <p className="rounded-md border border-border bg-muted/30 p-3 text-sm leading-6">
          {creature.description}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-4">
        <StatPill label="Armor Class" value={creature.armorClass} />
        <StatPill label="Hit Points" value={creature.hitPoints} />
        <StatPill label="Hit Dice" value={creature.hitDice || "-"} />
        <StatPill label="XP" value={creature.xp} />
      </div>
      <div className="grid gap-2 sm:grid-cols-6">
        {abilities.map((ability) => (
          <div
            className="rounded-md border border-border bg-background p-3 text-center"
            key={ability.label}
          >
            <div className="text-xs font-bold uppercase text-muted-foreground">{ability.label}</div>
            <div className="text-xl font-bold">{ability.value}</div>
            <div className="text-sm text-muted-foreground">{signedModifier(ability.value)}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <PreviewJsonBlock title="Skills" value={recordFromStatBlock(creature, "skills")} />
        <PreviewJsonBlock title="Senses" value={recordFromStatBlock(creature, "senses")} />
        <PreviewJsonBlock title="Defenses" value={recordFromStatBlock(creature, "defenses")} />
        <PreviewJsonBlock
          title="Spellcasting"
          value={recordFromStatBlock(creature, "spellcasting")}
        />
      </div>
      <PreviewFeatureBlock
        title="Special Abilities"
        value={arrayFromStatBlock(creature, "specialAbilities")}
      />
      <PreviewFeatureBlock title="Actions" value={arrayFromStatBlock(creature, "actions")} />
      <PreviewFeatureBlock
        title="Legendary Actions"
        value={arrayFromStatBlock(creature, "legendaryActions")}
      />
    </div>
  );
}

function PreviewJsonBlock({ title, value }: { title: string; value: Record<string, unknown> }) {
  const entries = Object.entries(value);
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <h4 className="font-semibold">{title}</h4>
      {entries.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">None listed.</p>
      ) : (
        <dl className="mt-2 grid gap-1 text-sm">
          {entries.map(([key, item]) => (
            <div className="flex justify-between gap-3" key={key}>
              <dt className="capitalize text-muted-foreground">{key}</dt>
              <dd className="text-right font-medium">{formatPreviewValue(item)}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function PreviewFeatureBlock({ title, value }: { title: string; value: unknown[] }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <h4 className="font-semibold">{title}</h4>
      {value.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">None listed.</p>
      ) : (
        <div className="mt-3 grid gap-3">
          {value.map((item, index) => (
            <PreviewFeatureItem item={item} key={featureKey(item, index)} />
          ))}
        </div>
      )}
    </div>
  );
}

function PreviewFeatureItem({ item }: { item: unknown }) {
  const feature = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
  const damage = Array.isArray(feature.damage) ? feature.damage : [];
  const name = stringFromFeature(feature.name, "Feature");
  const description = stringFromFeature(feature.description);
  return (
    <article className="rounded-md border border-border bg-muted/20 p-3">
      <div className="font-semibold">{name}</div>
      {description && <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>}
      {damage.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {damage.map((part, index) => (
            <Badge key={featureKey(part, index)}>{formatPreviewValue(part)}</Badge>
          ))}
        </div>
      )}
    </article>
  );
}

function SrdBadge({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-sky-300 bg-sky-100 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-sky-900 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-200">
      <BookOpen className="h-3 w-3" />
      {label || "SRD"}
    </span>
  );
}

function abilityScores(creature: Creature) {
  const abilities = recordFromStatBlock(creature, "abilities");
  return ["str", "dex", "con", "int", "wis", "cha"].map((key) => ({
    label: key,
    value: numberFromRecord(abilities, key),
  }));
}

function recordFromStatBlock(creature: Creature, key: string): Record<string, unknown> {
  const value = creature.statBlock[key];
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function arrayFromStatBlock(creature: Creature, key: string): unknown[] {
  const value = creature.statBlock[key];
  return Array.isArray(value) ? value : [];
}

function numberFromRecord(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "number" ? value : 10;
}

function signedModifier(score: number) {
  const modifier = Math.floor((score - 10) / 2);
  return modifier >= 0 ? `+${modifier}` : String(modifier);
}

function formatPreviewValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object" && value) return Object.values(value).flat().join(", ");
  return String(value);
}

function stringFromFeature(value: unknown, fallback = ""): string {
  return typeof value === "string" && value ? value : fallback;
}

function featureKey(value: unknown, index: number): string {
  if (value && typeof value === "object" && "name" in value) {
    return `${String((value as { name?: unknown }).name)}-${index}`;
  }
  return String(index);
}
