import type {
  DecisionAnalysis,
  MisuseFinding,
  PatternComparison,
  ScenarioMutation,
  StressTestResult,
} from "../domain/decision.js";
import type { DesignCaseInput } from "../domain/design-case.js";
import { ComparisonEngine } from "../engine/comparison-engine.js";
import { MisuseDetector } from "../engine/misuse-detector.js";
import { RecommendationEngine } from "../engine/recommendation-engine.js";
import { StressTestEngine } from "../engine/stress-test-engine.js";
import { loadCatalog } from "../knowledge/catalog-loader.js";
import { PatternStore } from "../knowledge/pattern-store.js";

export class PatternIntelligence {
  public readonly store: PatternStore;
  readonly #recommendations: RecommendationEngine;
  readonly #comparisons: ComparisonEngine;
  readonly #misuse: MisuseDetector;
  readonly #stressTests: StressTestEngine;

  public constructor(store = new PatternStore(loadCatalog())) {
    this.store = store;
    this.#recommendations = new RecommendationEngine(store);
    this.#comparisons = new ComparisonEngine(store, this.#recommendations);
    this.#misuse = new MisuseDetector(store, this.#recommendations);
    this.#stressTests = new StressTestEngine(this.#recommendations);
  }

  public analyze(input: DesignCaseInput, limit?: number): DecisionAnalysis {
    return this.#recommendations.analyze(input, limit);
  }

  public compare(input: DesignCaseInput, patternNames: readonly string[]): PatternComparison {
    return this.#comparisons.compare(input, patternNames);
  }

  public detectMisuse(
    input: DesignCaseInput,
    patternNames: readonly string[],
  ): readonly MisuseFinding[] {
    return this.#misuse.inspect(input, patternNames);
  }

  public stressTest(
    input: DesignCaseInput,
    mutations: readonly ScenarioMutation[],
  ): StressTestResult {
    return this.#stressTests.stressTest(input, mutations);
  }
}
