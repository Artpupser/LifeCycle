import {requestCooldown,recordRequestFailure,recordRequestSuccess} from "@/systems/loading/retry";
import {revalidateActiveResources} from "@/systems/loading/cache";
import { feedbackEvents } from "@/lib/feedback";
import { invalidateResources,revalidateResource } from "@/systems/loading/cache";
import { effectOrigin, mutationEffect, showEffect } from "@/systems/effects/events";
import { t } from "@/systems/i18n/locale";
type ApiErrorPayload = { error?: { code?: string } };

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  retryAt: number|null;

  constructor(status: number, code: string,retryAt:number|null=null) {
    super(code==="request_cooldown"?t("Повторные запросы временно приостановлены после ошибки."):apiErrorMessage(status, code));
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.retryAt=retryAt;
  }
}

export function apiErrorMessage(status: number, code: string) {
  if(code==="integration_auth_invalid")return t("Код Epic Games недействителен или истёк. Начните новый вход после указанной паузы.");
  if(code==="integration_login_required")return t("Сессия Epic Games истекла или отозвана. Выполните вход заново.");
  if(code==="integration_key_required")return t("Для синхронизации нужен Steam Web API key.");
  if(code==="integration_library_private")return t("Steam не открыл библиотеку. Проверьте приватность данных об играх; сохранённая копия остаётся доступной.");
  if(code==="contact_relationship_self")return t("Нельзя связать контакт с самим собой.");
  if(code==="contact_relationship_duplicate")return t("Такая связь уже существует.");
  if(code==="contact_relationship_cycle")return t("Связь создаёт цикл предков. Проверьте направление родитель → ребёнок.");
  if(code==="contact_relationship_family_conflict")return t("Предок и потомок не могут быть одновременно братьями, сёстрами или партнёрами.");
  if(code==="contact_relationship_limit")return t("Достигнут лимит 2000 связей контактов.");
  if(code==="contact_relationship_stale")return t("Связь изменилась. Обновите древо перед повторным действием.");
  if (code === "contact_birthday_exists") return t("У контакта уже есть связанный день рождения. Используйте существующее событие, чтобы не создавать дубль.");
  if (code === "event_contact_locked") return t("Для сохранения самостоятельного события сначала нажмите «Отвязать контакт» в его карточке.");
  if (code === "contact_stale") return t("Контакт изменился в другом окне. Обновите список и откройте актуальную запись; введённые данные остались в форме.");
  if (code === "contact_duplicate") return t("Контакт с таким телефоном, именем и датой рождения или источником уже существует. Найдите его в книжке или подтвердите создание другого человека.");
  if (code === "pomodoro_history_pending") return t("Восстанавливается история Pomodoro после длительного отсутствия. Повторите запрос через несколько секунд.");
  if (code === "profile_stale") return t("Профиль изменился в другом окне. Проверьте актуальные данные перед повторным сохранением.");
  if (["event_stale", "pomodoro_config_stale"].includes(code)) return t("Запись изменилась в другом окне. Обновите данные перед повторным сохранением.");
  if (["board_stale", "tag_stale", "task_stale"].includes(code)) return t("Данные изменились в другом окне. Обновите список и повторите действие.");
  if (code === "workout_preferences_stale") return t("Цели и условия изменились в другом окне. Ваш текст остался в форме; загрузите сохранённые данные перед повторным сохранением.");
  if (code === "ai_access_stale") return t("Доступ уже изменён в другом окне. Обновите страницу и повторите выбор.");
  if (code === "ai_response_too_large") return t("Ответ слишком большой. Попросите создать один план или меньше упражнений за раз.");
  if (code === "ai_action_denied") return t("Включите доступ к этому разделу и разрешение на предложения изменений AI. Подготовьте новое предложение.");
  if (code === "ai_action_conflict") return t("Исходные данные изменились или появились новые связи. Подготовьте новое предложение; чужие изменения не перезаписываются.");
  if (code === "ai_duplicate") return t("Такая запись уже существует. Используйте её в предложении вместо создания копии.");
  if (code === "ai_safety_review_required") return t("Известные ограничения здоровья требуют ручной проверки нагрузки. Используйте обычный редактор тренировок после проверки со специалистом.");
  if (code === "ai_login_local_only") return t("Вход через ChatGPT требует локального HTTP-развёртывания LifeCycle на localhost или 127.0.0.1.");
  if (code === "ai_login_required") return t("Подключение ChatGPT истекло или отозвано. Нажмите «Войти снова».");
  if (code === "ai_login_expired" || code === "ai_login_invalid") return t("Не удалось подтвердить вход. Начните новый вход через ChatGPT.");
  if (code === "ai_login_denied") return t("Вход через ChatGPT отменён. Можно повторить его позже.");
  if (code === "ai_login_unavailable") return t("Сервис входа ChatGPT недоступен. Повторите вход позже.");
  if (code === "ai_plan_permission") return t("Аккаунт не предоставил разрешение использовать тариф ChatGPT. Войдите снова и проверьте согласие.");
  if (code === "ai_plan_limit") return t("Достигнут лимит тарифа ChatGPT для приложений. Проверьте лимиты в настройках ChatGPT и повторите вручную позже.");
  if (code === "ai_plan_unavailable") return t("Использование тарифа ChatGPT сейчас недоступно этому аккаунту или приложению. Проверьте доступ в ChatGPT.");
  if (code === "ai_account_limit") return t("Достигнут лимит 10 сохранённых подключений ChatGPT.");
  if (code === "ai_not_configured") return t("Подключите выбранный сервис через вход или API-ключ и разрешите отправку сообщений.");
  if (code === "ai_stale") return t("Настройки, чат или предпросмотр изменились. Обновите настройки AI и подготовьте новый предпросмотр.");
  if (code === "ai_busy") return t("Дождитесь ответа в другом чате или остановите его.");
  if (code === "ai_context_too_large") return t("Слишком большой контекст. Сократите период, доступ к данным или начните новый чат.");
  if (code === "ai_credentials") return t("Провайдер AI отклонил API-ключ или доступ. Проверьте ключ и права аккаунта.");
  if (code === "ai_rate_limit") return t("Провайдер AI временно ограничил частоту запросов. Подождите и повторите отправку вручную.");
  if (code === "ai_quota") return t("Провайдер AI сообщает, что квота API исчерпана. Проверьте баланс и ограничения проекта; повтор без изменения квоты не поможет.");
  if (code === "ai_credit_balance") return t("На аккаунте провайдера AI закончились предоплаченные средства. Проверьте баланс в настройках сервиса.");
  if (code === "ai_spend_limit") return t("Достигнут лимит расходов проекта или организации у провайдера AI. Проверьте ограничения API-аккаунта.");
  if (code === "ai_usage_limit") return t("Достигнут лимит использования API провайдера AI. Проверьте ограничения аккаунта.");
  if (code === "ai_request_rejected") return t("Провайдер AI отклонил запрос. Проверьте ID модели и её доступность вашему аккаунту.");
  if (code === "ai_timeout") return t("Провайдер AI не ответил за 90 секунд. Автоматического повтора нет; можно подготовить новый запрос.");
  if (code === "ai_unavailable") return t("Провайдер AI сейчас недоступен. Запрос автоматически не повторяется.");
  if (code === "ai_invalid_response") return t("Провайдер AI вернул неподдерживаемый ответ. Запрос автоматически не повторяется.");
  if (code === "ai_incomplete") return t("Ответ провайдера AI не завершён, например из-за лимита токенов. Сократите вопрос и подготовьте новый запрос.");
  if (code === "ai_interrupted") return t("Запрос прерван или не удалось сохранить ответ. Автоматического повтора нет.");
  if (code === "ai_cancelled") return t("Ответ остановлен. Уже переданные провайдеру данные нельзя отозвать.");
  if (code === "ai_permissions_changed") return t("Ответ отменён после изменения подключения или разрешений.");
  if (code === "stale_intimacy") return t("Запись изменена в другом окне. Обновите журнал и откройте сохранённую версию.");
  if (code === "nonexistent_local_time") return t("Такого местного времени нет из-за перевода часов. Проверьте время и часовой пояс.");
  if (code === "stale_workout") return t("Тренировка изменена в другом окне. Обновите состояние и повторите действие.");
  if (status === 409) return t("Действие недоступно в текущем состоянии. Проверьте активную тренировку и связи с планами или привычками, затем обновите данные.");
  if (code === "invalid_code") return t("Код неверный или срок его действия истёк. Проверьте письмо или запросите новый код.");
  if (code === "unauthenticated") return t("Сессия завершена. Войдите снова.");
  if (code === "mail_unavailable") return t("Почтовый сервис временно недоступен. Повторите попытку позже.");
  if (code === "csrf_failed") return t("Адрес приложения не совпадает с настройками сервера. Обратитесь к администратору.");
  if (status === 429) return t("Сервис ограничил частоту запросов. Повторные запросы временно приостановлены.");
  if(code==="integration_session_required")return t("Сессия площадки истекла или отозвана. Выполните вход в профиле заново.");
  if(code==="integration_access_denied")return t("Площадка не разрешила доступ к данным. Проверьте аккаунт и настройки приватности.");
  if (status === 400 || status === 422) return t("Проверьте заполненные поля и допустимые значения.");
  if (status === 404) return t("Запрошенные данные не найдены.");
  return t("Не удалось выполнить запрос. Повторите попытку позже.");
}

