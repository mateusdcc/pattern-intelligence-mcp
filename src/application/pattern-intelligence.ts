import type { CodeQualityReport } from "../domain/code-quality.js";
import type {
  DecisionAnalysis,
  MisuseFinding,
  PatternAssessment,
  PatternComparison,
  ScenarioMutation,
  StressTestResult,
} from "../domain/decision.js";
import type { DesignCaseInput } from "../domain/design-case.js";
import {
  type ArchitecturePrescription,
  prescribeArchitecture,
} from "../engine/architecture-prescriber.js";
import { analyzeCodeQuality } from "../engine/code-quality-analyzer.js";
import { refactorCodeSmell, type SmellRefactorResult } from "../engine/code-smell-refactorer.js";
import { ComparisonEngine } from "../engine/comparison-engine.js";
import { MisuseDetector } from "../engine/misuse-detector.js";
import { RecommendationEngine } from "../engine/recommendation-engine.js";
import {
  type RefactoringScaffold,
  synthesizeRefactoring,
} from "../engine/refactoring-synthesizer.js";
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

  public assessPattern(input: DesignCaseInput, patternName: string): PatternAssessment {
    const pattern = this.store.findByNameOrId(patternName);
    if (!pattern) throw new Error(`Unknown pattern: ${patternName}`);
    return this.#recommendations.scorePattern(pattern.id, input);
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

  public diagnoseCodeQuality(code: string, fileName?: string): CodeQualityReport {
    return analyzeCodeQuality(code, fileName);
  }

  public synthesizeRefactoring(patternName: string): RefactoringScaffold {
    return synthesizeRefactoring(patternName);
  }

  public prescribe(input: DesignCaseInput): ArchitecturePrescription {
    const analysis = this.#recommendations.analyze(input);
    return prescribeArchitecture(analysis, input);
  }

  public refactorSmell(code: string, fileName?: string): SmellRefactorResult {
    return refactorCodeSmell(code, fileName);
  }
}
