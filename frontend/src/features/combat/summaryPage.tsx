import { Package, Plus, Sparkles, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BackButton, Breadcrumbs } from "../../app/shell";
import { Button, Field, Input, MutedPanel, Page, PageHeader, SectionPanel } from "../../components/ui";
import { api } from "../../lib/api";
import { defeatedEnemyXP } from "../../lib/domain/combat";
import type { Encounter, EncounterRun } from "../../types";

export function EncounterSummaryPage() {
  const { runID } = useParams();
  const navigate = useNavigate();
  const [run, setRun] = useState<EncounterRun | null>(null);
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [lootText, setLootText] = useState("");
  const [lootPool, setLootPool] = useState<string[]>([]);
  const [xpAwards, setXpAwards] = useState<Record<string, number>>({});
  const [lootAssignments, setLootAssignments] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!runID) return;
    void api.encounterRun(runID).then((payload) => {
      setRun(payload.run);
      void api.encounter(payload.run.encounterId).then((encounterPayload) => setEncounter(encounterPayload.encounter)).catch(() => setEncounter(null));
      const players = (payload.run.combatants ?? []).filter((combatant) => combatant.sourceType === "player");
      const totalXP = defeatedEnemyXP(payload.run.combatants ?? []);
      const split = players.length ? Math.floor(totalXP / players.length) : 0;
      setXpAwards(Object.fromEntries(players.map((player) => [player.playerId || player.id, split])));
    });
  }, [runID]);

  if (!run) return <MutedPanel>Loading encounter summary...</MutedPanel>;
  const players = (run.combatants ?? []).filter((combatant) => combatant.sourceType === "player");

  function addLoot() {
    const item = lootText.trim();
    if (!item) return;
    setLootPool((current) => [...current, item]);
    setLootText("");
  }

  async function end() {
    if (!runID) return;
    await api.endEncounterRun(runID, { xpAwards, lootPool, lootAssignments });
    void navigate(encounter ? `/campaigns/${encounter.campaignId}` : "/campaigns");
  }

  return (
    <Page>
      <BackButton to={`/encounter-runs/${run.id}`}>Back to combat</BackButton>
      <Breadcrumbs items={[{ label: "Campaigns", to: "/campaigns" }, ...(encounter ? [{ label: encounter.name, to: `/campaigns/${encounter.campaignId}` }] : [{ label: "Encounter Run", to: `/encounter-runs/${run.id}` }]), { label: "Summary" }]} />
      <PageHeader eyebrow="Summary" title="XP and loot" copy="Award XP from defeated enemies and assign loose loot notes until inventory management exists." action={<Button onClick={() => void end()}>Save Summary</Button>} />
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionPanel title="XP Awards" icon={Sparkles}>
          <p className="mb-3 text-sm text-muted-foreground">Defeated enemy XP: {defeatedEnemyXP(run.combatants ?? [])}</p>
          <div className="grid gap-2">
            {players.map((player) => (
              <Field key={player.id} label={player.displayName}>
                <Input type="number" value={xpAwards[player.playerId || player.id] ?? 0} onChange={(event) => setXpAwards({ ...xpAwards, [player.playerId || player.id]: Number(event.target.value) || 0 })} />
              </Field>
            ))}
          </div>
        </SectionPanel>
        <SectionPanel title="Loot Pool" icon={Package}>
          <div className="mb-3 grid grid-cols-[1fr_auto] gap-2">
            <Input placeholder="Loot note or item" value={lootText} onChange={(event) => setLootText(event.target.value)} />
            <Button icon={Plus} onClick={addLoot}>Add</Button>
          </div>
          <div className="grid gap-2">
            {lootPool.map((item) => (
              <div key={item} draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", item)} className="rounded-md border border-border bg-background px-3 py-2 text-sm">{item}</div>
            ))}
          </div>
        </SectionPanel>
      </div>
      <SectionPanel title="Assign Loot" icon={UsersRound}>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {players.map((player) => (
            <div
              key={player.id}
              className="min-h-28 rounded-lg border border-dashed border-border bg-background p-3"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                const item = event.dataTransfer.getData("text/plain");
                const key = player.playerId || player.id;
                setLootAssignments((current) => ({ ...current, [key]: [...(current[key] ?? []), item] }));
                setLootPool((current) => current.filter((entry) => entry !== item));
              }}
            >
              <div className="font-semibold">{player.displayName}</div>
              <div className="mt-2 grid gap-1 text-sm text-muted-foreground">
                {(lootAssignments[player.playerId || player.id] ?? []).map((item) => <span key={item}>{item}</span>)}
              </div>
            </div>
          ))}
        </div>
      </SectionPanel>
    </Page>
  );
}
