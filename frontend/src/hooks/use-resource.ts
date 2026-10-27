import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";

type Resource<T> = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: T };

export function useResource<T>(path: string) {
  const [result, setResult] = useState<{ path: string; revision: number; resource: Resource<T> } | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void api<T>(path, { signal: controller.signal })
      .then((data) => { if (!controller.signal.aborted) setResult({ path, revision, resource: { status: "ready", data } }); })
      .catch((error: unknown) => { if (!controller.signal.aborted) setResult({ path, revision, resource: { status: "error", message: errorMessage(error) } }); });
    return () => controller.abort();
  }, [path, revision]);
  const retry = useCallback(() => setRevision((value) => value + 1), []);
  const resource: Resource<T> = result?.path === path && result.revision === revision ? result.resource : { status: "loading" };
  return { resource, retry };
}
