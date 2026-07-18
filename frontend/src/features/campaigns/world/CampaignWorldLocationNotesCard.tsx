import { FilePenLine, Pencil, Plus, Trash2 } from "lucide-react";
import { ActionRow, CardSection, SectionHeader } from "../../../components/layout";
import { Button } from "../../../components/ui";
import { CampaignWorldEmptyState } from "./CampaignWorldEmptyState";
import { CampaignWorldNote } from "./CampaignWorldNote";
import type { CampaignLocation } from "./travelTypes";

export function LocationNotesCard({
  location,
  onClearNotes,
  onEditNotes,
  title,
}: {
  location: CampaignLocation;
  onClearNotes?: (location: CampaignLocation) => Promise<void>;
  onEditNotes?: () => void;
  title: string;
}) {
  const hasNotes = location.publicNotes || location.notes || location.dmNotes;
  const noteActions =
    hasNotes && (onEditNotes || onClearNotes) ? (
      <ActionRow justify="end">
        {onEditNotes ? (
          <Button type="button" icon={Pencil} size="sm" variant="secondary" onClick={onEditNotes}>
            Edit notes
          </Button>
        ) : null}
        {onClearNotes ? (
          <Button
            type="button"
            icon={Trash2}
            size="sm"
            variant="secondary"
            onClick={() => void onClearNotes(location)}
          >
            Delete notes
          </Button>
        ) : null}
      </ActionRow>
    ) : undefined;
  return (
    <CardSection>
      <SectionHeader
        action={noteActions}
        icon={FilePenLine}
        title={title}
        meta={hasNotes ? "Prepared notes" : "No notes"}
      />
      {hasNotes ? (
        <div className="mt-3 grid gap-3">
          {(location.publicNotes || location.notes) && (
            <CampaignWorldNote
              label="Player-facing notes"
              value={location.publicNotes || location.notes}
            />
          )}
          {location.dmNotes && (
            <CampaignWorldNote label="DM-only" value={location.dmNotes} secret />
          )}
        </div>
      ) : (
        <div className="mt-3">
          <CampaignWorldEmptyState
            icon={FilePenLine}
            title="No notes yet"
            copy="Add table-facing notes, secrets, and reminders when this place needs prep."
            action={
              onEditNotes ? (
                <Button
                  type="button"
                  icon={Plus}
                  size="sm"
                  variant="secondary"
                  onClick={onEditNotes}
                >
                  Add note
                </Button>
              ) : undefined
            }
          />
        </div>
      )}
    </CardSection>
  );
}
