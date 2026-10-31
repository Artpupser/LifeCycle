import { describe, expect, it } from "vitest";
import { parseActions } from "./actions";

describe("untrusted AI proposals", () => {
  it("recognizes one explicit proposal without executing it", () => {
    const proposal = { summary: "Use existing exercise", actions: [{ entity: "workout", operation: "create", id: "not-yet-validated", data: {} }] };
    expect(parseActions(`Explanation\n\`\`\`lifecycle-actions\n${JSON.stringify(proposal)}\n\`\`\``)).toEqual(proposal);
  });
  it("ignores malformed, ambiguous, empty and ordinary Markdown blocks", () => {
    for (const answer of ["```json\n{}\n```", "```lifecycle-actions\nnot json\n```", "```lifecycle-actions\n{\"summary\":\"x\",\"actions\":[]}\n```", "```lifecycle-actions\n{}\n```\n```lifecycle-actions\n{}\n```", "<script>globalThis.executed=true</script>"]) expect(parseActions(answer)).toBeNull();
  });
});
