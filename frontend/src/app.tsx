import { SidebarNavigation } from "@/components/sidebar-navigation";
import { FeedbackProvider } from "@/components/feedback-provider";
import { AiPage } from "@/features/ai/ai-page";
import { AnalyticsPage } from "@/features/analytics/analytics-page";
import { IntimacyPage } from "@/features/intimacy/intimacy-page";
import { HabitsPage } from "@/features/habits/habits-page";
import { WorkoutsPage } from "@/features/workouts/workouts-page";
import { WorkoutSessionPage } from "@/features/workouts/workout-session-page";
import { HabitReminders } from "@/features/habits/reminders";
import { Heart, Activity, CalendarDays, CalendarClock, BookUser, ClipboardList, LogOut, NotebookPen, Settings2, Timer, UserRound, Menu, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from "react-router";
import logo from "@/assets/logo.svg";
import { ErrorState, LoadingState } from "@/components/resource-state";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-context";
import { AuthProvider } from "@/features/auth/auth-provider";
import { LoginPage } from "@/features/auth/login-page";
import { CountdownsPage } from "@/features/countdowns/countdowns-page";
import { ContactsPage } from "@/features/contacts/contacts-page";
import { NotesPage } from "@/features/notes/notes-page";
import { PomodoroPage } from "@/features/pomodoro/pomodoro-page";
import { BoardsPage } from "@/features/planning/boards-page";
import { TaskTagsPage } from "@/features/planning/task-tags-page";
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
  const [expanded, setExpanded] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const outside = (event: PointerEvent) => document.querySelectorAll<HTMLDetailsElement>("details[data-menu][open]").forEach((menu) => { if (event.target instanceof Node && !menu.contains(event.target)) menu.open = false; });
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") document.querySelectorAll<HTMLDetailsElement>("details[data-menu][open]").forEach((menu) => { menu.open = false; }); };
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, []);

  async function logout() {
    setPending(true); setError(null);
    try { await signOut(); } catch (failure) { setError(errorMessage(failure)); }
    finally { setPending(false); }
  }

  const navigation = user ? [{ to: "/today", label: "Сегодня", icon: CalendarDays }, { to: "/habits", label: "Привычки", icon: Activity }, { to: "/workouts", label: "Тренировки", icon: Activity }, { to: "/sex", label: "Интимный журнал", icon: Heart }, { to: "/tasks", label: "Задачи", icon: ClipboardList }, { to: "/calendar", label: "Календарь", icon: CalendarDays }, { to: "/notes", label: "Заметки", icon: NotebookPen }, { to: "/countdowns", label: "Отсчёты", icon: CalendarClock }, { to: "/contacts", label: "Контакты", icon: BookUser }, { to: "/pomodoro", label: "Pomodoro", icon: Timer }, { to: "/analytics", label: "Аналитика", icon: Activity }, { to: "/ai", label: "AI-помощник", icon: Activity }, { to: "/profile", label: "Профиль", icon: UserRound }, { to: "/settings", label: "Настройки", icon: Settings2 }, { to: "/status", label: "Подключение", icon: Activity }] : [{ to: "/login", label: "Войти", icon: UserRound }, { to: "/status", label: "Подключение", icon: Activity }];

  return <div className="app-shell h-svh overflow-hidden bg-background text-foreground">
    <a href="#main" className="sr-only z-50 rounded-lg bg-primary px-4 py-3 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Перейти к содержимому</a>
    {expanded && <button className="fixed inset-0 z-30 bg-black/40 md:hidden" aria-label="Закрыть меню" onClick={() => setExpanded(false)} />}
    <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-card transition-[width] ${expanded ? "w-60" : "w-16 md:w-60"}`}>
      <div className="flex h-20 shrink-0 items-center justify-center gap-2 px-3 md:justify-start md:px-5"><Link to={user ? "/today" : "/login"} className="flex min-w-0 items-center gap-3 rounded-lg" aria-label="LifeCycle — главная" onClick={() => setExpanded(false)}><img src={logo} alt="" width="36" height="36" className="shrink-0" /><span className={`${expanded ? "block" : "hidden md:block"} text-xl font-semibold`}>LifeCycle<span className="text-primary">.</span></span></Link></div>
      <Button variant="ghost" size="icon" className="mx-auto mb-3 md:hidden" aria-label={expanded ? "Свернуть навигацию" : "Развернуть навигацию"} onClick={() => setExpanded(!expanded)}>{expanded ? <X /> : <Menu />}</Button>
      <SidebarNavigation key={user?.id??"guest"} items={navigation} authenticated={Boolean(user)} expanded={expanded} close={()=>setExpanded(false)} onConfigure={()=>{if(window.innerWidth<768)setExpanded(true);}} />
      <div className="shrink-0 space-y-3 border-t border-border p-2 md:p-4">{user && <><p className={`${expanded ? "block" : "hidden md:block"} truncate px-2 text-xs text-muted-foreground`} title={user.email}>{user.email}</p><Button variant="ghost" className="w-full justify-start px-3" aria-label="Выйти" onClick={() => void logout()} disabled={pending}><LogOut className="size-5 shrink-0" aria-hidden="true" /><span className={expanded ? "" : "sr-only md:not-sr-only"}>{pending ? "Выходим…" : "Выйти"}</span></Button></>}{error && <p role="alert" className="break-words text-xs text-destructive">{error}</p>}</div>
    </aside>
    <div className="ml-16 flex h-svh min-w-0 flex-col md:ml-60"><div className="app-content min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</div></div>
  </div>;

}

function LegacyBoards() {
  const location = useLocation();
  return <Navigate to={{ pathname: "/tasks", search: location.search }} replace />;
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
    <Route path="/tasks" element={<BoardsPage />} />
    <Route path="/boards" element={<LegacyBoards />} />
    <Route path="/task-tags" element={<TaskTagsPage />} />
    <Route path="/habits" element={<HabitsPage />} />
    <Route path="/sex" element={<IntimacyPage />} />
    <Route path="/workouts" element={<WorkoutsPage />} />
    <Route path="/workouts/session/:id" element={<WorkoutSessionPage />} />
    <Route path="/calendar" element={<CalendarPage />} />
    <Route path="/notes" element={<NotesPage />} />
    <Route path="/countdowns" element={<CountdownsPage />} />
    <Route path="/contacts" element={<ContactsPage />} />
    <Route path="/pomodoro" element={<PomodoroPage />} />
    <Route path="/ai" element={<AiPage />} />
    <Route path="/analytics" element={<AnalyticsPage />} />
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
  return <Shell><Routes><Route path="/status" element={<HealthPage />} /><Route path="/login" element={<LoginPage />} /><Route path="/" element={<Navigate to="/login" replace />} /><Route path="/ai" element={<Navigate to="/login" replace />} /><Route path="/analytics" element={<Navigate to="/login" replace />} /><Route path="/profile" element={<Navigate to="/login" replace />} /><Route path="/settings" element={<Navigate to="/login" replace />} /><Route path="/today" element={<Navigate to="/login" replace />} /><Route path="/tasks" element={<Navigate to="/login" replace />} /><Route path="/boards" element={<Navigate to="/login" replace />} /><Route path="/task-tags" element={<Navigate to="/login" replace />} /><Route path="/habits" element={<Navigate to="/login" replace />} /><Route path="/sex" element={<Navigate to="/login" replace />} /><Route path="/workouts/*" element={<Navigate to="/login" replace />} /><Route path="/calendar" element={<Navigate to="/login" replace />} /><Route path="/notes" element={<Navigate to="/login" replace />} /><Route path="/countdowns" element={<Navigate to="/login" replace />} /><Route path="/contacts" element={<Navigate to="/login" replace />} /><Route path="/pomodoro" element={<Navigate to="/login" replace />} /><Route path="*" element={<NotFound />} /></Routes></Shell>;
}

function ApplicationFeedback(){const {user}=useAuth();return <FeedbackProvider key={user?.id??"guest"}><AppContent/></FeedbackProvider>;}

export function App() {
  return <BrowserRouter><AuthProvider><ApplicationFeedback/></AuthProvider></BrowserRouter>;
}
