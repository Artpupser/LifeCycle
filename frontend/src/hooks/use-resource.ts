import { useCallback, useEffect, useRef, useState } from "react";
import { api, errorMessage } from "@/lib/api";

type Resource<T> = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: T };

export function useResource<T>(path: string | null) {
  const [result, setResult] = useState<{ path: string; revision: number; resource: Resource<T> } | null>(null);
  const refreshRef = useRef<(() => void) | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!path) { refreshRef.current=null; return; }
    let controller: AbortController;
    const refresh = () => {
      controller?.abort();
      controller = new AbortController();
      const signal = controller.signal;
      void api<T>(path, { signal })
        .then((data) => { if (!signal.aborted) setResult({ path, revision, resource: { status: "ready", data } }); })
        .catch((error: unknown) => { if (!signal.aborted) setResult({ path, revision, resource: { status: "error", message: errorMessage(error) } }); });
    };
    refreshRef.current=refresh;
    const visible = () => { if (document.visibilityState === "visible") refresh(); };
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", visible);
    return () => { refreshRef.current=null; controller.abort(); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", visible); };
  }, [path, revision]);
  const retry = useCallback(() => setRevision((value) => value + 1), []);
  const refresh = useCallback(() => refreshRef.current?.(), []);
  const mutate = useCallback((updater: (data: T) => T) => setResult((current) => current?.resource.status === "ready" ? { ...current, resource: { status: "ready", data: updater(current.resource.data) } } : current), []);
  const resource: Resource<T> = result?.path === path && result.revision === revision ? result.resource : { status: "loading" };
  return { resource, retry, refresh, mutate };
}
