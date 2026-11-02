import { notify } from "@/lib/feedback";
import { useState } from "react";
import { errorMessage } from "@/lib/api";

export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run(action: () => Promise<unknown>, completed?: () => void) {
    setBusy(true); setError(null);
    try { await action(); completed?.(); return true; }
    catch (failure) { const message=errorMessage(failure);setError(message);notify(message,"error"); return false; }
    finally { setBusy(false); }
  }
  return { busy, error, run };
}
