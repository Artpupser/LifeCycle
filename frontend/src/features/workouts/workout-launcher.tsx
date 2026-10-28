import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import type { TaskOccurrence } from "@/features/planning/types";
import { useAction } from "@/hooks/use-action";
import { api } from "@/lib/api";
import type { WorkoutSession } from "./types";

export function WorkoutLauncher({ occurrence }: { occurrence: TaskOccurrence }) {
  const navigate = useNavigate();
  const action = useAction();
  async function start() {
    await action.run(async () => { const session = await api<WorkoutSession>("/workout-sessions", { method: "POST", body: { workout_id: occurrence.task.habit?.workout_id, habit_id: occurrence.task.id, date: occurrence.date } }); navigate(`/workouts/session/${session.id}`); });
  }
  return <div className="mt-3 space-y-2"><Button size="sm" disabled={action.busy || !occurrence.editable} onClick={() => void start()}>Открыть тренировку</Button>{action.error && <p role="alert" className="text-sm text-destructive">{action.error}</p>}</div>;
}
