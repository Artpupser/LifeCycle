import { useState } from "react";
import { ErrorState, LoadingState } from "@/components/resource-state";
import { Button } from "@/components/ui/button";
import { useResource } from "@/hooks/use-resource";
import { dateTimeLabel } from "@/lib/dates";
import { durationLabel, kindLabels, type Session } from "./types";
export function PomodoroHistory({ timezone }: { timezone: string }) {
  const [offset, setOffset] = useState(0); const { resource, retry } = useResource<{ items: Session[]; next_offset: number | null }>(`/pomodoro/history?offset=${offset}`);
  return <section aria-label="История Pomodoro" className="space-y-4"><h2 className="text-xl font-semibold">История сессий</h2>{resource.status === "loading" ? <LoadingState /> : resource.status === "error" ? <ErrorState message={resource.message} retry={retry} /> : <>{!resource.data.items.length ? <p className="text-sm text-muted-foreground">Завершённые и остановленные интервалы появятся здесь.</p> : <ol className="space-y-2">{resource.data.items.map(item => <li key={item.id} className="space-y-1 rounded-xl border border-border p-4 text-sm"><p className="break-words font-medium">{item.interval_kind ? kindLabels[item.interval_kind] : item.phase === "work" ? "Работа" : "Обычный отдых"} · {item.status === "completed" ? "Завершён" : "Остановлен"}</p>{item.program_name && <p className="break-words">{item.program_name} · интервал {(item.interval_index ?? 0) + 1}</p>}<p className="text-muted-foreground">{item.ended_at && dateTimeLabel(item.ended_at, timezone)} · {durationLabel(item.elapsed_seconds)} / {durationLabel(item.duration_seconds)}</p></li>)}</ol>}<div className="flex flex-wrap gap-2"><Button variant="outline" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 50))}>Новые сессии</Button><Button variant="outline" disabled={resource.data.next_offset === null} onClick={() => setOffset(resource.data.next_offset!)}>Предыдущие сессии</Button></div></>}</section>;
}
