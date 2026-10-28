import { HabitsPage } from "@/features/habits/habits-page";
import { WorkoutsPage } from "@/features/workouts/workouts-page";
import { WorkoutSessionPage } from "@/features/workouts/workout-session-page";
import { HabitReminders } from "@/features/habits/reminders";
import { Activity, CalendarDays, CalendarClock, ClipboardList, LogOut, NotebookPen, Settings2, Timer, UserRound } from "lucide-react";
import { useState, type ReactNode } from "react";
import { BrowserRouter, Link, Navigate, NavLink, Route, Routes } from "react-router";
import logo from "@/assets/logo.svg";
import { ErrorState, LoadingState } from "@/components/resource-state";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-context";
import { AuthProvider } from "@/features/auth/auth-provider";
import { LoginPage } from "@/features/auth/login-page";
import { CountdownsPage } from "@/features/countdowns/countdowns-page";
import { NotesPage } from "@/features/notes/notes-page";
import { PomodoroPage } from "@/features/pomodoro/pomodoro-page";
import { TasksPage } from "@/features/planning/tasks-page";
import { TodayPage } from "@/features/planning/today-page";
import { CalendarPage } from "@/features/planning/calendar-page";
import { HealthPage } from "@/features/health/health-page";
import { ProfilePage } from "@/features/profile/profile-page";
import { PreferencesProvider } from "@/features/settings/preferences-provider";
import { SettingsPage } from "@/features/settings/settings-page";
import type { Settings } from "@/features/settings/types";
import { useResource } from "@/hooks/use-resource";
import { errorMessage } from "@/lib/api";

