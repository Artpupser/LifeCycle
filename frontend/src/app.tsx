import { t, useLanguage } from "@/systems/i18n/locale";
import { SidebarNavigation } from "@/components/sidebar-navigation";
import { FeedbackProvider } from "@/components/feedback-provider";
import { HabitReminders } from "@/features/habits/reminders";
import { Heart, Activity, CalendarDays, CalendarClock, BookUser, ClipboardList, LogOut, NotebookPen, Settings2, Timer, UserRound, Menu, X } from "@/components/icons";
import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from "react-router";
import { AppIcon } from "@/systems/icons/app-icon";
import { ThemeBackground } from "@/systems/themes/theme-background";
import { ErrorState, LoadingState } from "@/components/resource-state";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-context";
import { AuthProvider } from "@/features/auth/auth-provider";
import { PreferencesProvider } from "@/features/settings/preferences-provider";
import type { Settings } from "@/features/settings/types";
import { useResource } from "@/hooks/use-resource";
import { errorMessage } from "@/lib/api";

const AiPage = lazy(() => import("@/features/ai/ai-page").then(module => ({default:module.AiPage})));
const AnalyticsPage = lazy(() => import("@/features/analytics/analytics-page").then(module => ({default:module.AnalyticsPage})));
const IntimacyPage = lazy(() => import("@/features/intimacy/intimacy-page").then(module => ({default:module.IntimacyPage})));
const HabitsPage = lazy(() => import("@/features/habits/habits-page").then(module => ({default:module.HabitsPage})));
const WorkoutsPage = lazy(() => import("@/features/workouts/workouts-page").then(module => ({default:module.WorkoutsPage})));
const WorkoutSessionPage = lazy(() => import("@/features/workouts/workout-session-page").then(module => ({default:module.WorkoutSessionPage})));
const LoginPage = lazy(() => import("@/features/auth/login-page").then(module => ({default:module.LoginPage})));
const CountdownsPage = lazy(() => import("@/features/countdowns/countdowns-page").then(module => ({default:module.CountdownsPage})));
const ContactsPage = lazy(() => import("@/features/contacts/contacts-page").then(module => ({default:module.ContactsPage})));
const NotesPage = lazy(() => import("@/features/notes/notes-page").then(module => ({default:module.NotesPage})));
const PomodoroPage = lazy(() => import("@/features/pomodoro/pomodoro-page").then(module => ({default:module.PomodoroPage})));
const BoardsPage = lazy(() => import("@/features/planning/boards-page").then(module => ({default:module.BoardsPage})));
const TaskTagsPage = lazy(() => import("@/features/planning/task-tags-page").then(module => ({default:module.TaskTagsPage})));
const TodayPage = lazy(() => import("@/features/planning/today-page").then(module => ({default:module.TodayPage})));
const CalendarPage = lazy(() => import("@/features/planning/calendar-page").then(module => ({default:module.CalendarPage})));
const HealthPage = lazy(() => import("@/features/health/health-page").then(module => ({default:module.HealthPage})));
const ProfilePage = lazy(() => import("@/features/profile/profile-page").then(module => ({default:module.ProfilePage})));
const SettingsPage = lazy(() => import("@/features/settings/settings-page").then(module => ({default:module.SettingsPage})));

