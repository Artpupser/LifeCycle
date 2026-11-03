import { clearResourceCache } from "@/systems/loading/cache";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { api, ApiError, errorMessage } from "@/lib/api";
import { AuthContext, type User } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const identity=useRef<User|null>(null);
  const channel = useRef<BroadcastChannel | null>(null);
  const authRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    let controller: AbortController;
    const refresh = () => {
      if(!navigator.onLine&&identity.current)return;
      controller?.abort();
      controller = new AbortController();
      authRequest.current = controller;
      const signal = controller.signal;
      void api<{ user: User }>("/auth/me", { signal })
      .then((data) => { if (!signal.aborted) { if(identity.current&&identity.current.id!==data.user.id)clearResourceCache(); identity.current=data.user; setUser(data.user); setError(null); } })
      .catch((failure: unknown) => {
        if (!signal.aborted) {
          if(identity.current&&!(failure instanceof ApiError)){setError(null);return;}
          identity.current=null;clearResourceCache(); setUser(null);
          setError(failure instanceof ApiError && failure.status === 401 ? null : errorMessage(failure));
        }
      })
      .finally(() => { if (!signal.aborted) setLoading(false); });
    };
    const visible = () => { if (document.visibilityState === "visible") refresh(); };
    refresh();
    window.addEventListener("focus", refresh);window.addEventListener("online",refresh);
    document.addEventListener("visibilitychange", visible);
    return () => { controller.abort(); window.removeEventListener("focus", refresh);window.removeEventListener("online",refresh); document.removeEventListener("visibilitychange", visible); };
  }, [revision]);

  useEffect(() => {
    if (typeof BroadcastChannel !== "undefined") {
      channel.current = new BroadcastChannel("lifecycle:session");
      channel.current.onmessage = (event: MessageEvent<unknown>) => {
        if (event.data !== "changed") return;
        authRequest.current?.abort();
        identity.current=null;clearResourceCache(); setUser(null); setError(null); setLoading(true); setRevision((value) => value + 1);
      };
    }
    const expired = () => { authRequest.current?.abort(); identity.current=null;clearResourceCache(); setUser(null); channel.current?.postMessage("changed"); };
    window.addEventListener("lifecycle:session-expired", expired);
    return () => { window.removeEventListener("lifecycle:session-expired", expired); channel.current?.close(); channel.current = null; };
  }, []);

  const signIn = useCallback((next: User) => { authRequest.current?.abort(); identity.current=next;clearResourceCache(); setUser(next); setError(null); channel.current?.postMessage("changed"); }, []);
  const signOut = useCallback(async () => {
    authRequest.current?.abort();
    try { await api<void>("/auth/logout", { method: "POST" }); }
    catch (failure) { if (!(failure instanceof ApiError && failure.status === 401)) throw failure; }
    authRequest.current?.abort(); identity.current=null;clearResourceCache(); setUser(null);
    channel.current?.postMessage("changed");
  }, []);
  const reload = useCallback(() => { setLoading(true); setError(null); setRevision((value) => value + 1); }, []);

  return <AuthContext value={{ user, loading, error, signIn, signOut, reload }}>{children}</AuthContext>;
}
