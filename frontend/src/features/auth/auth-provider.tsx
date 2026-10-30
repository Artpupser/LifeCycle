import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { api, ApiError, errorMessage } from "@/lib/api";
import { AuthContext, type User } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const channel = useRef<BroadcastChannel | null>(null);
  const authRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    let controller: AbortController;
    const refresh = () => {
      controller?.abort();
      controller = new AbortController();
      authRequest.current = controller;
      const signal = controller.signal;
      void api<{ user: User }>("/auth/me", { signal })
      .then((data) => { if (!signal.aborted) { setUser(data.user); setError(null); } })
      .catch((failure: unknown) => {
        if (!signal.aborted) {
          setUser(null);
          setError(failure instanceof ApiError && failure.status === 401 ? null : errorMessage(failure));
        }
      })
      .finally(() => { if (!signal.aborted) setLoading(false); });
    };
    const visible = () => { if (document.visibilityState === "visible") refresh(); };
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", visible);
    return () => { controller.abort(); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", visible); };
  }, [revision]);

  useEffect(() => {
    if (typeof BroadcastChannel !== "undefined") {
      channel.current = new BroadcastChannel("lifecycle:session");
      channel.current.onmessage = (event: MessageEvent<unknown>) => {
        if (event.data !== "changed") return;
        authRequest.current?.abort();
        setUser(null); setError(null); setLoading(true); setRevision((value) => value + 1);
      };
    }
    const expired = () => { authRequest.current?.abort(); setUser(null); channel.current?.postMessage("changed"); };
    window.addEventListener("lifecycle:session-expired", expired);
    return () => { window.removeEventListener("lifecycle:session-expired", expired); channel.current?.close(); channel.current = null; };
  }, []);

  const signIn = useCallback((next: User) => { authRequest.current?.abort(); setUser(next); setError(null); channel.current?.postMessage("changed"); }, []);
  const signOut = useCallback(async () => {
    authRequest.current?.abort();
    try { await api<void>("/auth/logout", { method: "POST" }); }
    catch (failure) { if (!(failure instanceof ApiError && failure.status === 401)) throw failure; }
    authRequest.current?.abort(); setUser(null);
    channel.current?.postMessage("changed");
  }, []);
  const reload = useCallback(() => { setLoading(true); setError(null); setRevision((value) => value + 1); }, []);

  return <AuthContext value={{ user, loading, error, signIn, signOut, reload }}>{children}</AuthContext>;
}
