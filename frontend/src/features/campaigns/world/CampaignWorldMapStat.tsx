import type React from "react";
import { MetricCard } from "../../../components/layout";

export function MapStat({
  label,
  tone = "secondary",
  value,
}: {
  label: string;
  tone?: "accent" | "neutral" | "primary" | "secondary" | "tertiary";
  value: React.ReactNode;
}) {
  return <MetricCard label={label} tone={tone} value={value} />;
}
