import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";

const problemArgs = z.object({
  problem: z.string().min(10),
  context: z.string().optional(),
});

export function registerPrompts(server: McpServer): void {
  server.registerPrompt(
    "design-review",
    {
      title: "Evidence-aware design review",
      description: "Review a design without pattern-first reasoning.",
      argsSchema: problemArgs,
    },
    ({ problem, context }) => prompt(reviewPrompt(problem, context)),
  );

  server.registerPrompt(
    "architecture-decision",
    {
      title: "Architecture decision",
      description: "Analyze, compare, stress-test, and record a consequential pattern decision.",
      argsSchema: problemArgs,
    },
    ({ problem, context }) =>
      prompt(
        `Analyze this architecture decision: ${problem}\nContext: ${context ?? "not supplied"}\nUse analyze_design_case first. Compare only plausible options, stress-test expensive choices, then write a proposed ADR. Preserve uncertainty and recommend a direct solution when no pattern is justified.`,
      ),
  );

  server.registerPrompt(
    "safe-refactor",
    {
      title: "Safe pattern refactor",
      description: "Challenge a proposed pattern and plan a reversible refactor.",
      argsSchema: z.object({
        problem: z.string().min(10),
        proposedPattern: z.string().min(1),
        context: z.string().optional(),
      }),
    },
    ({ problem, proposedPattern, context }) =>
      prompt(
        `We may introduce ${proposedPattern} for: ${problem}\nContext: ${context ?? "not supplied"}\nRun detect_pattern_misuse and get_pattern_evidence_plan before plan_pattern_adoption. Prefer the smallest reversible seam and include rollback and deletion triggers.`,
      ),
  );

  server.registerPrompt(
    "incident-to-pattern",
    {
      title: "Incident to design evidence",
      description: "Turn an incident into forces and testable pattern hypotheses.",
      argsSchema: z.object({
        incident: z.string().min(10),
        systemContext: z.string().optional(),
      }),
    },
    ({ incident, systemContext }) =>
      prompt(
        `Treat this incident as evidence, not proof of a favorite pattern: ${incident}\nSystem context: ${systemContext ?? "not supplied"}\nUse analyze_design_case to identify failure forces, ask for missing delivery and consistency semantics, and produce at most one primary pattern plus independently justified supporting patterns.`,
      ),
  );
}

function reviewPrompt(problem: string, context?: string): string {
  return `Review this design problem: ${problem}\nContext: ${context ?? "not supplied"}\nStart with analyze_design_case. State missing evidence, distinguish abstraction layers, explicitly consider no pattern, and use compare_pattern_options only for candidates with materially different tradeoffs.`;
}

function prompt(text: string) {
  return {
    messages: [{ role: "user" as const, content: { type: "text" as const, text } }],
  };
}
