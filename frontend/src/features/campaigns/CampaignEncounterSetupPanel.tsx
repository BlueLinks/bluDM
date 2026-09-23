import { SidebarDetailLayout } from "../../components/layout";
import { ConfirmDialog } from "../../components/ui";
import type { EncounterRuleset } from "../../lib/domain/encounterRulesets";
import type { Player } from "../../types";
import { EncounterPreviewPanel } from "./CampaignEncounterRandomPreview";
import { CustomEncounterSetup, EncounterSetupStep } from "./CampaignEncounterRandomSetup";
import type {
  EncounterBuilderCreatureDraft,
  EncounterBuilderMode,
  EncounterBuilderPreview,
  EncounterBuilderRandomOptions,
} from "./encounterBuilderGenerator";

export function CampaignEncounterSetupPanel({
  allies,
  customEnemies,
  difficultyRuleset,
  enemies,
  mode,
  options,
  players,
  preview,
  onAddEnemy,
  onChooseMode,
  onOptionsChange,
  onRegenerate,
  onRemoveEnemy,
  onUpdateEnemy,
}: {
  allies: EncounterBuilderCreatureDraft[];
  customEnemies: EncounterBuilderCreatureDraft[];
  difficultyRuleset: EncounterRuleset;
  enemies: EncounterBuilderCreatureDraft[];
  mode: EncounterBuilderMode;
  options: EncounterBuilderRandomOptions;
  players: Player[];
  preview: EncounterBuilderPreview;
  onAddEnemy: () => void;
  onChooseMode: (mode: EncounterBuilderMode) => void;
  onOptionsChange: (options: EncounterBuilderRandomOptions) => void;
  onRegenerate: () => void;
  onRemoveEnemy: (id: string) => void;
  onUpdateEnemy: (draft: EncounterBuilderCreatureDraft) => void;
}) {
  return (
    <div className="grid gap-4">
      <div
        className="flex gap-5 border-b border-border"
        role="tablist"
        aria-label="Encounter approach"
      >
        <ApproachTab active={mode === "custom"} onClick={() => onChooseMode("custom")}>
          Fully custom
        </ApproachTab>
        <ApproachTab
          active={mode === "random"}
          disabled={!players.length}
          onClick={() => onChooseMode("random")}
        >
          Generated
        </ApproachTab>
      </div>
      {mode === "custom" ? (
        <SidebarDetailLayout variant="encounterBuilder">
          <CustomEncounterSetup
            enemies={customEnemies}
            onAddEnemy={onAddEnemy}
            onRemoveEnemy={onRemoveEnemy}
            onUpdateEnemy={onUpdateEnemy}
          />
          <EncounterPreviewPanel
            allies={allies}
            difficultyRuleset={difficultyRuleset}
            enemies={customEnemies}
            mode="custom"
            players={players}
          />
        </SidebarDetailLayout>
      ) : (
        <EncounterSetupStep
          allies={allies}
          difficultyRuleset={difficultyRuleset}
          enemies={enemies}
          options={options}
          players={players}
          preview={preview}
          onAddEnemy={onAddEnemy}
          onOptionsChange={onOptionsChange}
          onRegenerate={onRegenerate}
          onRemoveEnemy={onRemoveEnemy}
          onUpdateEnemy={onUpdateEnemy}
        />
      )}
    </div>
  );
}

function ApproachTab({
  active,
  children,
  disabled = false,
  onClick,
}: {
  active: boolean;
  children: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-selected={active}
      className={[
        "-mb-px border-b-2 px-1 pb-2.5 pt-1 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 disabled:cursor-not-allowed disabled:opacity-50",
        active
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground",
      ].join(" ")}
      disabled={disabled}
      role="tab"
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function RegenerationConfirmation({
  pending,
  onCancel,
  onConfirm,
}: {
  pending: { title: string; message: string } | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <ConfirmDialog
      open={Boolean(pending)}
      title={pending?.title ?? "Regenerate encounter?"}
      confirmLabel="Continue"
      onCancel={onCancel}
      onConfirm={onConfirm}
    >
      {pending?.message}
    </ConfirmDialog>
  );
}
