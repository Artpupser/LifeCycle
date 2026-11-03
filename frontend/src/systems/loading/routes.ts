import {lazy} from "react";
const importers={
 "/ai":()=>import("@/features/ai/ai-page").then(m=>({default:m.AiPage})),
 "/analytics":()=>import("@/features/analytics/analytics-page").then(m=>({default:m.AnalyticsPage})),
 "/sex":()=>import("@/features/intimacy/intimacy-page").then(m=>({default:m.IntimacyPage})),
 "/habits":()=>import("@/features/habits/habits-page").then(m=>({default:m.HabitsPage})),
 "/workouts":()=>import("@/features/workouts/workouts-page").then(m=>({default:m.WorkoutsPage})),
 "/workouts/session":()=>import("@/features/workouts/workout-session-page").then(m=>({default:m.WorkoutSessionPage})),
 "/login":()=>import("@/features/auth/login-page").then(m=>({default:m.LoginPage})),
 "/countdowns":()=>import("@/features/countdowns/countdowns-page").then(m=>({default:m.CountdownsPage})),
 "/contacts":()=>import("@/features/contacts/contacts-page").then(m=>({default:m.ContactsPage})),
 "/notes":()=>import("@/features/notes/notes-page").then(m=>({default:m.NotesPage})),
 "/pomodoro":()=>import("@/features/pomodoro/pomodoro-page").then(m=>({default:m.PomodoroPage})),
 "/tasks":()=>import("@/features/planning/boards-page").then(m=>({default:m.BoardsPage})),
 "/task-tags":()=>import("@/features/planning/task-tags-page").then(m=>({default:m.TaskTagsPage})),
 "/today":()=>import("@/features/planning/today-page").then(m=>({default:m.TodayPage})),
 "/calendar":()=>import("@/features/planning/calendar-page").then(m=>({default:m.CalendarPage})),
 "/status":()=>import("@/features/health/health-page").then(m=>({default:m.HealthPage})),
 "/profile":()=>import("@/features/profile/profile-page").then(m=>({default:m.ProfilePage})),
 "/settings":()=>import("@/features/settings/settings-page").then(m=>({default:m.SettingsPage})),
};
export type PagePath=keyof typeof importers;
export const pageComponent=(path:PagePath)=>lazy(importers[path]);
const loaded=new Map<string,Promise<unknown>>();
export function preloadPage(path:string){const key=path.startsWith("/workouts/session/")?"/workouts/session":path;if(!(key in importers))return Promise.resolve();let pending=loaded.get(key);if(!pending){pending=importers[key as PagePath]();loaded.set(key,pending);pending.catch(()=>loaded.delete(key));}return pending;}
