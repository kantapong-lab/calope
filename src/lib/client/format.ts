import { th } from "@/copy/th";

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function dayLabel(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (days === 0) return th.history.today;
  if (days === 1) return th.history.yesterday;
  return date.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
}

export function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function groupByDay<T extends { created_at: string }>(items: T[], now: Date = new Date()) {
  const groups: { label: string; items: T[] }[] = [];
  for (const item of items) {
    const label = dayLabel(item.created_at, now);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }
  return groups;
}
