import { t, useLanguage } from "@/systems/i18n/locale";
import { AppIcon } from "@/systems/icons/app-icon";
import { usePreferences } from "@/features/settings/preferences-context";
import { instantLabel } from "@/lib/dates";
import { Link } from "react-router";
import { Markdown } from "@/components/markdown";
import type { EventOccurrence } from "./types";
export function DayEvents({ events, timezone }: { events: EventOccurrence[]; timezone: string }) {
  useLanguage();
  const { settings } = usePreferences();
  if (!events.length) return null;
  return <section aria-label={t("События дня")} className="mb-6 space-y-3"><h2 className="text-xl font-semibold">{t("События дня")}</h2>{events.map(e => <article key={`${e.countdown.id}-${e.event_at}`} className="min-w-0 rounded-xl border border-primary/25 bg-card p-4"><AppIcon icon={e.countdown.icon} className="mr-2"/><Link to="/countdowns" className="break-words font-medium text-primary">{e.countdown.title}</Link><p className="mt-1 text-xs text-muted-foreground">{e.countdown.category} · {e.countdown.target_time ? instantLabel(e.event_at, timezone, settings.time_format) : t("Весь день")}</p>{e.countdown.description && <Markdown value={e.countdown.description} />}</article>)}</section>;
}
