export type ServiceStatus = "ok" | "unavailable";
export type Readiness = {
  status: "ready" | "unavailable";
  checks: { postgres: ServiceStatus; redis: ServiceStatus; garage: ServiceStatus };
};

export class HealthRequestError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseReadiness(value: unknown): Readiness {
  if (!isRecord(value) || !isRecord(value.checks)) throw new HealthRequestError("Сервер вернул некорректный ответ.");
  const { checks, status } = value;
  if (status !== "ready" && status !== "unavailable") throw new HealthRequestError("Сервер вернул неизвестное состояние.");
  for (const key of ["postgres", "redis", "garage"]) {
    if (checks[key] !== "ok" && checks[key] !== "unavailable") throw new HealthRequestError("Не удалось прочитать состояние сервисов.");
  }
  const parsedChecks = checks as Readiness["checks"];
  if ((Object.values(parsedChecks).every((check) => check === "ok")) !== (status === "ready")) {
    throw new HealthRequestError("Сервер вернул противоречивое состояние.");
  }
  return { status, checks: parsedChecks };
}

export async function fetchReadiness(signal?: AbortSignal): Promise<Readiness> {
  const timeout = AbortSignal.timeout(12_000);
  const response = await fetch("/api/health/ready", {
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    cache: "no-store",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  if (response.status !== 200 && response.status !== 503) throw new HealthRequestError("Не удалось проверить подключение к серверу.");
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new HealthRequestError("Сервер вернул некорректный ответ.");
  }
  const data = parseReadiness(payload);
  if ((response.status === 200) !== (data.status === "ready")) throw new HealthRequestError("Сервер вернул противоречивый код ответа.");
  return data;
}
