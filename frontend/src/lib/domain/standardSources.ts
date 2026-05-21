export function standardSourceDisplayName(source: { key: string; label: string }) {
  switch (source.key) {
    case "srd-2014":
      return "5e SRD (2014)";
    case "srd-5-2-1":
      return "5.5e / 2024 SRD (5.2.1)";
    default:
      return source.label;
  }
}
