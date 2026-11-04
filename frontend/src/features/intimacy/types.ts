import { t } from "@/systems/i18n/locale";
import { zonedDateTimeInput } from "@/lib/dates";
export type Kind = "sex" | "masturbation";
export type Partner = { protection_used: boolean | null; gender: string; name: string; positions: string[]; sex_types: string[] };
export type Solo = { porn_sources: string[]; feelings_after: string };
export type EntryData = {
  kind: Kind; local_start: string; timezone: string; time_occurrence: "earlier" | "later";
  duration_minutes: number | null; toys: string[];
  lubricant_used: boolean | null; setting: string; was_clothed: boolean | null;
  emotions: string[]; repeat_desired: boolean | null; note: string; partner: Partner | null; solo: Solo | null;
};
export type Entry = { id: string; started_at: string; data: EntryData; revision: number; created_at: string; updated_at: string };
export type Answers = { yes: number; no: number; unknown: number };
export type Statistics = {
  total: number; sex: number; masturbation: number; active_days: number;
  duration_minutes: number; duration_answers: number; average_duration_minutes: number | null;
  ejaculations: number; ejaculation_answers: number; with_toys: number;
  repeat_desired: Answers; lubricant_used: Answers; protection_used: Answers;
  emotions: Record<string, number>; days: Record<string, { sex: number; masturbation: number }>;
};
export type Journal = { from: string; to: string; timezone: string; offset: number; limit: number; total: number; entries: Entry[]; statistics: Statistics };
export const kindLabel = (kind: Kind) => kind === "sex" ? t("Секс") : t("Мастурбация");
export const answerLabel = (value: boolean | null) => value === null ? t("Не указано") : value ? t("Да") : t("Нет");
export function localInput(timezone: string, date: string | number = Date.now()) { return zonedDateTimeInput(date, timezone); }
export function newEntry(timezone: string): EntryData {
  return { kind: "masturbation", local_start: localInput(timezone), timezone, time_occurrence: "earlier", duration_minutes: null, toys: [], lubricant_used: null, setting: "", was_clothed: null, emotions: [], repeat_desired: null, note: "", partner: null, solo: { porn_sources: [], feelings_after: "" } };
}
