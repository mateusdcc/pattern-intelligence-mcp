import type { MisuseFinding } from "../domain/decision.js";
import type { DesignCaseInput } from "../domain/design-case.js";
import type { PatternStore } from "../knowledge/pattern-store.js";
import type { RecommendationEngine } from "./recommendation-engine.js";

export class MisuseDetector {
  public constructor(
    private readonly store: PatternStore,
    private readonly recommendations: RecommendationEngine,
  ) {}

  public inspect(
    input: DesignCaseInput,
    patternNames: readonly string[],
  ): readonly MisuseFinding[] {
    if (patternNames.length === 0) {
      throw new Error("Supply at least one pattern to inspect.");
    }

    const overall = this.recommendations.analyze(input, 5);
    return patternNames.map((value) => {
      const pattern = this.store.findByNameOrId(value);
      if (!pattern) throw new Error(`Unknown pattern: ${value}`);
      const assessment = this.recommendations.scorePattern(pattern.id, input);
      const risk =
        assessment.scoreBreakdown.contradictionPenalty >= 8 || assessment.score < 12
          ? "high"
          : assessment.score < 26 || pattern.adoptionCost === "high"
            ? "medium"
            : "low";
      const verdict =
        risk === "high" ? "cargo-cult-risk" : risk === "medium" ? "questionable" : "fits";

      return {
        pattern,
        risk,
        verdict,
        reasons: [
          pattern.misuse,
          ...(assessment.scoreBreakdown.contradictionPenalty > 0
            ? [
                `Observed contradictions contribute a ${assessment.scoreBreakdown.contradictionPenalty}-point penalty.`,
              ]
            : []),
          ...(pattern.adoptionCost === "high" && overall.normalizedCase.evidence.length === 0
            ? ["This is a high-cost pattern, but no measured evidence was supplied."]
            : []),
        ],
        alternatives: [
          pattern.simplerAlternative,
          ...overall.patterns
            .filter((candidate) => candidate.pattern.id !== pattern.id)
            .slice(0, 2)
            .map((candidate) => candidate.pattern.name),
        ],
        requiredEvidence: assessment.evidencePlan.measure,
      };
    });
  }
}
