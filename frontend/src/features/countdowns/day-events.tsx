import { Link } from "react-router";
import { Markdown } from "@/components/markdown";
import type { EventOccurrence } from "./types";
export function DayEvents({ events, timezone }: { events: EventOccurrence[]; timezone: string }) {
  if (!events.length) return null;
  return <section aria-label="События дня" className="mb-6 space-y-3"><h2 className="text-xl font-semibold">События дня</h2>{events.map(e => <article key={`${e.countdown.id}-${e.event_at}`} className="min-w-0 rounded-xl border border-primary/25 bg-card p-4"><Link to="/countdowns" className="break-words font-medium text-primary">{e.countdown.title}</Link><p className="mt-1 text-xs text-muted-foreground">{e.countdown.category} · {e.countdown.target_time ? new Intl.DateTimeFormat("ru", { timeZone: timezone, hour: "2-digit", minute: "2-digit" }).format(new Date(e.event_at)) : "Весь день"}</p>{e.countdown.description && <Markdown value={e.countdown.description} />}</article>)}</section>;
}
