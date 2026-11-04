import {SubjectLabels} from "@/systems/labels/functional";
import {ObjectActions} from "@/systems/actions/action-menu";
import {useHistory} from "@/systems/history/use-history";
import { HistoryRemove } from "@/systems/history/history";
import { t, useLanguage } from "@/systems/i18n/locale";
import { Dialog } from "@/components/dialog";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { ErrorState, LoadingState } from "@/components/resource-state";
import { usePreferences } from "@/features/settings/preferences-context";
import { useResource } from "@/hooks/use-resource";
import { dateLabel, dateTimeLabel } from "@/lib/dates";
import type { Task, TaskOccurrence } from "./types";
export function TaskHistory({ id, close }: { id: string; close: () => void }) {
  useLanguage();
  const { settings } = usePreferences();
  const history = useHistory<TaskOccurrence[]>({kind:"task",id});
  return <Dialog title={t("История задачи")} onClose={close}>{history.resource.status === "loading" ? <LoadingState /> : history.resource.status === "error" ? <ErrorState message={history.resource.message} retry={history.retry} /> : history.resource.data.length ? <ul className="divide-y divide-border">{history.resource.data.map((item) => <li data-action-subject="history" key={item.date} className="space-y-3 py-4"><p className="text-xs text-muted-foreground">{item.starts_at ? dateTimeLabel(item.starts_at, settings.timezone, settings.time_format) : dateLabel(item.date)} · {item.status === "completed" ? t("Выполнено") : item.status === "rejected" ? t("Отменено") : t("Не выполнено")}</p><p className="font-medium">{item.task.title}</p><Markdown value={item.task.description} /><HistoryRemove kind="task" itemKey={`${id}:${item.date}`} removed={history.retry}/></li>)}</ul> : <p>{t("Отметок пока нет.")}</p>}</Dialog>;
}
export function TaskDetail({ id, close, edit, history, child }: { id: string; close: () => void; edit: (task: Task) => void; history: () => void; child: (task: Task) => void }) {
  useLanguage();
  const { settings } = usePreferences();
  const detail = useResource<Task>(`/tasks/${id}`);
  return <Dialog title={detail.resource.status === "ready" ? detail.resource.data.title : t("Задача")} onClose={close}><div data-action-subject="task">{detail.resource.status === "loading" ? <LoadingState /> : detail.resource.status === "error" ? <><ErrorState message={detail.resource.message} retry={detail.retry} /><ObjectActions><Button className="mt-4" variant="outline" onClick={history}>{t("История задачи")}</Button></ObjectActions></> : <><SubjectLabels subject={{kind:"tasks",id}}/><Markdown value={detail.resource.data.description} />{detail.resource.data.due_at && <p className="mt-5 text-sm text-muted-foreground">{t("Окончание: ")}{dateTimeLabel(detail.resource.data.due_at, settings.timezone, settings.time_format)}</p>}<ObjectActions subject={{kind:"tasks",id}}><Button onClick={() => { if (detail.resource.status === "ready") edit(detail.resource.data); }}>{t("Редактировать задачу")}</Button><Button variant="outline" onClick={history}>{t("История задачи")}</Button><Button variant="outline" onClick={() => { if (detail.resource.status === "ready") child(detail.resource.data); }}>{t("Подзадача")}</Button></ObjectActions></>}</div></Dialog>;
}
