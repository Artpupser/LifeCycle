export type Settings = {
  timezone: string;
  time_format: "12h" | "24h";
  language: "ru";
  theme: "system" | "light" | "dark";
  reminders_enabled: boolean;
  reminder_minutes_before: number;
  week_starts_on: "monday" | "sunday";
  pomodoro_work_minutes: number;
  pomodoro_break_minutes: number;
};
