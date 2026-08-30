import type { ForceMap, MatchedConcept } from "../domain/decision.js";
import type { DesignCase } from "../domain/design-case.js";

export function analyzeForces(
  designCase: DesignCase,
  matchedConcepts: readonly MatchedConcept[],
): ForceMap {
  const unknowns: string[] = [];

  if (!designCase.scale?.throughput) {
    unknowns.push("Expected throughput and peak-to-average load are not stated.");
  }
  if (!designCase.team?.operationsCapacity) {
    unknowns.push("The team's capacity to operate additional infrastructure is unknown.");
  }
  if (designCase.consistency === "unknown") {
    unknowns.push("Required consistency and acceptable staleness are unknown.");
  }
  if (designCase.delivery === "unknown") {
    unknowns.push("Delivery semantics and duplicate handling are unknown.");
  }
  if (designCase.evidence.length === 0) {
    unknowns.push(
      "No measurements, incidents, profiles, or change-frequency evidence were supplied.",
    );
  }

  const tensions = designCase.constraints.map((constraint) => `Constraint: ${constraint}`);
  if (designCase.complexityBudget === "minimal") {
    tensions.push("New abstraction and operational machinery must be strongly justified.");
  }
  if (
    designCase.consistency === "strong" &&
    designCase.scale?.geographicDistribution === "global"
  ) {
    tensions.push("Global distribution conflicts with low-latency strong consistency.");
  }
  if (designCase.delivery === "at-least-once") {
    tensions.push(
      "At-least-once delivery trades simpler transport guarantees for duplicate handling.",
    );
  }

  return {
    drivers: [
      ...matchedConcepts.map((concept) => concept.description),
      ...designCase.goals.map((goal) => `Goal: ${goal}`),
      ...designCase.failureModes.map((failure) => `Failure to contain: ${failure}`),
    ],
    tensions,
    unknowns,
    matchedConcepts,
  };
}
