import { ShieldCheck } from "lucide-react";
import { Callout, SectionPanel } from "../components/ui";
import type { ImportExportPreview } from "../lib/api/importExport";

export function ArchiveVerificationPanel({ preview }: { preview: ImportExportPreview }) {
  const restore = preview.restoreReadiness;
  const verification = preview.verification;
  const rows = [
    ["Archive valid", verification.archiveValid],
    ["Database safe", restore.databaseSafe],
    ["Dependencies complete", verification.dependenciesComplete],
    ["Assets verified", verification.assetsVerified],
    ["Ready to restore", restore.ready],
  ] as const;
  return (
    <SectionPanel title="Restore Readiness" icon={ShieldCheck}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {rows.map(([label, ok]) => (
          <div className="rounded-md border border-border bg-background p-3" key={label}>
            <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
            <p className={["mt-1 font-semibold", ok ? "text-success" : ""].join(" ")}>
              {ok ? "Ready" : "Needs attention"}
            </p>
          </div>
        ))}
      </div>
      {[...verification.messages, ...restore.messages].length > 0 && (
        <div className="mt-4 grid gap-2">
          {[...verification.messages, ...restore.messages].map((message) => (
            <Callout key={message}>{message}</Callout>
          ))}
        </div>
      )}
    </SectionPanel>
  );
}
