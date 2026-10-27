import { useCallback, useEffect, useState, type ReactNode } from "react";
import { api, ApiError, errorMessage } from "@/lib/api";
import { AuthContext, type User } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void api<{ user: User }>("/auth/me", { signal: controller.signal })
      .then((data) => { if (!controller.signal.aborted) { setUser(data.user); setError(null); } })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) {
          setUser(null);
          setError(failure instanceof ApiError && failure.status === 401 ? null : errorMessage(failure));
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision]);

  useEffect(() => {
    const expired = () => setUser(null);
    window.addEventListener("lifecycle:session-expired", expired);
    return () => window.removeEventListener("lifecycle:session-expired", expired);
  }, []);

  const signIn = useCallback((next: User) => { setUser(next); setError(null); }, []);
  const signOut = useCallback(async () => {
    try { await api<void>("/auth/logout", { method: "POST" }); }
    catch (failure) { if (!(failure instanceof ApiError && failure.status === 401)) throw failure; }
    setUser(null);
  }, []);
  const reload = useCallback(() => { setLoading(true); setError(null); setRevision((value) => value + 1); }, []);

  return <AuthContext value={{ user, loading, error, signIn, signOut, reload }}>{children}</AuthContext>;
}