function Shell({ children }: { children: ReactNode }) {
  useLanguage();
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

  const navigation = user ? [{ to: "/today", label: t("Сегодня"), icon: CalendarDays }, { to: "/habits", label: t("Привычки"), icon: Activity }, { to: "/workouts", label: t("Тренировки"), icon: Activity }, { to: "/sex", label: t("Интимный журнал"), icon: Heart }, { to: "/tasks", label: t("Задачи"), icon: ClipboardList }, { to: "/calendar", label: t("Календарь"), icon: CalendarDays }, { to: "/notes", label: t("Заметки"), icon: NotebookPen }, { to: "/countdowns", label: t("Отсчёты"), icon: CalendarClock }, { to: "/contacts", label: t("Контакты"), icon: BookUser }, { to: "/pomodoro", label: "Pomodoro", icon: Timer }, { to: "/analytics", label: t("Аналитика"), icon: Activity }, { to: "/ai", label: t("AI-помощник"), icon: Activity }, { to: "/profile", label: t("Профиль"), icon: UserRound }, { to: "/settings", label: t("Настройки"), icon: Settings2 }, { to: "/status", label: t("Подключение"), icon: Activity }] : [{ to: "/login", label: t("Войти"), icon: UserRound }, { to: "/status", label: t("Подключение"), icon: Activity }];

  return <div className="app-shell relative isolate h-svh overflow-hidden bg-background text-foreground">
    <ThemeBackground/>
    <a href="#main" className="sr-only z-50 rounded-lg bg-primary px-4 py-3 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4">{t("Перейти к содержимому")}</a>
    {expanded && <button className="fixed inset-0 z-30 bg-black/40 md:hidden" aria-label={t("Закрыть меню")} onClick={() => setExpanded(false)} />}
    <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-card transition-[width] ${expanded ? "w-60" : "w-16 md:w-60"}`}>
      <div className="flex h-20 shrink-0 items-center justify-center gap-2 px-3 md:justify-start md:px-5"><Link to={user ? "/today" : "/login"} className="flex min-w-0 items-center gap-3 rounded-lg" aria-label={t("LifeCycle — главная")} onClick={() => setExpanded(false)}><AppIcon icon="lifecycle:mark" className="size-9 shrink-0"/><span className={`${expanded ? "block" : "hidden md:block"} text-xl font-semibold`}>LifeCycle<span className="text-primary">.</span></span></Link></div>
      <Button variant="ghost" size="icon" className="mx-auto mb-3 md:hidden" aria-label={expanded ? t("Свернуть навигацию") : t("Развернуть навигацию")} onClick={() => setExpanded(!expanded)}>{expanded ? <X /> : <Menu />}</Button>
      <SidebarNavigation key={user?.id??"guest"} items={navigation} authenticated={Boolean(user)} expanded={expanded} close={()=>setExpanded(false)} onConfigure={()=>{if(window.innerWidth<768)setExpanded(true);}} />
      <div className="shrink-0 space-y-3 border-t border-border p-2 md:p-4">{user && <><p className={`${expanded ? "block" : "hidden md:block"} truncate px-2 text-xs text-muted-foreground`} title={user.email}>{user.email}</p><Button variant="ghost" className="w-full justify-start px-3" aria-label={t("Выйти")} onClick={() => void logout()} disabled={pending}><LogOut className="size-5 shrink-0" aria-hidden="true" /><span className={expanded ? "" : "sr-only md:not-sr-only"}>{pending ? t("Выходим…") : t("Выйти")}</span></Button></>}{error && <p role="alert" className="break-words text-xs text-destructive">{error}</p>}</div>
    </aside>
    <div className="relative ml-16 flex h-svh min-w-0 flex-col md:ml-60"><div className="app-content min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</div></div>
  </div>;

}

function LegacyBoards() {
  useLanguage();
  const location = useLocation();
  return <Navigate to={{ pathname: "/tasks", search: location.search }} replace />;
}

function NotFound() {
  useLanguage();
  return <main id="main" className="mx-auto max-w-4xl px-5 py-16 sm:px-10"><p className="mb-3 text-sm text-primary">404</p><h1 className="text-3xl font-semibold">{t("Страница не найдена")}</h1><Link to="/" className="mt-6 inline-block text-primary underline underline-offset-4">{t("Вернуться на главную")}</Link></main>;
}

function AuthenticatedApp() {
  useLanguage();
  const { resource, retry } = useResource<Settings>("/settings");
  if (resource.status !== "ready") return <Shell><Suspense fallback={<LoadingState />}><Routes><Route path="/status" element={<HealthPage />} /><Route path="*" element={<main id="main" className="mx-auto max-w-4xl px-5 py-10 sm:px-10">{resource.status === "loading" ? <LoadingState /> : <ErrorState message={resource.message} retry={retry} />}</main>} /></Routes></Suspense></Shell>;
  return <PreferencesProvider initial={resource.data}><Shell><HabitReminders /><Suspense fallback={<LoadingState />}><Routes>
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
  </Routes></Suspense></Shell></PreferencesProvider>;
}

function AppContent() {
  useLanguage();
  const { user, loading, error, reload } = useAuth();
  if (loading || error) return <Shell><Suspense fallback={<LoadingState />}><Routes><Route path="/status" element={<HealthPage />} /><Route path="*" element={<main id="main" className="mx-auto max-w-4xl px-5 py-10 sm:px-10">{loading ? <LoadingState /> : <ErrorState message={error!} retry={reload} />}</main>} /></Routes></Suspense></Shell>;
  if (user) return <AuthenticatedApp key={user.id} />;
  return <Shell><Suspense fallback={<LoadingState />}><Routes><Route path="/status" element={<HealthPage />} /><Route path="/login" element={<LoginPage />} /><Route path="/" element={<Navigate to="/login" replace />} /><Route path="/ai" element={<Navigate to="/login" replace />} /><Route path="/analytics" element={<Navigate to="/login" replace />} /><Route path="/profile" element={<Navigate to="/login" replace />} /><Route path="/settings" element={<Navigate to="/login" replace />} /><Route path="/today" element={<Navigate to="/login" replace />} /><Route path="/tasks" element={<Navigate to="/login" replace />} /><Route path="/boards" element={<Navigate to="/login" replace />} /><Route path="/task-tags" element={<Navigate to="/login" replace />} /><Route path="/habits" element={<Navigate to="/login" replace />} /><Route path="/sex" element={<Navigate to="/login" replace />} /><Route path="/workouts/*" element={<Navigate to="/login" replace />} /><Route path="/calendar" element={<Navigate to="/login" replace />} /><Route path="/notes" element={<Navigate to="/login" replace />} /><Route path="/countdowns" element={<Navigate to="/login" replace />} /><Route path="/contacts" element={<Navigate to="/login" replace />} /><Route path="/pomodoro" element={<Navigate to="/login" replace />} /><Route path="*" element={<NotFound />} /></Routes></Suspense></Shell>;
}

function ApplicationFeedback(){
  useLanguage();const {user}=useAuth();return <FeedbackProvider key={user?.id??"guest"}><AppContent/></FeedbackProvider>;}

export function App() {
  useLanguage();
  return <BrowserRouter><AuthProvider><ApplicationFeedback/></AuthProvider></BrowserRouter>;
}
