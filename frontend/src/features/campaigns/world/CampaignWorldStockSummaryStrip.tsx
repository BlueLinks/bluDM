import { StatChip } from "../../../components/shared/displayPrimitives";

export function StockSummaryStrip({
  inventoryTotal,
  limitedCount,
  marketPriceCount,
  pricedCount,
  soldOutCount,
}: {
  inventoryTotal: number;
  limitedCount: number;
  marketPriceCount: number;
  pricedCount: number;
  soldOutCount: number;
}) {
  const stats = [
    { label: "Units", value: inventoryTotal, tone: "secondary" as const },
    ...(pricedCount ? [{ label: "Priced", value: pricedCount, tone: "tertiary" as const }] : []),
    ...(marketPriceCount
      ? [{ label: "Market price", value: marketPriceCount, tone: "accent" as const }]
      : []),
    ...(limitedCount
      ? [{ label: "Limited/hidden", value: limitedCount, tone: "warning" as const }]
      : []),
    ...(soldOutCount ? [{ label: "Sold out", value: soldOutCount, tone: "warning" as const }] : []),
  ];

  return (
    <div className="mt-3 flex flex-wrap gap-2 rounded-md border border-border bg-background/70 p-2">
      {stats.map((stat) => (
        <StatChip
          key={stat.label}
          label={stat.label}
          tone={stat.tone ?? "secondary"}
          value={stat.value}
        />
      ))}
    </div>
  );
}
