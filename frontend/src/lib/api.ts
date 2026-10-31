type ApiErrorPayload = { error?: { code?: string } };

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string) {
    super(apiErrorMessage(status, code));
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function apiErrorMessage(status: number, code: string) {
  if (code === "workout_preferences_stale") return "Цели и условия изменились в другом окне. Ваш текст остался в форме; загрузите сохранённые данные перед повторным сохранением.";
  if (code === "ai_access_stale") return "Доступ уже изменён в другом окне. Обновите страницу и повторите выбор.";
  if (code === "ai_response_too_large") return "Ответ слишком большой. Попросите создать один план или меньше упражнений за раз.";
  if (code === "ai_action_denied") return "Включите доступ к этому разделу и разрешение на предложения изменений AI. Подготовьте новое предложение.";
  if (code === "ai_action_conflict") return "Исходные данные изменились или появились новые связи. Подготовьте новое предложение; чужие изменения не перезаписываются.";
  if (code === "ai_duplicate") return "Такая запись уже существует. Используйте её в предложении вместо создания копии.";
  if (code === "ai_safety_review_required") return "Известные ограничения здоровья требуют ручной проверки нагрузки. Используйте обычный редактор тренировок после проверки со специалистом.";
  if (code === "ai_login_local_only") return "Вход через ChatGPT требует локального HTTP-развёртывания LifeCycle на localhost или 127.0.0.1.";
  if (code === "ai_login_required") return "Подключение ChatGPT истекло или отозвано. Нажмите «Войти снова».";
  if (code === "ai_login_expired" || code === "ai_login_invalid") return "Не удалось подтвердить вход. Начните новый вход через ChatGPT.";
  if (code === "ai_login_denied") return "Вход через ChatGPT отменён. Можно повторить его позже.";
  if (code === "ai_login_unavailable") return "Сервис входа ChatGPT недоступен. Повторите вход позже.";
  if (code === "ai_plan_permission") return "Аккаунт не предоставил разрешение использовать тариф ChatGPT. Войдите снова и проверьте согласие.";
  if (code === "ai_plan_limit") return "Достигнут лимит тарифа ChatGPT для приложений. Проверьте лимиты в настройках ChatGPT и повторите вручную позже.";
  if (code === "ai_plan_unavailable") return "Использование тарифа ChatGPT сейчас недоступно этому аккаунту или приложению. Проверьте доступ в ChatGPT.";
  if (code === "ai_account_limit") return "Достигнут лимит 10 сохранённых подключений ChatGPT.";
  if (code === "ai_not_configured") return "Подключите выбранный сервис через вход или API-ключ и разрешите отправку сообщений.";
  if (code === "ai_stale") return "Настройки, чат или предпросмотр изменились. Обновите настройки AI и подготовьте новый предпросмотр.";
  if (code === "ai_busy") return "Дождитесь ответа в другом чате или остановите его.";
  if (code === "ai_context_too_large") return "Слишком большой контекст. Сократите период, доступ к данным или начните новый чат.";
  if (code === "ai_credentials") return "Провайдер AI отклонил API-ключ или доступ. Проверьте ключ и права аккаунта.";
  if (code === "ai_rate_limit") return "Провайдер AI временно ограничил частоту запросов. Подождите и повторите отправку вручную.";
  if (code === "ai_quota") return "Провайдер AI сообщает, что квота API исчерпана. Проверьте баланс и ограничения проекта; повтор без изменения квоты не поможет.";
  if (code === "ai_credit_balance") return "На аккаунте провайдера AI закончились предоплаченные средства. Проверьте баланс в настройках сервиса.";
  if (code === "ai_spend_limit") return "Достигнут лимит расходов проекта или организации у провайдера AI. Проверьте ограничения API-аккаунта.";
  if (code === "ai_usage_limit") return "Достигнут лимит использования API провайдера AI. Проверьте ограничения аккаунта.";
  if (code === "ai_request_rejected") return "Провайдер AI отклонил запрос. Проверьте ID модели и её доступность вашему аккаунту.";
  if (code === "ai_timeout") return "Провайдер AI не ответил за 90 секунд. Автоматического повтора нет; можно подготовить новый запрос.";
  if (code === "ai_unavailable") return "Провайдер AI сейчас недоступен. Запрос автоматически не повторяется.";
  if (code === "ai_invalid_response") return "Провайдер AI вернул неподдерживаемый ответ. Запрос автоматически не повторяется.";
  if (code === "ai_incomplete") return "Ответ провайдера AI не завершён, например из-за лимита токенов. Сократите вопрос и подготовьте новый запрос.";
  if (code === "ai_interrupted") return "Запрос прерван или не удалось сохранить ответ. Автоматического повтора нет.";
  if (code === "ai_cancelled") return "Ответ остановлен. Уже переданные провайдеру данные нельзя отозвать.";
  if (code === "ai_permissions_changed") return "Ответ отменён после изменения подключения или разрешений.";
  if (code === "stale_intimacy") return "Запись изменена в другом окне. Обновите журнал и откройте сохранённую версию.";
  if (code === "nonexistent_local_time") return "Такого местного времени нет из-за перевода часов. Проверьте время и часовой пояс.";
  if (code === "stale_workout") return "Тренировка изменена в другом окне. Обновите состояние и повторите действие.";
  if (status === 409) return "Действие недоступно в текущем состоянии. Проверьте активную тренировку и связи с планами или привычками, затем обновите данные.";
  if (code === "invalid_code") return "Код неверный или срок его действия истёк. Проверьте письмо или запросите новый код.";
  if (code === "unauthenticated") return "Сессия завершена. Войдите снова.";
  if (code === "mail_unavailable") return "Почтовый сервис временно недоступен. Повторите попытку позже.";
  if (code === "csrf_failed") return "Адрес приложения не совпадает с настройками сервера. Обратитесь к администратору.";
  if (status === 429) return "Слишком много попыток. Подождите минуту и попробуйте снова.";
  if (status === 400 || status === 422) return "Проверьте заполненные поля и допустимые значения.";
  if (status === 404) return "Запрошенные данные не найдены.";
  return "Не удалось выполнить запрос. Повторите попытку позже.";
}

export function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.name === "TimeoutError") return "Сервер не ответил вовремя. Повторите попытку.";
  return "Не удалось связаться с сервером. Проверьте подключение и попробуйте снова.";
}

export async function api<T>(path: string, options: { method?: "GET" | "POST" | "PUT" | "DELETE"; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  const timeout = AbortSignal.timeout(15_000);
  const response = await fetch(`/api${path}`, {
    method: options.method ?? "GET",
    credentials: "same-origin",
    cache: "no-store",
    signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout,
    headers: { Accept: "application/json", ...(options.body === undefined ? {} : { "Content-Type": "application/json" }) },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
  if (!response.ok) {
    const payload: ApiErrorPayload = await response.json().catch(() => ({}));
    if (response.status === 401 && !path.startsWith("/auth/")) window.dispatchEvent(new Event("lifecycle:session-expired"));
    throw new ApiError(response.status, payload.error?.code ?? "request_failed");
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
