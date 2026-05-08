import { Info } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { Button, Modal } from "../ui";

export function InfoHelpButton({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Modal
      title={title}
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button
          aria-label={title}
          icon={Info}
          size="sm"
          type="button"
          variant="ghost"
          onClick={() => setOpen(true)}
        />
      }
    >
      <div className="space-y-3 text-sm leading-6 text-muted-foreground">{children}</div>
    </Modal>
  );
}