function Shell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function logout() {
    setPending(true); setError(null);
    try { await signOut(); } catch (failure) { setError(errorMessage(failure)); }
    finally { setPending(false); }
  }

  const navigation = user ? [{ to: "/today", label: "Сегодня", icon: CalendarDays }, { to: "/habits", label: "Привычки", icon: Activity }, { to: "/workouts", label: "Тренировки", icon: Activity }, { to: "/tasks", label: "Задачи", icon: ClipboardList }, { to: "/calendar", label: "Календарь", icon: CalendarDays }, { to: "/notes", label: "Заметки", icon: NotebookPen }, { to: "/countdowns", label: "Отсчёты", icon: CalendarClock }, { to: "/pomodoro", label: "Pomodoro", icon: Timer }, { to: "/profile", label: "Профиль", icon: UserRound }, { to: "/settings", label: "Настройки", icon: Settings2 }, { to: "/status", label: "Подключение", icon: Activity }] : [{ to: "/login", label: "Войти", icon: UserRound }, { to: "/status", label: "Подключение", icon: Activity }];

  return <div className="flex min-h-svh flex-col bg-background text-foreground">
    <a href="#main" className="sr-only z-50 rounded-lg bg-primary px-4 py-3 text-primary-foreground focus:not-sr-only focus:absolute focus:left-4 focus:top-4">Перейти к содержимому</a>
    <header className="border-b border-border">
      <div className="mx-auto flex min-h-22 max-w-6xl flex-wrap items-center justify-between gap-x-5 gap-y-3 px-5 py-5 sm:px-10">
        <Link to={user ? "/today" : "/login"} className="flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-ring" aria-label="LifeCycle — главная"><img src={logo} alt="" width="38" height="38" /><span className="text-xl font-semibold tracking-tight">LifeCycle<span className="text-primary">.</span></span></Link>
        <div className="flex items-center gap-3"><span className="hidden max-w-56 truncate text-xs text-muted-foreground lg:block" title={user?.email}>{user?.email ?? "Меньше рутины. Больше жизни."}</span>{user && <Button variant="outline" size="sm" onClick={() => void logout()} disabled={pending}><LogOut aria-hidden="true" />{pending ? "Выходим…" : "Выйти"}</Button>}</div>
        <nav aria-label="Главная навигация" className="-mb-1 flex w-full flex-wrap gap-1 pt-1 sm:order-none sm:w-auto sm:pt-0">{navigation.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => `inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring ${isActive ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}><Icon className="size-4" aria-hidden="true" />{label}</NavLink>)}</nav>
      </div>
      {error && <p className="mx-auto max-w-6xl px-5 pb-4 text-sm text-destructive sm:px-10" role="alert">{error}</p>}
    </header>
    <div className="flex-1">{children}</div>
    <footer className="mx-auto w-full max-w-6xl px-5 pb-8 pt-12 text-xs text-muted-foreground sm:px-10">Ваш день, в вашем ритме.</footer>
  </div>;
}

function NotFound() {
  return <main id="main" className="mx-auto max-w-4xl px-5 py-16 sm:px-10"><p className="mb-3 text-sm text-primary">404</p><h1 className="text-3xl font-semibold">Страница не найдена</h1><Link to="/" className="mt-6 inline-block text-primary underline underline-offset-4">Вернуться на главную</Link></main>;
}

function AuthenticatedApp() {
  const { resource, retry } = useResource<Settings>("/settings");
  if (resource.status !== "ready") return <Shell><Routes><Route path="/status" element={<HealthPage />} /><Route path="*" element={<main id="main" className="mx-auto max-w-4xl px-5 py-10 sm:px-10">{resource.status === "loading" ? <LoadingState /> : <ErrorState message={resource.message} retry={retry} />}</main>} /></Routes></Shell>;
  return <PreferencesProvider initial={resource.data}><Shell><HabitReminders /><Routes>
    <Route path="/" element={<Navigate to="/today" replace />} />
    <Route path="/login" element={<Navigate to="/today" replace />} />
    <Route path="/today" element={<TodayPage />} />
    <Route path="/tasks" element={<TasksPage />} />
    <Route path="/habits" element={<HabitsPage />} />
    <Route path="/workouts" element={<WorkoutsPage />} />
    <Route path="/workouts/session/:id" element={<WorkoutSessionPage />} />
    <Route path="/calendar" element={<CalendarPage />} />
    <Route path="/notes" element={<NotesPage />} />
    <Route path="/countdowns" element={<CountdownsPage />} />
    <Route path="/pomodoro" element={<PomodoroPage />} />
    <Route path="/profile" element={<ProfilePage />} />
    <Route path="/settings" element={<SettingsPage />} />
    <Route path="/status" element={<HealthPage />} />
    <Route path="*" element={<NotFound />} />
  </Routes></Shell></PreferencesProvider>;
}

function AppContent() {
  const { user, loading, error, reload } = useAuth();
  if (loading || error) return <Shell><Routes><Route path="/status" element={<HealthPage />} /><Route path="*" element={<main id="main" className="mx-auto max-w-4xl px-5 py-10 sm:px-10">{loading ? <LoadingState /> : <ErrorState message={error!} retry={reload} />}</main>} /></Routes></Shell>;
  if (user) return <AuthenticatedApp key={user.id} />;
  return <Shell><Routes><Route path="/status" element={<HealthPage />} /><Route path="/login" element={<LoginPage />} /><Route path="/" element={<Navigate to="/login" replace />} /><Route path="/profile" element={<Navigate to="/login" replace />} /><Route path="/settings" element={<Navigate to="/login" replace />} /><Route path="/today" element={<Navigate to="/login" replace />} /><Route path="/tasks" element={<Navigate to="/login" replace />} /><Route path="/habits" element={<Navigate to="/login" replace />} /><Route path="/workouts/*" element={<Navigate to="/login" replace />} /><Route path="/calendar" element={<Navigate to="/login" replace />} /><Route path="/notes" element={<Navigate to="/login" replace />} /><Route path="/countdowns" element={<Navigate to="/login" replace />} /><Route path="/pomodoro" element={<Navigate to="/login" replace />} /><Route path="*" element={<NotFound />} /></Routes></Shell>;
}

export function App() {
  return <BrowserRouter><AuthProvider><AppContent /></AuthProvider></BrowserRouter>;
}
