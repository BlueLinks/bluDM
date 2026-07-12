export function CampaignWorldNote({
  label,
  value,
  secret = false,
}: {
  label: string;
  value: string;
  secret?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-md border px-3 py-2 text-sm",
        secret ? "border-warning/30 bg-warning/10" : "border-border bg-background",
      ].join(" ")}
    >
      <div className="text-xs font-bold uppercase text-muted-foreground">{label}</div>
      <p className="mt-1 text-muted-foreground">{value}</p>
    </div>
  );
}
