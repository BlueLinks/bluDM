import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import {
  Archive,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Pencil,
  Plus,
  Swords,
  Trash2,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { ActionIcon } from "../../components/shared/ActionIcon";
import { ActionIconPicker } from "../../components/shared/ActionIconPicker";
import { Badge, Button, Field, FloatingInput, Modal, Select, Textarea } from "../../components/ui";
import {
  actionTypes,
  commonWeapons,
  hitSpecialEvents,
  missEffects,
} from "../../lib/domain/options";
import { formatRolls } from "../../lib/domain/forms";
import type { ActionFormState, ActionTemplate, CommonWeapon, CreatureAction } from "../../types";
import { ActionRollEditor } from "./ActionRollEditor";

export function ActionMiniFields({
  value,
  onChange,
}: {
  value: ActionFormState;
  onChange: (value: ActionFormState) => void;
}) {
  return (
    <>
      <FloatingInput
        label="Template name"
        value={value.name}
        onChange={(name) => onChange({ ...value, name })}
        required
      />
      <ActionIconPicker value={value} onChange={(next) => onChange({ ...value, ...next })} />
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Action type">
          <Select
            options={actionTypes}
            placeholder="Type"
            value={value.actionType}
            onValueChange={(actionType) => onChange({ ...value, actionType })}
          />
        </Field>
        <Field label="Miss effect">
          <Select
            options={missEffects}
            placeholder="Miss effect"
            value={value.missEffect}
            onValueChange={(missEffect) => onChange({ ...value, missEffect })}
          />
        </Field>
        <Field label="Special event">
          <Select
            options={hitSpecialEvents}
            placeholder="Special event"
            value={value.hitSpecialEvent}
            onValueChange={(hitSpecialEvent) => onChange({ ...value, hitSpecialEvent })}
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <FloatingInput
          icon={Swords}
          label="Attack mod"
          type="number"
          value={value.attackModifier}
          onChange={(attackModifier) => onChange({ ...value, attackModifier })}
        />
        <FloatingInput
          icon={Zap}
          label="Reach"
          type="number"
          value={value.reach}
          onChange={(reach) => onChange({ ...value, reach })}
        />
        <FloatingInput
          icon={Zap}
          label="Range"
          type="number"
          value={value.range}
          onChange={(range) => onChange({ ...value, range })}
        />
        <FloatingInput
          icon={Zap}
          label="AOE size"
          type="number"
          value={value.aoeSize}
          onChange={(aoeSize) => onChange({ ...value, aoeSize })}
        />
        <FloatingInput
          icon={Archive}
          label="Uses"
          type="number"
          value={value.limitedUses}
          onChange={(limitedUses) => onChange({ ...value, limitedUses })}
        />
        <Field label="Limit">
          <Select
            options={[
              { value: "day", label: "/day" },
              { value: "turn", label: "/turn" },
            ]}
            placeholder="Limit"
            value={value.limitType}
            onValueChange={(limitType) => onChange({ ...value, limitType })}
          />
        </Field>
      </div>
      <ActionRollEditor rolls={value.rolls} onChange={(rolls) => onChange({ ...value, rolls })} />
      <Field label="Description">
        <Textarea
          maxLength={2000}
          rows={3}
          value={value.description}
          onChange={(event) => onChange({ ...value, description: event.target.value })}
        />
      </Field>
    </>
  );
}

export function WeaponMenu({ onAdd }: { onAdd: (weapon: CommonWeapon) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      title="Add common weapon"
      trigger={
        <Button type="button" icon={Plus} variant="success">
          Add weapon
        </Button>
      }
    >
      <div className="grid gap-2">
        {commonWeapons.map((weapon) => (
          <button
            className="rounded-md border border-border bg-background p-3 text-left text-sm transition hover:bg-muted"
            key={weapon.name}
            type="button"
            onClick={() => {
              onAdd(weapon);
              setOpen(false);
            }}
          >
            <span className="font-semibold">{weapon.name}</span>
            <span className="mt-1 block text-xs text-muted-foreground">
              {weapon.diceCount}d{weapon.dieSize} {weapon.damageType}. Uses{" "}
              {weapon.ability === "finesse"
                ? "STR or DEX, whichever is higher"
                : weapon.ability.toUpperCase()}{" "}
              plus estimated proficiency.
            </span>
          </button>
        ))}
      </div>
    </Modal>
  );
}

export function ActionSummary({
  action,
  onEdit,
  onDelete,
}: {
  action: ActionTemplate | CreatureAction;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <ActionIcon action={action} className="h-9 w-9" />
          <div className="min-w-0">
            <h4 className="truncate font-semibold">{action.name}</h4>
            <p className="text-xs text-muted-foreground">
              {actionTypes.find((type) => type.value === action.actionType)?.label ?? "Action"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge>{formatRolls(action.rolls)}</Badge>
          {onEdit && <Button icon={Pencil} size="sm" variant="secondary" onClick={onEdit} />}
          {onDelete && <Button icon={Trash2} size="sm" variant="danger" onClick={onDelete} />}
        </div>
      </div>
    </div>
  );
}

export function SortableActionEditor({
  action,
  index,
  onChange,
  onRemove,
  onSaveAsNew,
  onSaveToBank,
  onOverwriteSource,
}: {
  action: ActionFormState;
  index: number;
  onChange: (action: ActionFormState) => void;
  onRemove: () => void;
  onSaveAsNew?: (action: ActionFormState) => void;
  onSaveToBank?: (action: ActionFormState) => void;
  onOverwriteSource?: (action: ActionFormState) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: action.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const [expanded, setExpanded] = useState(!action.name.trim());

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-lg border border-border bg-background p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <button
          className="cursor-grab rounded-md border border-border p-2 active:cursor-grabbing"
          type="button"
          {...attributes}
          {...listeners}
          title="Reorder action"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <ActionIcon action={action} className="h-8 w-8" />
            <h4 className="truncate font-semibold">
              {action.name.trim() || `Unnamed action ${index + 1}`}
            </h4>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {action.sourceTemplateId ? "Banked copy" : "Creature action"} ·{" "}
            {formatRolls(action.rolls)}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {action.sourceTemplateId && onOverwriteSource && (
            <Button
              type="button"
              icon={Archive}
              variant="secondary"
              size="sm"
              onClick={() => onOverwriteSource(action)}
            >
              Overwrite bank
            </Button>
          )}
          {onSaveToBank && !action.sourceTemplateId && (
            <Button
              type="button"
              icon={Archive}
              variant="secondary"
              size="sm"
              onClick={() => onSaveToBank(action)}
            >
              Save to bank
            </Button>
          )}
          {onSaveAsNew && (
            <Button
              type="button"
              icon={Plus}
              variant="secondary"
              size="sm"
              onClick={() => onSaveAsNew(action)}
            >
              Save as new
            </Button>
          )}
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? "Collapse" : "Edit"}{" "}
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
        <Button type="button" icon={Trash2} variant="danger" size="sm" onClick={onRemove}>
          Remove
        </Button>
      </div>
      {expanded && <ActionEditFields action={action} onChange={onChange} />}
    </div>
  );
}

function ActionEditFields({
  action,
  onChange,
}: {
  action: ActionFormState;
  onChange: (action: ActionFormState) => void;
}) {
  return (
    <div className="mt-4 grid gap-4">
      <FloatingInput
        label="Name"
        value={action.name}
        onChange={(name) => onChange({ ...action, name })}
      />
      <ActionIconPicker value={action} onChange={(next) => onChange({ ...action, ...next })} />
      <ActionTypeFields action={action} onChange={onChange} />
      <ActionNumberFields action={action} onChange={onChange} />
      <FloatingInput
        label="Recharge"
        value={action.recharge}
        onChange={(recharge) => onChange({ ...action, recharge })}
        placeholder="5-6, short rest, long rest"
      />
      <Field label="Description">
        <Textarea
          maxLength={2000}
          rows={3}
          value={action.description}
          onChange={(event) => onChange({ ...action, description: event.target.value })}
        />
      </Field>
      <ActionRollEditor rolls={action.rolls} onChange={(rolls) => onChange({ ...action, rolls })} />
    </div>
  );
}

function ActionTypeFields({
  action,
  onChange,
}: {
  action: ActionFormState;
  onChange: (action: ActionFormState) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <Field label="Type of action">
        <Select
          options={actionTypes}
          placeholder="Action type"
          value={action.actionType}
          onValueChange={(actionType) => onChange({ ...action, actionType })}
        />
      </Field>
      <Field label="Miss effect">
        <Select
          options={missEffects}
          placeholder="Miss effect"
          value={action.missEffect}
          onValueChange={(missEffect) => onChange({ ...action, missEffect })}
        />
      </Field>
      <Field label="Special event">
        <Select
          options={hitSpecialEvents}
          placeholder="Special event"
          value={action.hitSpecialEvent}
          onValueChange={(hitSpecialEvent) => onChange({ ...action, hitSpecialEvent })}
        />
      </Field>
    </div>
  );
}

function ActionNumberFields({
  action,
  onChange,
}: {
  action: ActionFormState;
  onChange: (action: ActionFormState) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <FloatingInput
        icon={Swords}
        label="Attack mod"
        type="number"
        value={action.attackModifier}
        onChange={(attackModifier) => onChange({ ...action, attackModifier })}
      />
      <FloatingInput
        icon={Zap}
        label="Reach"
        type="number"
        value={action.reach}
        onChange={(reach) => onChange({ ...action, reach })}
      />
      <FloatingInput
        icon={Zap}
        label="Range"
        type="number"
        value={action.range}
        onChange={(range) => onChange({ ...action, range })}
      />
      <FloatingInput
        icon={Zap}
        label="AOE size"
        type="number"
        value={action.aoeSize}
        onChange={(aoeSize) => onChange({ ...action, aoeSize })}
      />
      <FloatingInput
        icon={Archive}
        label="Uses"
        type="number"
        value={action.limitedUses}
        onChange={(limitedUses) => onChange({ ...action, limitedUses })}
      />
      <Field label="Limit">
        <Select
          options={[
            { value: "day", label: "/day" },
            { value: "turn", label: "/turn" },
          ]}
          placeholder="Limit"
          value={action.limitType}
          onValueChange={(limitType) => onChange({ ...action, limitType })}
        />
      </Field>
    </div>
  );
}
