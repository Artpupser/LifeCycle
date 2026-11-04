import { t } from "@/systems/i18n/locale";
export type EventDetails = { full_name: string; phone: string; occupation: string; relationship: string; notes: string };
export type EventDisplay = { unit?:import("@/lib/dates").CountdownUnit; clock: "both" | "remaining" | "elapsed"; show_years: boolean; show_repetitions: boolean };
export type CountdownInput = { title: string; category: string; tags?: string[]; icon: string; target_date: string; target_time: string | null; timezone: string; recurrence: "once" | "daily" | "monthly" | "yearly"; description: string; contact_id?: string | null; contact_birthday?: boolean; details: EventDetails; display: EventDisplay };
export type Countdown = Omit<CountdownInput, "target_date"> & { target_date: string | null; id: string; repeat_yearly: boolean; next_date: string | null; next_at: string | null; original_at: string | null; days_remaining: number | null; full_years: number | null; repetitions: number; updated_at: string; contact_name: string | null; contact_birthday: boolean; suspended: boolean; computed_at: string };
export type EventOccurrence = { date: string; event_at: string; countdown: Countdown };
export const recurrenceLabels = { get once() { return t("Однократно"); }, get daily() { return t("Ежедневно"); }, get monthly() { return t("Ежемесячно"); }, get yearly() { return t("Каждый год"); } };
