import { ChevronLeft, PackagePlus } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Button, Modal } from "../../../components/ui";
import { api } from "../../../lib/api";
import type { Item } from "../../../types";
import { blankItemForm } from "../../items/itemFormState";
import { stockItemKey } from "./campaignWorldStockUtils";
import {
  ChooseStockStep,
  ConfigureStockStep,
  SelectedStockStrip,
  StepTabs,
  StockReview,
  type StockDraft,
  type StockStep,
} from "./CampaignWorldLocationStockDialogSteps";
import type { CampaignLocation } from "./travelTypes";

type LocationStockFormInput = {
  locationId: string;
  itemId: string;
  librarySource: "user" | "standard";
  quantity: number;
  priceAmount: number;
  priceUnit: string;
  availability: string;
  notes: string;
};

export function AddStockModal({
  items,
  location,
  open,
  onCreate,
  onCustomItemCreated,
  onOpenChange,
}: {
  items: Item[];
  location: CampaignLocation;
  open: boolean;
  onCreate: (input: LocationStockFormInput) => Promise<void>;
  onCustomItemCreated: (item: Item) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const [itemSearch, setItemSearch] = useState("");
  const [customName, setCustomName] = useState("");
  const [drafts, setDrafts] = useState<StockDraft[]>([]);
  const [activeDraftKey, setActiveDraftKey] = useState("");
  const [step, setStep] = useState<StockStep>("choose");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const filteredItems = useMemo(() => filterStockItems(items, itemSearch), [itemSearch, items]);
  const draftKeys = useMemo(() => new Set(drafts.map((draft) => draft.key)), [drafts]);
  const activeDraft = drafts.find((draft) => draft.key === activeDraftKey) ?? drafts[0];
  const currentStep = drafts.length === 0 && step !== "choose" ? "choose" : step;

  function resetWorkflow() {
    setDrafts([]);
    setItemSearch("");
    setCustomName("");
    setActiveDraftKey("");
    setStep("choose");
    setError("");
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) resetWorkflow();
    onOpenChange(nextOpen);
  }

  function addCatalogItem(item: Item) {
    const key = stockItemKey(item);
    if (draftKeys.has(key)) {
      setActiveDraftKey(key);
      setStep("configure");
      return;
    }
    setDrafts((current) => [...current, draftFromItem(item)]);
    setActiveDraftKey(key);
    setStep("configure");
  }

  function addCustomItem() {
    const name = customName.trim();
    if (!name) return;
    const draft = draftFromCustomName(name);
    setDrafts((current) => [...current, draft]);
    setActiveDraftKey(draft.key);
    setStep("configure");
    setCustomName("");
  }

  function updateDraft(key: string, patch: Partial<StockDraft>) {
    setDrafts((current) =>
      current.map((draft) => (draft.key === key ? { ...draft, ...patch } : draft)),
    );
  }

  async function submitStock(event: FormEvent) {
    event.preventDefault();
    if (!drafts.length) return;
    setSaving(true);
    setError("");
    try {
      for (const draft of drafts) {
        const item = draft.item ?? (await createCustomStockItem(draft));
        if (!draft.item) onCustomItemCreated(item);
        await onCreate({
          locationId: location.id,
          itemId: item.id,
          librarySource: item.librarySource,
          quantity: Math.max(Number.parseInt(draft.quantity, 10) || 1, 1),
          priceAmount: Math.max(Number.parseInt(draft.priceAmount, 10) || 0, 0),
          priceUnit: draft.priceUnit,
          availability: draft.availability,
          notes: draft.notes.trim(),
        });
      }
      resetWorkflow();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save shop stock");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      className="max-w-3xl p-4 sm:p-5"
      open={open}
      onOpenChange={handleOpenChange}
      title="Add shop stock"
    >
      <form className="flex max-h-[calc(90vh-7rem)] min-h-0 flex-col gap-3" onSubmit={submitStock}>
        <StepTabs drafts={drafts} step={currentStep} onStepChange={setStep} />
        {drafts.length ? (
          <SelectedStockStrip
            activeDraftKey={activeDraft?.key ?? ""}
            drafts={drafts}
            onSelect={(key) => {
              setActiveDraftKey(key);
              setStep("configure");
            }}
          />
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {currentStep === "choose" ? (
            <ChooseStockStep
              customName={customName}
              draftKeys={draftKeys}
              filteredItems={filteredItems}
              itemSearch={itemSearch}
              onAddCustomItem={addCustomItem}
              onAddItem={addCatalogItem}
              onCustomNameChange={setCustomName}
              onItemSearchChange={setItemSearch}
            />
          ) : null}
          {currentStep === "configure" ? (
            <ConfigureStockStep
              activeDraft={activeDraft}
              drafts={drafts}
              onBack={() => setStep("choose")}
              onRemove={(key) => {
                const nextDrafts = drafts.filter((entry) => entry.key !== key);
                setDrafts(nextDrafts);
                setActiveDraftKey(nextDrafts[0]?.key ?? "");
                if (nextDrafts.length === 0) setStep("choose");
              }}
              onSelectDraft={setActiveDraftKey}
              onUpdateDraft={updateDraft}
            />
          ) : null}
          {currentStep === "review" ? <StockReview drafts={drafts} /> : null}
        </div>
        {error ? <p className="text-sm font-semibold text-destructive">{error}</p> : null}
        <div className="-mx-1 flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border bg-card/95 px-1 pt-3">
          <Button
            type="button"
            icon={ChevronLeft}
            size="sm"
            variant="ghost"
            disabled={currentStep === "choose"}
            onClick={() => setStep(previousStep(currentStep))}
          >
            Back
          </Button>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            {currentStep === "review" ? (
              <Button type="submit" icon={PackagePlus} disabled={saving || !drafts.length}>
                Add {drafts.length || ""} stock {drafts.length === 1 ? "item" : "items"}
              </Button>
            ) : (
              <Button
                type="button"
                disabled={!drafts.length}
                onClick={() => setStep(nextStep(currentStep, drafts.length))}
              >
                {currentStep === "choose" ? "Continue" : "Review"}
              </Button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}

function previousStep(step: StockStep): StockStep {
  if (step === "review") return "configure";
  return "choose";
}

function nextStep(step: StockStep, draftCount: number): StockStep {
  if (step === "choose") return draftCount > 0 ? "configure" : "choose";
  if (step === "configure") return "review";
  return "review";
}

function filterStockItems(items: Item[], search: string) {
  const query = search.trim().toLowerCase();
  if (!query) return items.slice(0, 8);
  return items
    .filter((item) =>
      [item.name, item.category, item.itemType, item.rarity, item.librarySource]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    )
    .slice(0, 8);
}

function draftFromItem(item: Item): StockDraft {
  return {
    key: stockItemKey(item),
    item,
    quantity: "1",
    priceAmount: String(item.valueAmount || 0),
    priceUnit: item.valueUnit || "gp",
    availability: "in-stock",
    notes: "",
  };
}

function draftFromCustomName(name: string): StockDraft {
  return {
    key: stockDraftKey(),
    customName: name,
    quantity: "1",
    priceAmount: "0",
    priceUnit: "gp",
    availability: "in-stock",
    notes: "",
  };
}

function stockDraftKey() {
  return `custom:${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`;
}

async function createCustomStockItem(draft: StockDraft) {
  const { item } = await api.createItem({
    ...blankItemForm,
    name: draft.customName?.trim() || "Custom shop item",
    valueAmount: draft.priceAmount,
    valueUnit: draft.priceUnit,
    description: draft.notes.trim(),
  });
  return item;
}
