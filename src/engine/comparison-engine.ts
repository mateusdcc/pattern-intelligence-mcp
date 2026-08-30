import type { PatternComparison } from "../domain/decision.js";
import type { DesignCaseInput } from "../domain/design-case.js";
import type { PatternStore } from "../knowledge/pattern-store.js";
import type { RecommendationEngine } from "./recommendation-engine.js";

export class ComparisonEngine {
  public constructor(
    private readonly store: PatternStore,
    private readonly recommendations: RecommendationEngine,
  ) {}

  public compare(input: DesignCaseInput, patternNames: readonly string[]): PatternComparison {
    if (patternNames.length < 2 || patternNames.length > 6) {
      throw new Error("Compare between two and six patterns.");
    }

    const patterns = patternNames.map((value) => {
      const pattern = this.store.findByNameOrId(value);
      if (!pattern) throw new Error(`Unknown pattern: ${value}`);
      return pattern;
    });
    const unique = new Set(patterns.map((pattern) => pattern.id));
    if (unique.size !== patterns.length) {
      throw new Error("Pattern options must be unique.");
    }

    const options = patterns
      .map((pattern) => this.recommendations.scorePattern(pattern.id, input))
      .sort(
        (left, right) =>
          right.score - left.score || left.pattern.id.localeCompare(right.pattern.id),
      );
    const [first, second] = options;
    const decisive = first && second && first.score >= 12 && first.score - second.score >= 6;

    return {
      case: this.recommendations.analyze(input, 1).normalizedCase,
      winner: decisive && first ? first.pattern.id : null,
      summary: decisive
        ? `${first?.pattern.name} leads by ${Math.round((first?.score ?? 0) - (second?.score ?? 0))} points for the stated forces.`
        : "The supplied evidence does not produce a decisive winner; use the tipping points to refine the case.",
      options,
      tippingPoints: options.map(
        (option) =>
          `${option.pattern.name} becomes preferable when ${option.pattern.problem}; reject it when ${option.simplerAlternative}.`,
      ),
    };
  }
}
