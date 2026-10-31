export type Exercise = { title: string; kind: "repetitions" | "duration" | "repetitions_duration"; description: string; images: string[]; sources: string[] };
export type Progression = { start_date: string; days: number; target_repetitions: number; target_duration_seconds: number };
export type Entry = { id: string; exercise_id: string; repetitions: number; duration_seconds: number; rest_seconds: number; progression: Progression | null; intensity?: string };
export type Round = { id: string; title: string; repeat: number; rest_seconds: number; exercises: Entry[] };
export type Workout = { title: string; description: string; tags: string[]; rounds: Round[] };
export type RecordData<T> = { ai_shared?: boolean; ai_access_revision?: number; id: string; data: T; created_at: string; updated_at: string };
export type Step = { title: string; intensity?: string; round_title: string; cycle: number; entry_id: string | null; exercise: Exercise | null; repetitions: number; seconds_per_repetition: number; duration_seconds: number };
export type StepResult = { step_index: number; status: "completed" | "skipped"; elapsed_seconds: number; actual_repetitions: number; ended_at: string };
export type WorkoutSession = { id: string; workout_id: string; habit_id: string | null; occurrence_date: string | null; snapshot: { plan: Workout; date: string; steps: Step[] }; status: "running" | "paused" | "completed" | "partial" | "cancelled"; step_index: number; elapsed_seconds: number; results: StepResult[]; revision: number; note: string; habit_completed: boolean; started_at: string; ended_at: string | null };
export const kindLabels: Record<Exercise["kind"], string> = { repetitions: "Повторения", duration: "Время", repetitions_duration: "Повторения × время" };
export const sessionLabels: Record<WorkoutSession["status"], string> = { running: "Выполняется", paused: "Пауза", completed: "Завершено", partial: "Выполнено частично", cancelled: "Остановлено" };
export function newEntry(exercise: RecordData<Exercise>): Entry { return { id: crypto.randomUUID(), exercise_id: exercise.id, repetitions: exercise.data.kind === "duration" ? 0 : 10, duration_seconds: exercise.data.kind === "repetitions" ? 0 : 30, rest_seconds: 0, progression: null }; }
export function newRound(): Round { return { id: crypto.randomUUID(), title: "Круг", repeat: 1, rest_seconds: 0, exercises: [] }; }
export function formatTime(seconds: number) { return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`; }
export function moveItem<T>(items: T[], index: number, delta: number): T[] { const result = [...items]; [result[index], result[index + delta]] = [result[index + delta]!, result[index]!]; return result; }

export type SessionSummary = { id: string; workout_id: string; title: string; date: string; status: WorkoutSession["status"]; confirmed_steps: number; habit_completed: boolean; started_at: string; ended_at: string | null };
