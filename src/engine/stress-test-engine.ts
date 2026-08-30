import type { ScenarioMutation, StressTestResult } from "../domain/decision.js";
import {
  type DesignCaseInput,
  designCasePatchSchema,
  designCaseSchema,
} from "../domain/design-case.js";
import type { RecommendationEngine } from "./recommendation-engine.js";

export class StressTestEngine {
  public constructor(private readonly recommendations: RecommendationEngine) {}

  public stressTest(
    input: DesignCaseInput,
    mutations: readonly ScenarioMutation[],
  ): StressTestResult {
    if (mutations.length === 0 || mutations.length > 12) {
      throw new Error("Supply between one and twelve scenario mutations.");
    }

    const baseline = this.recommendations.analyze(input);
    const baselineTop = baseline.patterns[0]?.pattern.id ?? null;
    const outcomes = mutations.map((mutation) => {
      const patch = designCasePatchSchema.parse(mutation.patch);
      const nextCase = designCaseSchema.parse(mergeCase(baseline.normalizedCase, patch));
      const result = this.recommendations.analyze(nextCase);
      const nextTop = result.patterns[0]?.pattern.id ?? null;
      return {
        name: mutation.name,
        patch,
        topPatternBefore: baselineTop,
        topPatternAfter: nextTop,
        decisionChanged:
          baseline.recommendation !== result.recommendation || baselineTop !== nextTop,
        confidenceAfter: result.confidence,
        explanation:
          baselineTop === nextTop
            ? `${baselineTop ?? "The direct solution"} remains stable under this mutation.`
            : `The leading option changes from ${baselineTop ?? "a direct solution"} to ${nextTop ?? "a direct solution"}.`,
      };
    });

    const topAfter = outcomes.map((outcome) => outcome.topPatternAfter).filter(isString);
    const baselinePatternIds = new Set(
      baseline.patterns.map((assessment) => assessment.pattern.id),
    );

    return {
      baseline,
      scenarios: outcomes,
      stablePatterns: [...baselinePatternIds].filter((id) => topAfter.every((top) => top === id)),
      sensitivePatterns: [...new Set(topAfter.filter((id) => id !== baselineTop))],
    };
  }
}

function mergeCase(
  base: StressTestResult["baseline"]["normalizedCase"],
  patch: ScenarioMutation["patch"],
): DesignCaseInput {
  return {
    ...base,
    ...patch,
    problem: patch.problem ?? base.problem,
    scale: patch.scale ? { ...base.scale, ...patch.scale } : base.scale,
    team: patch.team ? { ...base.team, ...patch.team } : base.team,
  };
}

function isString(value: string | null): value is string {
  return value !== null;
}
