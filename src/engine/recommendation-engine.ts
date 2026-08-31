import type {
  DecisionAnalysis,
  PatternAssessment,
  RecommendationRole,
  ScoreBreakdown,
} from "../domain/decision.js";
import { type DesignCaseInput, designCaseSchema } from "../domain/design-case.js";
import type { Pattern } from "../domain/pattern.js";
import type { PatternStore } from "../knowledge/pattern-store.js";
import { caseText } from "./case-text.js";
import { detectConcepts } from "./concept-detector.js";
import { planEvidence } from "./evidence-planner.js";
import { analyzeForces } from "./force-analyzer.js";
import {
  assessmentConfidence,
  decisionConfidence,
  determineRecommendation,
  questionsFor,
  summarizeRecommendation,
} from "./recommendation-assessment.js";
import { PatternScorer, type ScoringContext } from "./scorer.js";
import { getQuantitativeTippingPoint, getRejectionQualification } from "./tipping-points.js";
import { assembleCompoundTopology, buildCompoundPatterns } from "./topology-assembler.js";

const REJECTION_THRESHOLD = 8;

export class RecommendationEngine {
  readonly #scorer: PatternScorer;

  public constructor(private readonly store: PatternStore) {
    this.#scorer = new PatternScorer(store);
  }

  public analyze(input: DesignCaseInput, limit = 6): DecisionAnalysis {
    const designCase = designCaseSchema.parse(input);
    const detection = detectConcepts(caseText(designCase));
    const context: ScoringContext = {
      designCase,
      concepts: detection.matches,
      rules: detection.rules,
    };
    const scored = this.rankPatterns(context);
    const selected = scored
      .filter(({ score }) => score.total >= REJECTION_THRESHOLD)
      .slice(0, limit);
    const topScore = selected[0]?.score.total ?? 0;
    const secondScore = selected[1]?.score.total ?? 0;
    const confidence = decisionConfidence(
      designCase.evidence.length,
      topScore,
      secondScore,
      detection.matches,
    );
    const recommendation = determineRecommendation(
      topScore,
      confidence,
      designCase.evidence.length,
    );
    const patterns = selected.map(({ pattern, score }, index) =>
      this.assess(pattern, score, context, recommendation, index),
    );
    const rejectedPatterns = scored
      .filter(({ score }) => score.contradictionPenalty >= 8 || score.total === 0)
      .sort(
        (l, r) =>
          r.score.contradictionPenalty - l.score.contradictionPenalty ||
          l.pattern.id.localeCompare(r.pattern.id),
      )
      .slice(0, 5)
      .map(({ pattern, score }) => this.assess(pattern, score, context, recommendation, -1));
    const forceMap = analyzeForces(designCase, detection.matches);
    const topology =
      patterns.length === 0 ? undefined : assembleCompoundTopology(patterns, context);
    const compound = buildCompoundPatterns(patterns, topology);

    return {
      normalizedCase: designCase,
      forceMap,
      recommendation,
      summary: summarizeRecommendation(recommendation, patterns, confidence),
      confidence,
      questions: questionsFor(forceMap.unknowns, detection.matches, patterns),
      patterns,
      rejectedPatterns,
      compound,
      topology,
    };
  }

  public scorePattern(patternId: string, input: DesignCaseInput): PatternAssessment {
    const designCase = designCaseSchema.parse(input);
    const detection = detectConcepts(caseText(designCase));
    const context = { designCase, concepts: detection.matches, rules: detection.rules };
    const pattern = this.store.require(patternId);
    return this.assess(pattern, this.#scorer.score(pattern, context), context, "adopt-patterns", 0);
  }

  private rankPatterns(context: ScoringContext) {
    return this.store
      .all()
      .map((pattern) => ({ pattern, score: this.#scorer.score(pattern, context) }))
      .sort((l, r) => r.score.total - l.score.total || l.pattern.id.localeCompare(r.pattern.id));
  }

  private assess(
    pattern: Pattern,
    score: ScoreBreakdown,
    context: ScoringContext,
    recommendation: DecisionAnalysis["recommendation"],
    index: number,
  ): PatternAssessment {
    const supportingConcepts = context.rules
      .filter((rule) => (rule.boosts[pattern.id] ?? 0) > 0)
      .map((rule) => rule.description);
    const contradictions = context.rules
      .filter((rule) => (rule.penalties?.[pattern.id] ?? 0) > 0)
      .map((rule) => `Conflicts with observed force: ${rule.description}`);
    const role: RecommendationRole =
      index < 0
        ? "avoid"
        : recommendation !== "adopt-patterns"
          ? "alternative"
          : index === 0
            ? "primary"
            : this.isSupporting(pattern, context, index)
              ? "supporting"
              : "alternative";

    const qualification =
      index < 0 || recommendation === "prefer-direct-solution"
        ? getRejectionQualification(
            pattern,
            score.total,
            score.contradictionPenalty,
            context.designCase.team?.size,
          )
        : undefined;
    const tippingPoint = getQuantitativeTippingPoint(pattern);

    return {
      pattern,
      score: score.total,
      confidence: assessmentConfidence(score, context.concepts),
      role,
      scoreBreakdown: score,
      why: [
        ...supportingConcepts,
        ...(score.lexicalFit > 4
          ? ["The case vocabulary overlaps the pattern's forces and evidence."]
          : []),
        ...(score.structuredContext > 0
          ? ["Structured scale or delivery constraints improve the fit."]
          : []),
      ].slice(0, 4),
      liabilities: [pattern.misuse, ...contradictions],
      simplerAlternative: pattern.simplerAlternative,
      evidencePlan: planEvidence(pattern, context.designCase),
      qualification,
      tippingPoint,
    };
  }

  private isSupporting(pattern: Pattern, context: ScoringContext, index: number): boolean {
    if (index > 4) return false;
    const supportingIds = new Set([
      "timeout",
      "retry-with-backoff-and-jitter",
      "idempotent-receiver",
      "transactional-outbox",
      "correlation-identifier",
      "contract-test",
      "composition-root",
      "dependency-injection",
      "bulkhead",
      "anti-corruption-layer",
      "strategy",
      "dynamic-router",
    ]);
    return (
      supportingIds.has(pattern.id) || context.designCase.candidatePatterns.includes(pattern.id)
    );
  }
}
