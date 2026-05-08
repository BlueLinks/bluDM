import { Search } from "lucide-react";
import { CreatureSourceFilter } from "../../components/shared/CreatureSourceFilter";
import { StandardSourceToggles } from "../../components/shared/StandardSourceToggles";
import { Callout, EmptyMini, FloatingInput, SectionPanel } from "../../components/ui";
import type { Creature } from "../../types";
import { CreatureEncounterAddRow } from "./editorComponents";

export function EncounterCreatureAddPanel({
  campaignCreatureIds,
  campaignName,
  creatureSources,
  filteredCreatures,
  hasCreatureSourceMismatch,
  onAddCreature,
  search,
  setCreatureSources,
  setSearch,
  setShowStandardCreatures,
  setShowUserCreatures,
  showStandardCreatures,
  showUserCreatures,
  usingFallbackCreatures,
}: {
  campaignCreatureIds: Set<string>;
  campaignName?: string;
  creatureSources: string[];
  filteredCreatures: Creature[];
  hasCreatureSourceMismatch: boolean;
  onAddCreature: (
    creature: Creature,
    side: "friendly" | "enemy",
    quantity: number,
    rolledHp: boolean,
  ) => void;
  search: string;
  setCreatureSources: (sources: string[]) => void;
  setSearch: (search: string) => void;
  setShowStandardCreatures: (show: boolean) => void;
  setShowUserCreatures: (show: boolean) => void;
  showStandardCreatures: boolean;
  showUserCreatures: boolean;
  usingFallbackCreatures: boolean;
}) {
  return (
    <SectionPanel title="Add Enemies Or Allies" icon={Search}>
      <div className="grid gap-3">
        <FloatingInput icon={Search} label="Search creatures" value={search} onChange={setSearch} />
        <CreatureSourceFilter
          showStandard={showStandardCreatures}
          showUser={showUserCreatures}
          onShowStandardChange={setShowStandardCreatures}
          onShowUserChange={setShowUserCreatures}
        />
        {showStandardCreatures && (
          <section className="grid gap-2 rounded-lg border border-border bg-card p-3">
            <div>
              <h3 className="text-sm font-semibold">Browse standard creature sources</h3>
              <p className="text-xs text-muted-foreground">
                You can browse outside this campaign's source set; bluDM will warn rather than block
                adding the creature.
              </p>
            </div>
            <StandardSourceToggles selected={creatureSources} onChange={setCreatureSources} />
            {hasCreatureSourceMismatch && campaignName && (
              <Callout>
                This encounter belongs to {campaignName}, but your browse filters include SRD
                content that campaign does not currently allow.
              </Callout>
            )}
            {usingFallbackCreatures && (
              <Callout>
                SRD 5.2.1 creature stat blocks are not available yet, so bluDM is showing SRD 2014
                combat creatures as a temporary encounter-building fallback.
              </Callout>
            )}
          </section>
        )}
        <div className="grid max-h-[65vh] gap-2 overflow-y-auto pr-1">
          {filteredCreatures.map((creature) => (
            <CreatureEncounterAddRow
              key={creature.id}
              creature={creature}
              campaignLinked={campaignCreatureIds.has(creature.id)}
              onAdd={(side, quantity, rolledHp) =>
                onAddCreature(creature, side, quantity, rolledHp)
              }
            />
          ))}
          {filteredCreatures.length === 0 && <EmptyMini copy="No creatures match that search." />}
        </div>
      </div>
    </SectionPanel>
  );
}
