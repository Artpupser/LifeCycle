export type Settings = {
  timezone: string;
  language: "ru";
  theme: "system" | "light" | "dark";
  reminders_enabled: boolean;
  reminder_minutes_before: number;
  week_starts_on: "monday" | "sunday";
  pomodoro_work_minutes: number;
  pomodoro_break_minutes: number;
};
