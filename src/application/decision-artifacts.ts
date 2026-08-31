import type { DecisionAnalysis, PatternAssessment } from "../domain/decision.js";
import { buildRejectionMatrixEntry } from "../engine/tipping-points.js";

export { type GraphQueryResult, queryGraph } from "./graph-query.js";

export interface AdoptionPlan {
  readonly pattern: string;
  readonly verdict: "prototype" | "adopt" | "do-not-adopt-yet";
  readonly objective: string;
  readonly prerequisites: readonly string[];
  readonly stages: readonly {
    name: string;
    actions: readonly string[];
    exitCriteria: readonly string[];
    rollback: string;
  }[];
}

export function buildAdoptionPlan(assessment: PatternAssessment): AdoptionPlan {
  const verdict =
    assessment.score >= 45 ? "adopt" : assessment.score >= 22 ? "prototype" : "do-not-adopt-yet";

  return {
    pattern: assessment.pattern.name,
    verdict,
    objective: assessment.evidencePlan.hypothesis,
    prerequisites: [
      `Confirm the case actually has this force: ${assessment.pattern.problem}.`,
      `Disprove or outgrow the simpler alternative: ${assessment.simplerAlternative}.`,
      "Record baseline measurements and an owner for the decision.",
    ],
    stages: [
      {
        name: "Baseline and seam",
        actions: [
          ...assessment.evidencePlan.experiment.slice(0, 1),
          "Put the changing behavior behind the narrowest existing boundary; do not redesign adjacent code.",
        ],
        exitCriteria: assessment.evidencePlan.measure.slice(0, 3),
        rollback: "Keep the old path callable and restore it without a data migration.",
      },
      {
        name: "Smallest production slice",
        actions: [
          `Implement one representative path with ${assessment.pattern.name}.`,
          "Add contract, failure, and concurrency tests for the boundary affected by the pattern.",
          "Compare the implementation with a direct solution in review.",
        ],
        exitCriteria: [
          "The intended variation is easier to add without unrelated edits.",
          "The failure modes named in the case are exercised.",
          "No generic framework was introduced beyond the current use case.",
        ],
        rollback: "Route all callers back to the prior implementation and remove the unused seam.",
      },
      {
        name: "Measure and decide",
        actions: [
          ...assessment.evidencePlan.experiment.slice(1),
          "Record the decision, consequences, and a deletion trigger.",
        ],
        exitCriteria: [
          "The hypothesis is supported by measurements or the experiment is stopped.",
          "Operational ownership and observability are explicit.",
        ],
        rollback: assessment.evidencePlan.rejectWhen[0] ?? "Revert if the hypothesis fails.",
      },
    ],
  };
}

function formatAdrDecision(
  analysis: DecisionAnalysis,
  primary: PatternAssessment | undefined,
): string {
  if (analysis.recommendation === "adopt-patterns" && primary) {
    return `Adopt ${primary.pattern.name} as a bounded, reversible experiment.`;
  }
  if (analysis.recommendation === "prefer-direct-solution") {
    return "Keep the implementation direct; no pattern is justified by current evidence.";
  }
  return "Defer the pattern decision until the listed evidence is collected.";
}

function buildAdrRejectionSection(analysis: DecisionAnalysis): readonly string[] {
  const rejected =
    analysis.rejectedPatterns.length > 0
      ? analysis.rejectedPatterns
      : analysis.recommendation === "prefer-direct-solution"
        ? analysis.patterns
        : [];
  if (rejected.length === 0) return [];
  const entries = rejected.map((r) =>
    buildRejectionMatrixEntry(
      r.pattern,
      r.score,
      r.scoreBreakdown.contradictionPenalty,
      r.liabilities.length > 0 ? r.liabilities : r.why,
      analysis.normalizedCase.team?.size,
    ),
  );
  return [
    "## Anti-Pattern Rejection Matrix",
    "",
    "| Pattern | Qualification | Rejection Reason | Direct Baseline | Revisit Tipping Point |",
    "| :--- | :--- | :--- | :--- | :--- |",
    ...entries.map(
      (e) =>
        `| ${e.pattern} | ${e.qualification.toUpperCase()} | ${e.reason} | ${e.directBaseline} | ${e.tippingPoint} |`,
    ),
    "",
  ];
}

function buildAdrReversalTriggers(analysis: DecisionAnalysis): readonly string[] {
  const primary = analysis.patterns[0];
  if (analysis.recommendation === "prefer-direct-solution") {
    const rejected =
      analysis.rejectedPatterns.length > 0 ? analysis.rejectedPatterns : analysis.patterns;
    const entries = rejected.map((r) =>
      buildRejectionMatrixEntry(
        r.pattern,
        r.score,
        r.scoreBreakdown.contradictionPenalty,
        r.liabilities.length > 0 ? r.liabilities : r.why,
        analysis.normalizedCase.team?.size,
      ),
    );
    return entries.map((e) => `- Revisit ${e.pattern} when: ${e.tippingPoint}.`);
  }
  return (
    primary?.evidencePlan.removeWhen.map((trigger) => `- ${trigger}`) ?? [
      "- The forces remain unverified.",
    ]
  );
}

export function buildAdr(title: string, analysis: DecisionAnalysis): string {
  const primary = analysis.patterns[0];
  const options = analysis.patterns.slice(0, 4);
  const decision = formatAdrDecision(analysis, primary);
  const rejectionSection = buildAdrRejectionSection(analysis);
  const reversalTriggers = buildAdrReversalTriggers(analysis);

  return [
    `# ADR: ${title}`,
    "",
    "- Status: Proposed",
    `- Decision confidence: ${analysis.confidence}`,
    "",
    "## Context",
    "",
    analysis.normalizedCase.problem,
    "",
    ...analysis.forceMap.drivers.map((driver) => `- ${driver}`),
    "",
    "## Decision",
    "",
    decision,
    "",
    ...rejectionSection,
    "## Considered options",
    "",
    ...options.flatMap((option) => [
      `### ${option.pattern.name} - ${option.score}/100`,
      "",
      `Fit: ${option.why.join(" ") || "No strong contextual signal."}`,
      "",
      `Liability: ${option.liabilities.join(" ")}`,
      "",
      `Simpler alternative: ${option.simplerAlternative}`,
      "",
    ]),
    "## Validation",
    "",
    ...(primary?.evidencePlan.measure.map((measure) => `- Measure ${measure}.`) ?? [
      "- Establish a baseline and rerun the analysis.",
    ]),
    "",
    "## Reversal triggers",
    "",
    ...reversalTriggers,
    "",
    "## Open questions",
    "",
    ...analysis.questions.map((question) => `- ${question}`),
    "",
  ].join("\n");
}
