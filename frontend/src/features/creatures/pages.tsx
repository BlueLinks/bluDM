import { Archive, Castle, Plus, Search, Swords } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BackButton, Breadcrumbs } from "../../app/shell";
import { CreatureSourceFilter } from "../../components/shared/CreatureSourceFilter";
import {
  Button,
  Callout,
  ConfirmDialog,
  EmptyMini,
  FloatingInput,
  Modal,
  MutedPanel,
  Page,
  PageHeader,
  SectionPanel,
  ToastViewport,
  useToasts,
} from "../../components/ui";
import { api } from "../../lib/api";
import { actionFormFromTemplate, blankAction, spiderStaffAction } from "../../lib/domain/forms";
import type {
  ActionFormState,
  ActionTemplate,
  ActionTemplateUsage,
  Campaign,
  Creature,
  CreatureAction,
} from "../../types";
import { ActionMiniFields, ActionSummary } from "./actionEditors";
import { CreatureForm } from "./CreatureForm";
import { CreatureLibraryList, CreaturePreviewModal } from "./CreatureLibraryList";

export function NpcsPage() {
  const [creatures, setCreatures] = useState<Creature[]>([]);
  const [showUserCreatures, setShowUserCreatures] = useState(true);
  const [showStandardCreatures, setShowStandardCreatures] = useState(false);
  const [creatureSearch, setCreatureSearch] = useState("");
  const [templates, setTemplates] = useState<ActionTemplate[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [templateForm, setTemplateForm] = useState<ActionFormState>(() => spiderStaffAction());
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ActionTemplate | null>(null);
  const [deleteCreature, setDeleteCreature] = useState<Creature | null>(null);
  const [previewCreature, setPreviewCreature] = useState<Creature | null>(null);
  const [deleteTemplate, setDeleteTemplate] = useState<ActionTemplate | null>(null);
  const [templateUsage, setTemplateUsage] = useState<ActionTemplateUsage[]>([]);
  const toast = useToasts();

  useEffect(() => {
    Promise.all([api.creatures({ includeStandard: true }), api.actionTemplates()])
      .then(([creaturePayload, templatePayload]) => {
        setCreatures(creaturePayload.creatures);
        setTemplates(templatePayload.actionTemplates);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load NPCs"))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreateTemplate(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const payload = editingTemplate
        ? await api.updateActionTemplate(editingTemplate.id, templateForm)
        : await api.createActionTemplate(templateForm);
      setTemplates((current) =>
        editingTemplate
          ? current
              .map((template) =>
                template.id === editingTemplate.id ? payload.actionTemplate : template,
              )
              .sort((a, b) => a.name.localeCompare(b.name))
          : [...current, payload.actionTemplate].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setTemplateForm(blankAction());
      setEditingTemplate(null);
      setTemplateModalOpen(false);
      toast.push(editingTemplate ? "Action template updated" : "Action template saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create action template");
    }
  }

  async function confirmDeleteCreature() {
    if (!deleteCreature) return;
    await api.deleteCreature(deleteCreature.id);
    setCreatures((current) => current.filter((creature) => creature.id !== deleteCreature.id));
    toast.push(`${deleteCreature.name} removed`);
    setDeleteCreature(null);
  }

  async function openDeleteTemplate(template: ActionTemplate) {
    setDeleteTemplate(template);
    setTemplateUsage([]);
    try {
      const payload = await api.actionTemplateUsage(template.id);
      setTemplateUsage(payload.usage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load action template usage");
    }
  }

  async function confirmDeleteTemplate() {
    if (!deleteTemplate) return;
    const payload = await api.deleteActionTemplate(deleteTemplate.id);
    setTemplates((current) => current.filter((template) => template.id !== deleteTemplate.id));
    toast.push(
      `Action template removed from bank and ${payload.removedCreatureActions} creature action${payload.removedCreatureActions === 1 ? "" : "s"}`,
    );
    setDeleteTemplate(null);
    setTemplateUsage([]);
  }

  function openTemplateModal(template?: ActionTemplate) {
    setEditingTemplate(template ?? null);
    setTemplateForm(template ? actionFormFromTemplate(template) : blankAction());
    setTemplateModalOpen(true);
  }

  return (
    <Page>
      <ToastViewport toasts={toast.toasts} onDismiss={toast.dismiss} />
      <BackButton to="/npcs">Back to NPCs</BackButton>
      <Breadcrumbs items={[{ label: "NPCs", to: "/npcs" }, { label: "New" }]} />
      <PageHeader
        eyebrow="NPCs & Monsters"
        title="Creature library"
        copy="Reusable stat blocks, default disposition, attacks, and spells live here. Encounter-side disposition can override these defaults."
        action={
          <Link to="/npcs/new">
            <Button icon={Plus} variant="success">
              Add NPC
            </Button>
          </Link>
        }
      />
      {error && <Callout tone="danger">{error}</Callout>}
      <div className="grid gap-4 xl:grid-cols-[1fr_460px]">
        <SectionPanel title="Existing NPCs & Monsters" icon={Swords}>
          <div className="mb-4">
            <CreatureSourceFilter
              showStandard={showStandardCreatures}
              showUser={showUserCreatures}
              onShowStandardChange={setShowStandardCreatures}
              onShowUserChange={setShowUserCreatures}
            />
          </div>
          <div className="mb-4">
            <FloatingInput
              icon={Search}
              label="Search creatures"
              value={creatureSearch}
              onChange={setCreatureSearch}
            />
          </div>
          {loading && <p className="text-sm text-muted-foreground">Loading creatures...</p>}
          <CreatureLibraryList
            creatures={creatures.filter((creature) =>
              creatureVisible(creature, {
                query: creatureSearch,
                showStandard: showStandardCreatures,
                showUser: showUserCreatures,
              }),
            )}
            onPreview={setPreviewCreature}
            onRemove={setDeleteCreature}
          />
        </SectionPanel>
        <SectionPanel title="Action Bank" icon={Archive}>
          <p className="mb-4 text-sm text-muted-foreground">
            Reusable attacks and abilities live here. Adding one to a creature creates an editable
            copy in that creature's own action list.
          </p>
          <Modal
            open={templateModalOpen}
            onOpenChange={(open) => {
              setTemplateModalOpen(open);
              if (!open) {
                setEditingTemplate(null);
                setTemplateForm(blankAction());
              }
            }}
            title={editingTemplate ? "Edit action template" : "Add action template"}
            trigger={
              <Button
                type="button"
                icon={Plus}
                variant="success"
                onClick={() => openTemplateModal()}
              >
                Add action
              </Button>
            }
          >
            <form className="grid gap-4" onSubmit={handleCreateTemplate}>
              <ActionMiniFields value={templateForm} onChange={setTemplateForm} />
              <Button type="submit" icon={Plus} variant="success">
                {editingTemplate ? "Update action template" : "Save action template"}
              </Button>
            </form>
          </Modal>
          <div className="grid gap-2">
            {templates.map((template) => (
              <ActionSummary
                key={template.id}
                action={template}
                onEdit={() => openTemplateModal(template)}
                onDelete={() => void openDeleteTemplate(template)}
              />
            ))}
            {!loading && templates.length === 0 && (
              <EmptyMini copy="No action templates yet. Create reusable attacks here, then copy them into specific NPCs or monsters." />
            )}
          </div>
        </SectionPanel>
      </div>
      <ConfirmDialog
        open={Boolean(deleteCreature)}
        title="Remove creature?"
        confirmLabel="Remove creature"
        onCancel={() => setDeleteCreature(null)}
        onConfirm={() => void confirmDeleteCreature()}
      >
        This will remove {deleteCreature?.name} and its creature-specific actions. This cannot be
        undone.
      </ConfirmDialog>
      <ConfirmDialog
        open={Boolean(deleteTemplate)}
        title="Remove banked action?"
        confirmLabel="Remove action"
        onCancel={() => {
          setDeleteTemplate(null);
          setTemplateUsage([]);
        }}
        onConfirm={() => void confirmDeleteTemplate()}
      >
        Removing {deleteTemplate?.name} will also remove copied actions that still reference this
        bank template.
        {templateUsage.length > 0 && (
          <div className="mt-3 rounded-md border border-border bg-background p-3 text-sm">
            <div className="font-semibold">Affected creatures</div>
            <ul className="mt-2 grid gap-1 text-muted-foreground">
              {templateUsage.map((usage) => (
                <li key={usage.actionId}>
                  {usage.creatureName}: {usage.actionName}
                </li>
              ))}
            </ul>
          </div>
        )}
      </ConfirmDialog>
      <CreaturePreviewModal creature={previewCreature} onClose={() => setPreviewCreature(null)} />
    </Page>
  );
}

function creatureVisible(
  creature: Creature,
  options: { query: string; showStandard: boolean; showUser: boolean },
) {
  if (creature.librarySource === "standard" && !options.showStandard) return false;
  if (creature.librarySource !== "standard" && !options.showUser) return false;
  const query = options.query.trim().toLowerCase();
  if (!query) return true;
  return [creature.name, creature.size, creature.creatureType, creature.challengeRating]
    .join(" ")
    .toLowerCase()
    .includes(query);
}

export function NpcCreatePage() {
  const navigate = useNavigate();
  const toast = useToasts();
  return (
    <Page>
      <ToastViewport toasts={toast.toasts} onDismiss={toast.dismiss} />
      <PageHeader
        eyebrow="NPCs & Monsters"
        title="Add NPC"
        copy="Full-page creation keeps larger stat blocks readable: basic info, movement, health, abilities, skills, defenses, and actions."
      />
      <div className="max-w-6xl">
        <SectionPanel title="NPC / Monster Details" icon={Swords}>
          <CreatureForm mode="create" notify={toast.push} onSaved={() => void navigate("/npcs")} />
        </SectionPanel>
      </div>
    </Page>
  );
}

export function NpcEditPage() {
  const { creatureID = "" } = useParams();
  const navigate = useNavigate();
  const toast = useToasts();
  const [creature, setCreature] = useState<Creature | null>(null);
  const [actions, setActions] = useState<CreatureAction[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [linkedCampaigns, setLinkedCampaigns] = useState<Campaign[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.creature(creatureID),
      api.creatureActions(creatureID),
      api.campaigns(),
      api.creatureCampaigns(creatureID),
    ])
      .then(([creaturePayload, actionPayload, campaignPayload, linkedPayload]) => {
        setCreature(creaturePayload.creature);
        setActions(actionPayload.actions);
        setCampaigns(campaignPayload.campaigns);
        setLinkedCampaigns(linkedPayload.campaigns);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load creature"))
      .finally(() => setLoading(false));
  }, [creatureID]);

  async function linkCampaign(campaign: Campaign) {
    await api.linkCampaignNpc(campaign.id, creatureID);
    toast.push(`Linked to ${campaign.name}`);
    const payload = await api.creatureCampaigns(creatureID);
    setLinkedCampaigns(payload.campaigns);
  }

  async function unlinkCampaign(campaign: Campaign) {
    await api.unlinkCampaignNpc(campaign.id, creatureID);
    toast.push(`Unlinked from ${campaign.name}`);
    const payload = await api.creatureCampaigns(creatureID);
    setLinkedCampaigns(payload.campaigns);
  }

  return (
    <Page>
      <ToastViewport toasts={toast.toasts} onDismiss={toast.dismiss} />
      <BackButton to="/npcs">Back to NPCs</BackButton>
      <Breadcrumbs
        items={[
          { label: "NPCs", to: "/npcs" },
          { label: creature?.name ?? "NPC" },
          { label: "Edit" },
        ]}
      />
      <PageHeader
        eyebrow="NPCs & Monsters"
        title={creature ? `Edit ${creature.name}` : "Edit NPC"}
        copy="Changes are staged locally until saved."
      />
      {error && <Callout tone="danger">{error}</Callout>}
      {loading && <MutedPanel>Loading creature...</MutedPanel>}
      {creature && (
        <div className="grid max-w-6xl gap-4">
          <SectionPanel title="Campaign Links" icon={Castle}>
            <div className="grid gap-2">
              {campaigns.length === 0 && <EmptyMini copy="No campaigns exist yet." />}
              {campaigns.map((campaign) => {
                const linked = linkedCampaigns.some((item) => item.id === campaign.id);
                return (
                  <div
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-background p-3"
                    key={campaign.id}
                  >
                    <div>
                      <div className="font-semibold">{campaign.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {linked ? "Linked to this campaign" : "Not linked"}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant={linked ? "danger" : "success"}
                      size="sm"
                      onClick={() =>
                        linked ? void unlinkCampaign(campaign) : void linkCampaign(campaign)
                      }
                    >
                      {linked ? "Unlink" : "Link"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </SectionPanel>
          <SectionPanel title="NPC / Monster Details" icon={Swords}>
            <CreatureForm
              mode="edit"
              creature={creature}
              existingActions={actions}
              notify={toast.push}
              onSaved={() => void navigate("/npcs")}
            />
          </SectionPanel>
        </div>
      )}
    </Page>
  );
}
