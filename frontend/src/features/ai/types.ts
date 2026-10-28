export type Permissions = Record<"analytics" | "tasks" | "habits" | "workouts" | "notes" | "profile" | "intimacy", boolean>;
export type AiConfig = { provider: "openai"; model: string; enabled: boolean; permissions: Permissions; key_present: boolean; revision: number };
export type Chat = { id: string; version: number; created_at: string };
export type ProviderRequest = { model: string; instructions: string; input: { role: "user" | "assistant"; content: string }[]; store: false; max_output_tokens: number };
export type Turn = { id: string; config_revision: number; model: string; status: "pending" | "completed" | "failed" | "cancelled"; error_code: string | null; data: { request: ProviderRequest; answer: string | null; usage: { input_tokens: number | null; output_tokens: number | null; total_tokens: number | null } | null }; created_at: string; finished_at: string | null };
export type Preview = { id: string; expires_at: string; config_revision: number; history_turns: number; request: ProviderRequest };
export const noPermissions: Permissions = { analytics: false, tasks: false, habits: false, workouts: false, notes: false, profile: false, intimacy: false };
export const scopes: [keyof Permissions, string, string][] = [
  ["analytics", "Числовая аналитика", "Результаты задач, привычек, тренировок, Pomodoro и действия по дням; без названий и личных текстов."],
  ["tasks", "Задачи и расписания", "До 100 появлений ручных задач за период и 50 задач без расписания: названия, описания, теги, сроки, правила и результаты."],
  ["habits", "Привычки", "Результаты, серии, подпривычки и рейтинг до 10 привычек с названиями за выбранный период."],
  ["workouts", "Тренировки", "Числа завершённых, частичных и отменённых сессий, повторения и фактическое время за период."],
  ["notes", "Тексты заметок", "30 последних изменённых заметок, до 4000 символов каждой. Markdown передаётся текстом, фотографии не передаются."],
  ["profile", "Полная анкета профиля", "Все заполненные поля, включая имя, здоровье, лекарства и интимные измерения. Проверьте точный предпросмотр перед отправкой."],
  ["intimacy", "Интимная сводка", "Только количества по типам, активные дни и известная длительность; без имён, анкет, эмоций и личных текстов."],
];
