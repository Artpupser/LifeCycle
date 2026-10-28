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
