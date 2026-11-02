import { t } from "@/systems/i18n/locale";
export type Program = { work_seconds: number; chill_seconds: number; more_chill_seconds: number; sequence: ("w" | "c" | "mc")[]; repeat: boolean };
export type PomodoroConfig = { id: string; name: string; data: Program; revision: number };
export type ProgramState = { run_id: string; name: string; interval_index: number; sequence_length: number; cycle: number; next_kind: "w" | "c" | "mc" | null; next_duration_seconds: number | null; repeat: boolean; revision: number; history_pending: number };
export type Session = { id: string; task_id: string | null; phase: "work" | "break"; status: "running" | "paused" | "completed" | "cancelled"; duration_seconds: number; elapsed_seconds: number; started_at: string; ended_at: string | null; run_id: string | null; interval_index: number | null; interval_kind: "w" | "c" | "mc" | null; program_name: string | null; program: ProgramState | null };
export const kindLabels = { get w() { return t("Работа"); }, get c() { return t("Обычный отдых"); }, get mc() { return t("Продолжительный отдых"); } };
export { durationLabel } from "@/lib/dates";