export function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.name === "TimeoutError") return t("Сервер не ответил вовремя. Повторите попытку.");
  return t("Не удалось связаться с сервером. Проверьте подключение и попробуйте снова.");
}

export async function api<T>(path: string, options: { method?: "GET" | "POST" | "PUT" | "DELETE"; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  const method=options.method??"GET";
  const cooldown=requestCooldown(path,method);if(cooldown)throw new ApiError(cooldown.status,"request_cooldown",cooldown.retryAt);
  const origin=effectOrigin();
  const timeout = AbortSignal.timeout(15_000);
  let response:Response;
  try{response = await fetch(`/api${path}`, {
    method: options.method ?? "GET",
    credentials: "same-origin",
    cache: "no-store",
    signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout,
    headers: { Accept: "application/json", ...(options.body === undefined ? {} : { "Content-Type": "application/json" }) },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });}catch(error){if(!options.signal?.aborted)recordRequestFailure(path,error,undefined,method);throw error;}
  if (!response.ok) {
    const payload: ApiErrorPayload = await response.json().catch(() => ({}));
    if (response.status === 401 && !path.startsWith("/auth/")) window.dispatchEvent(new Event("lifecycle:session-expired"));
    const failure=new ApiError(response.status,payload.error?.code??"request_failed");
    failure.retryAt=recordRequestFailure(path,failure,{status:response.status,code:failure.code,retryAfter:response.headers.get("Retry-After"),message:failure.message,global:response.status===429&&!payload.error?.code},method);
    throw failure;
  }
  let result:T;
  try{result=response.status===204?undefined:await response.json();}catch(error){recordRequestFailure(path,error,undefined,method);throw error;}
  recordRequestSuccess(path,method);
  if(options.method&&options.method!=="GET"&&path!=="/operators/lookup"&&!/^\/notifications\/[^/]+\/read$/.test(path))invalidateResources();
  if(options.method==="POST"&&(/^\/tasks\/[^/]+\/occurrences\/[^/]+$/.test(path)||/^\/habits\/[^/]+\/marks\/[^/]+$/.test(path))){const status=(result as {status?:string}|null)?.status;if(status)feedbackEvents.dispatchEvent(new CustomEvent("task-result",{detail:{status}}));}
  if(options.method&&options.method!=="GET"&&/^\/(labels|task-tags|notes|contacts|countdowns|workouts|exercises)(\/|$)/.test(path))revalidateResource("/labels");
  if(options.method&&options.method!=="GET"&&(path.startsWith("/labels")||/\/ai-access$/.test(path))){revalidateResource("/labels/values");revalidateResource("/labels/subject-tags");}
  if(options.method&&options.method!=="GET"&&/^\/contacts(?:\/|$)/.test(path)){revalidateResource("/contacts");revalidateResource("/contacts/relationships");revalidateResource("/countdowns");}
  if(options.method&&options.method!=="GET"&&path.startsWith("/integrations/"))revalidateActiveResources(["/integrations","/videogames"]);
  if(options.method==="POST"&&/^\/videogames\/sales\/[^/]+\/calendar$/.test(path))revalidateActiveResources(["/countdowns","/calendar","/today"]);
  const effect=mutationEffect(path,options.method??"GET",options.body,result);
  if(effect)showEffect(effect,origin);
  return result;
}
