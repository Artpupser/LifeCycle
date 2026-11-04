import {ObjectActions} from "@/systems/actions/action-menu";
import { t, useLanguage } from "@/systems/i18n/locale";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import type { TaskOccurrence } from "@/features/planning/types";
import { useAction } from "@/hooks/use-action";
import { api } from "@/lib/api";
import type { WorkoutSession } from "./types";

export function WorkoutLauncher({ occurrence, inMenu=false }: { occurrence: TaskOccurrence;inMenu?:boolean }) {
  useLanguage();
  const navigate = useNavigate();
  const action = useAction();
  async function start() {
    await action.run(async () => { const session = await api<WorkoutSession>("/workout-sessions", { method: "POST", body: { workout_id: occurrence.task.habit?.workout_id, habit_id: occurrence.task.id, date: occurrence.date } }); navigate(`/workouts/session/${session.id}`); });
  }
  const control=<Button size="sm" disabled={action.busy || !occurrence.editable} onClick={() => void start()}>{t("Открыть тренировку")}</Button>;
  return <div className={inMenu?"contents":"mt-3 space-y-2"}>{inMenu?<ObjectActions contribute>{control}</ObjectActions>:control}{action.error && <p role="alert" className="text-sm text-destructive">{action.error}</p>}</div>;
}
