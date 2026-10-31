import type { GeneratedActions } from "./types";

// Parsing only offers a review button. The server validates every field and permission.
export function parseActions(answer: string): GeneratedActions | null {
  const blocks = [...answer.matchAll(/```lifecycle-actions\s*\n([\s\S]*?)```/g)];
  if (blocks.length !== 1) return null;
  try {
    const value: unknown = JSON.parse(blocks[0]![1]!);
    if (!value || typeof value !== "object" || !("summary" in value) || typeof value.summary !== "string" || !("actions" in value) || !Array.isArray(value.actions) || value.actions.length < 1 || value.actions.length > 20) return null;
    return value as GeneratedActions;
  } catch { return null; }
}
export const refreshActions = () => window.dispatchEvent(new Event("lifecycle:ai-actions"));
