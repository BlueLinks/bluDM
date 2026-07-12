import { applyShopTemplateDefaults } from "./campaignWorldShopTemplates";

export function nextShopTemplateDraft({
  currentKey,
  dmNotes,
  mapMarker,
  publicNotes,
  summary,
  tags,
  nextKey,
}: {
  currentKey: string;
  dmNotes: string;
  mapMarker: string;
  publicNotes: string;
  summary: string;
  tags: string;
  nextKey: string;
}) {
  return applyShopTemplateDefaults(
    { dmNotes, mapMarker, publicNotes, summary, tags },
    currentKey,
    nextKey,
  );
}
