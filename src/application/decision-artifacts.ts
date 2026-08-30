import type { DecisionAnalysis, PatternAssessment } from "../domain/decision.js";
import type { Cost, PatternLayer } from "../domain/pattern.js";
import type { PatternIntelligence } from "./pattern-intelligence.js";

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

export interface GraphQueryResult {
  readonly nodes: readonly {
    id: string;
    name: string;
    layer: PatternLayer;
    adoptionCost: Cost;
    reason: string;
  }[];
  readonly edges: readonly { from: string; to: string; relation: "related" }[];
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

export function buildAdr(title: string, analysis: DecisionAnalysis): string {
  const primary = analysis.patterns[0];
  const options = analysis.patterns.slice(0, 4);
  const decision =
    analysis.recommendation === "adopt-patterns" && primary
      ? `Adopt ${primary.pattern.name} as a bounded, reversible experiment.`
      : analysis.recommendation === "prefer-direct-solution"
        ? "Keep the implementation direct; no pattern is justified by current evidence."
        : "Defer the pattern decision until the listed evidence is collected.";

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
    "## Considered options",
    "",
    ...options.flatMap((option) => [
      `### ${option.pattern.name} — ${option.score}/100`,
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
    ...(primary?.evidencePlan.removeWhen.map((trigger) => `- ${trigger}`) ?? [
      "- The forces remain unverified.",
    ]),
    "",
    "## Open questions",
    "",
    ...analysis.questions.map((question) => `- ${question}`),
    "",
  ].join("\n");
}

export function queryGraph(
  intelligence: PatternIntelligence,
  input: {
    text?: string | undefined;
    seedPatterns?: readonly string[] | undefined;
    layers?: readonly PatternLayer[] | undefined;
    maxAdoptionCost?: Cost | undefined;
    limit?: number | undefined;
  },
): GraphQueryResult {
  if (!input.text && (input.seedPatterns?.length ?? 0) === 0) {
    throw new Error("Supply problem text, at least one seed pattern, or both.");
  }

  const costRank: Readonly<Record<Cost, number>> = { low: 0, medium: 1, high: 2 };
  const limit = Math.min(Math.max(input.limit ?? 12, 1), 30);
  const candidates = new Map<string, string>();

  if (input.text) {
    const ranked = intelligence.analyze({ problem: input.text }, limit).patterns;
    for (const assessment of ranked) {
      candidates.set(assessment.pattern.id, `Contextual score ${assessment.score}/100.`);
    }
  }

  for (const value of input.seedPatterns ?? []) {
    const seed = intelligence.store.findByNameOrId(value);
    if (!seed) throw new Error(`Unknown pattern: ${value}`);
    candidates.set(seed.id, "Explicit seed.");
    for (const related of intelligence.store.relatedTo(seed.id)) {
      candidates.set(related.id, `Related to ${seed.name}.`);
    }
  }

  const allowedCost = costRank[input.maxAdoptionCost ?? "high"];
  const nodes = [...candidates]
    .map(([id, reason]) => ({ pattern: intelligence.store.require(id), reason }))
    .filter(
      ({ pattern }) =>
        (!input.layers || input.layers.includes(pattern.layer)) &&
        costRank[pattern.adoptionCost] <= allowedCost,
    )
    .slice(0, limit)
    .map(({ pattern, reason }) => ({
      id: pattern.id,
      name: pattern.name,
      layer: pattern.layer,
      adoptionCost: pattern.adoptionCost,
      reason,
    }));
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = nodes.flatMap((node) =>
    intelligence.store
      .require(node.id)
      .related.filter((relatedId) => nodeIds.has(relatedId) && node.id < relatedId)
      .map((relatedId) => ({ from: node.id, to: relatedId, relation: "related" as const })),
  );

  return { nodes, edges };
}
