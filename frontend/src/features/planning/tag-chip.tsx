function readableTagText(color: string) {
  const value = color.replace("#", "");
  const channel = (index: number) => { const n = parseInt(value.slice(index, index + 2), 16) / 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; };
  return .2126 * channel(0) + .7152 * channel(2) + .0722 * channel(4) > .179 ? "#111827" : "#ffffff";
}
export function TagChip({ name, color = "#6366F1" }: { name: string; color?: string }) {
  return <span className="inline-flex max-w-full items-center rounded-md px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: color, color: readableTagText(color) }}><span className="truncate">{name}</span></span>;
}
