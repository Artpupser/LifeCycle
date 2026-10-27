import { createContext, useContext } from "react";

export type User = { id: string; email: string };
export type AuthContextValue = {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (user: User) => void;
  signOut: () => Promise<void>;
  reload: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("AuthProvider is missing");
  return context;
}
