import { HeartPulse } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { ActionRow } from "../../components/layout";
import { Button, Callout, Modal, ToastViewport, useToasts } from "../../components/ui";
import { api } from "../../lib/api";
import type { Campaign } from "../../types";
import { PartyAdjustmentControls } from "./PartyAdjustmentControls";
import {
  adjustmentKind,
  campaignAdjustmentPayload,
  combatAdjustmentPayload,
  partyMembersFromPlayers,
  partyMembersFromRun,
  targetLimit,
  type PartyAdjustmentDraft,
  type PartyMember,
} from "./partyAdjustmentModel";
import { PartyTargetList } from "./PartyTargetList";

const defaultDraft: PartyAdjustmentDraft = {
  workflow: "quick",
  quickKind: "damage",
  source: "aid",
  amount: 5,
  actorId: "",
  slotLevel: 2,
  consumeSpellSlot: true,
  adjustCurrentHitPoints: true,
  damageType: "bludgeoning",
  reason: "",
  targetIds: [],
};

export function PartyAdjustmentDialog() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [members, setMembers] = useState<PartyMember[]>([]);
  const [draft, setDraft] = useState<PartyAdjustmentDraft>(defaultDraft);
  const toast = useToasts();
  const runId = useMemo(
    () => location.pathname.match(/^\/encounter-runs\/([^/]+)(?:\/initiative)?$/)?.[1] ?? "",
    [location.pathname],
  );
  const routeCampaignId = useMemo(
    () => location.pathname.match(/^\/campaigns\/([^/]+)/)?.[1] ?? "",
    [location.pathname],
  );
  const combat = Boolean(runId);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError("");
    setDraft(defaultDraft);
    if (runId) {
      void api
        .encounterRun(runId)
        .then(({ run }) => {
          setMembers(partyMembersFromRun(run));
          setCampaigns([]);
          setCampaignId("");
        })
        .catch((err) => setError(errorMessage(err, "Could not load encounter party")))
        .finally(() => setLoading(false));
      return;
    }
    void Promise.all([api.campaigns(), api.players()])
      .then(([campaignPayload, playerPayload]) => {
        setCampaigns(campaignPayload.campaigns);
        const nextCampaignId =
          campaignPayload.campaigns.find((campaign) => campaign.id === routeCampaignId)?.id ??
          campaignPayload.campaigns[0]?.id ??
          "";
        setCampaignId(nextCampaignId);
        setMembers(partyMembersFromPlayers(playerPayload.players, nextCampaignId));
      })
      .catch((err) => setError(errorMessage(err, "Could not load party")))
      .finally(() => setLoading(false));
  }, [open, routeCampaignId, runId]);

  async function applyAdjustment() {
    setSaving(true);
    setError("");
    try {
      if (runId) {
        await api.applyResolution(runId, combatAdjustmentPayload(draft));
        window.dispatchEvent(new CustomEvent("bludm:encounter-run-updated", { detail: { runId } }));
      } else {
        await api.adjustCampaignParty(campaignId, campaignAdjustmentPayload(draft));
        window.dispatchEvent(new CustomEvent("bludm:party-updated", { detail: { campaignId } }));
      }
      toast.push(adjustmentSuccessMessage(draft));
      setOpen(false);
    } catch (err) {
      setError(errorMessage(err, "Could not adjust party"));
    } finally {
      setSaving(false);
    }
  }

  function chooseCampaign(nextCampaignId: string) {
    setCampaignId(nextCampaignId);
    setDraft((current) => ({ ...current, actorId: "", targetIds: [] }));
    setLoading(true);
    setError("");
    void api
      .players()
      .then((payload) => setMembers(partyMembersFromPlayers(payload.players, nextCampaignId)))
      .catch((err) => setError(errorMessage(err, "Could not load party")))
      .finally(() => setLoading(false));
  }

  const validation = adjustmentValidation(draft, campaignId, combat, members);
  const campaignName = combat
    ? "Encounter party"
    : campaigns.find((campaign) => campaign.id === campaignId)?.name || "Party";
  const summary = adjustmentSummary(draft);

  return (
    <>
      <Modal
        className="max-w-3xl"
        open={open}
        title="Party adjustment"
        trigger={
          <Button
            type="button"
            aria-label="Adjust party hit points"
            icon={HeartPulse}
            size="sm"
            variant="ghost"
          >
            <span className="hidden xl:inline">Adjust</span>
          </Button>
        }
        onOpenChange={setOpen}
      >
        <p className="-mt-4 mb-4 text-sm text-muted-foreground">
          {campaignName} · changes apply immediately
        </p>

        <PartyAdjustmentControls
          campaignId={campaignId}
          campaigns={campaigns}
          combat={combat}
          draft={draft}
          members={members}
          onCampaignChange={chooseCampaign}
          onDraftChange={setDraft}
        />

        <PartyTargetList
          draft={draft}
          members={members}
          onTargetIdsChange={(targetIds) => setDraft((current) => ({ ...current, targetIds }))}
        />

        {loading && <p className="mt-4 text-sm text-muted-foreground">Loading party...</p>}
        {error && (
          <div className="mt-4">
            <Callout tone="danger">{error}</Callout>
          </div>
        )}
        {!error && validation && <p className="mt-4 text-sm text-muted-foreground">{validation}</p>}

        <div className="sticky bottom-0 z-10 -mx-6 -mb-6 mt-5 flex flex-col gap-3 border-t border-border bg-card px-6 py-4 shadow-lg max-sm:-mx-4 max-sm:-mb-4 max-sm:px-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <strong className="block truncate text-sm">{summary.title}</strong>
            <span className="block truncate text-xs text-muted-foreground">{summary.detail}</span>
          </div>
          <ActionRow className="shrink-0" justify="end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={loading || saving || Boolean(validation)}
              onClick={() => void applyAdjustment()}
            >
              {saving ? "Applying..." : summary.action}
            </Button>
          </ActionRow>
        </div>
      </Modal>
      <ToastViewport toasts={toast.toasts} onDismiss={toast.dismiss} />
    </>
  );
}

