export type EventDetails = { full_name: string; phone: string; occupation: string; relationship: string; notes: string };
export type EventDisplay = { clock: "both" | "remaining" | "elapsed"; show_years: boolean; show_repetitions: boolean };
export type CountdownInput = { title: string; category: string; icon: string; target_date: string; target_time: string | null; timezone: string; recurrence: "once" | "daily" | "monthly" | "yearly"; description: string; details: EventDetails; display: EventDisplay };
export type Countdown = CountdownInput & { id: string; repeat_yearly: boolean; next_date: string; next_at: string; original_at: string; days_remaining: number; full_years: number | null; repetitions: number; updated_at: string };
export type EventOccurrence = { date: string; event_at: string; countdown: Countdown };
export const recurrenceLabels = { once: "Однократно", daily: "Ежедневно", monthly: "Ежемесячно", yearly: "Каждый год" };
