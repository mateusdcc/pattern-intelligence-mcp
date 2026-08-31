import type { Cost, PatternLayer } from "../domain/pattern.js";
import type { PatternIntelligence } from "./pattern-intelligence.js";

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

function resolveSeedCandidates(
  intelligence: PatternIntelligence,
  seedPatterns?: readonly string[],
): Map<string, string> {
  const candidates = new Map<string, string>();
  for (const value of seedPatterns ?? []) {
    const seed = intelligence.store.findByNameOrId(value);
    if (!seed) throw new Error(`Unknown pattern: ${value}`);
    candidates.set(seed.id, "Explicit seed.");
    for (const related of intelligence.store.relatedTo(seed.id)) {
      candidates.set(related.id, `Related to ${seed.name}.`);
    }
  }
  return candidates;
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
  const candidates = resolveSeedCandidates(intelligence, input.seedPatterns);

  if (input.text) {
    const ranked = intelligence.analyze({ problem: input.text }, limit).patterns;
    for (const assessment of ranked) {
      candidates.set(assessment.pattern.id, `Contextual score ${assessment.score}/100.`);
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
