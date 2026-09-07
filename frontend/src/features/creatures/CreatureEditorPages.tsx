import { Castle } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { BackButton, Breadcrumbs } from "../../app/shell";
import {
  Button,
  Callout,
  EmptyMini,
  Modal,
  MutedPanel,
  Page,
  PageHeader,
  ToastViewport,
  useToasts,
} from "../../components/ui";
import { api } from "../../lib/api";
import type { Campaign } from "../../types";
import { CreatureForm } from "./CreatureForm";
import { copyEditorData, loadCreatureEditor, type CreatureEditorData } from "./creatureCopy";

export function NpcCreatePage() {
  const navigate = useNavigate();
  const toast = useToasts();
  const [search] = useSearchParams();
  const sourceID = search.get("copy") ?? "";
  const standard = search.get("source") === "standard";
  const [data, setData] = useState<CreatureEditorData>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(sourceID));
  useEffect(() => {
    if (!sourceID) {
      setData(undefined);
      setLoading(false);
      return;
    }
    let current = true;
    setLoading(true);
    setError("");
    setData(undefined);
    loadCreatureEditor(sourceID, standard)
      .then((payload) => {
        if (current) setData(copyEditorData(payload));
      })
      .catch((error) => {
        if (current) setError(error instanceof Error ? error.message : "Could not copy creature");
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [sourceID, standard]);
  return (
    <Page size="workspace">
      <ToastViewport toasts={toast.toasts} onDismiss={toast.dismiss} />
      <BackButton to="/npcs">Creature library</BackButton>
      <PageHeader
        eyebrow="NPCs & Monsters"
        title={sourceID ? "Copy creature" : "Create creature"}
        copy="Build a reusable stat block. Preview updates as you edit."
      />
      {error && <Callout tone="danger">{error}</Callout>}
      {loading && <MutedPanel>Loading source creature…</MutedPanel>}
      {!loading && !error && (
        <CreatureForm
          key={sourceID || "new"}
          mode="create"
          creature={data?.creature}
          existingActions={data?.actions}
          spellcasting={data?.spellcasting}
          notify={toast.push}
          onSaved={() => navigate("/npcs")}
        />
      )}
    </Page>
  );
}
export function NpcEditPage() {
  const { creatureID = "" } = useParams();
  const navigate = useNavigate();
  const toast = useToasts();
  const [data, setData] = useState<CreatureEditorData>();
  const [error, setError] = useState("");
  const [linksOpen, setLinksOpen] = useState(false);
  useEffect(() => {
    let current = true;
    setData(undefined);
    setError("");
    loadCreatureEditor(creatureID)
      .then((payload) => {
        if (current) setData(payload);
      })
      .catch((error) => {
        if (current) setError(error instanceof Error ? error.message : "Could not load creature");
      });
    return () => {
      current = false;
    };
  }, [creatureID]);
  return (
    <Page size="workspace">
      <ToastViewport toasts={toast.toasts} onDismiss={toast.dismiss} />
      <BackButton to="/npcs">Creature library</BackButton>
      <Breadcrumbs
        items={[
          { label: "Creatures", to: "/npcs" },
          { label: data?.creature.name ?? "Creature" },
          { label: "Edit" },
        ]}
      />
      <PageHeader
        eyebrow="NPCs & Monsters"
        title={data ? `Edit ${data.creature.name}` : "Edit creature"}
        copy="Changes are staged locally until saved."
        action={
          <Button icon={Castle} variant="outline" onClick={() => setLinksOpen(true)}>
            Campaign links
          </Button>
        }
      />
      {error && <Callout tone="danger">{error}</Callout>}
      {!data && !error && <MutedPanel>Loading creature…</MutedPanel>}
      {data && (
        <CreatureForm
          key={creatureID}
          mode="edit"
          creature={data.creature}
          existingActions={data.actions}
          spellcasting={data.spellcasting}
          notify={toast.push}
          onSaved={() => navigate("/npcs")}
        />
      )}
      <Modal title="Campaign links" open={linksOpen} onOpenChange={setLinksOpen}>
        {linksOpen && <CreatureCampaignLinks creatureID={creatureID} notify={toast.push} />}
      </Modal>
    </Page>
  );
}
function CreatureCampaignLinks({
  creatureID,
  notify,
}: {
  creatureID: string;
  notify: (message: string) => void;
}) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [linked, setLinked] = useState<Campaign[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  useEffect(() => {
    let current = true;
    Promise.all([api.campaigns(), api.creatureCampaigns(creatureID)])
      .then(([all, links]) => {
        if (current) {
          setCampaigns(all.campaigns);
          setLinked(links.campaigns);
        }
      })
      .catch((error) => {
        if (current) setError(error instanceof Error ? error.message : "Could not load links");
      })
      .finally(() => {
        if (current) setBusy(false);
      });
    return () => {
      current = false;
    };
  }, [creatureID]);
  async function toggle(campaign: Campaign, isLinked: boolean) {
    setBusy(true);
    setError("");
    try {
      if (isLinked) await api.unlinkCampaignNpc(campaign.id, creatureID);
      else await api.linkCampaignNpc(campaign.id, creatureID);
      const payload = await api.creatureCampaigns(creatureID);
      setLinked(payload.campaigns);
      notify(`${isLinked ? "Unlinked from" : "Linked to"} ${campaign.name}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not update campaign link");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted-foreground">Link changes are saved immediately.</p>
      {error && <Callout tone="danger">{error}</Callout>}
      {busy && <p role="status">Updating links…</p>}
      {!busy && !campaigns.length && <EmptyMini copy="No campaigns exist yet." />}
      {campaigns.map((campaign) => {
        const isLinked = linked.some((item) => item.id === campaign.id);
        return (
          <div
            key={campaign.id}
            className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3"
          >
            <span>{campaign.name}</span>
            <Button
              type="button"
              disabled={busy}
              variant={isLinked ? "outline" : "secondary"}
              size="sm"
              onClick={() => void toggle(campaign, isLinked)}
            >
              {isLinked ? "Unlink" : "Link"}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