function adjustmentValidation(
  draft: PartyAdjustmentDraft,
  campaignId: string,
  combat: boolean,
  members: PartyMember[],
) {
  if (!combat && !campaignId) return "Choose a campaign first.";
  if (members.length === 0) return "There are no party members to adjust.";
  if (draft.targetIds.length === 0) return "Choose at least one party member.";
  if (draft.targetIds.length > targetLimit(draft)) return "Too many targets are selected.";
  if (!Number.isFinite(draft.amount) || draft.amount < 1) return "Enter an amount of at least 1.";
  if (draft.workflow !== "source") return "";
  const actor = members.find((member) => member.id === draft.actorId);
  if (!actor) return draft.source === "aid" ? "Choose a caster." : "Choose a leader.";
  if (draft.source === "aid" && draft.consumeSpellSlot) {
    const slot = actor.spellSlots[draft.slotLevel];
    if (!slot || slot.remaining < 1) return "Choose an available spell slot.";
  }
  return "";
}

function adjustmentSummary(draft: PartyAdjustmentDraft) {
  const count = draft.targetIds.length;
  const targets = count + " target" + (count === 1 ? "" : "s");
  const kind = adjustmentKind(draft);
  if (kind === "aid") {
    return {
      action: "Cast Aid",
      detail: draft.consumeSpellSlot
        ? levelLabel(draft.slotLevel) + " slot"
        : "Spell slot not tracked",
      title: "Aid · " + targets,
    };
  }
  if (kind === "inspiring_leader") {
    return {
      action: "Use Inspiring Leader",
      detail: "No limited resource tracked",
      title: "Inspiring Leader · " + targets,
    };
  }
  const detail = targets + " · no character resources used";
  if (kind === "damage") {
    return {
      action: "Apply damage",
      detail,
      title: "Deal " + draft.amount + " " + (draft.damageType || "untyped") + " damage",
    };
  }
  if (kind === "healing") {
    return { action: "Apply healing", detail, title: "Restore " + draft.amount + " hit points" };
  }
  if (kind === "temporary_hit_points") {
    return {
      action: "Apply temporary HP",
      detail,
      title: "Grant " + draft.amount + " temporary hit points",
    };
  }
  return {
    action: "Apply max HP",
    detail,
    title: "Increase maximum hit points by " + draft.amount,
  };
}

function adjustmentSuccessMessage(draft: PartyAdjustmentDraft) {
  const count = draft.targetIds.length;
  if (draft.workflow === "source") {
    const source = draft.source === "aid" ? "Aid" : "Inspiring Leader";
    return source + " applied to " + count + " party member" + (count === 1 ? "" : "s");
  }
  return "Party adjustment applied to " + count + " member" + (count === 1 ? "" : "s");
}

function levelLabel(level: number) {
  const suffix = level === 1 ? "st" : level === 2 ? "nd" : level === 3 ? "rd" : "th";
  return level + suffix + "-level";
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
