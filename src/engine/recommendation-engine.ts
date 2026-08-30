import type {
  DecisionAnalysis,
  MatchedConcept,
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
import { PatternScorer, type ScoringContext } from "./scorer.js";

const ADOPTION_THRESHOLD = 24;
const REJECTION_THRESHOLD = 8;

export class RecommendationEngine {
  readonly #scorer: PatternScorer;

  public constructor(private readonly store: PatternStore) {
    this.#scorer = new PatternScorer(store);
  }

  public analyze(input: DesignCaseInput, limit = 6): DecisionAnalysis {
    const designCase = designCaseSchema.parse(input);
    const detection = detectConcepts(caseText(designCase));
    const scoringContext: ScoringContext = {
      designCase,
      concepts: detection.matches,
      rules: detection.rules,
    };
    const scored = this.store
      .all()
      .map((pattern) => ({ pattern, score: this.#scorer.score(pattern, scoringContext) }))
      .sort(
        (left, right) =>
          right.score.total - left.score.total || left.pattern.id.localeCompare(right.pattern.id),
      );
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
    const recommendation =
      topScore < ADOPTION_THRESHOLD
        ? designCase.evidence.length === 0
          ? "gather-evidence"
          : "prefer-direct-solution"
        : confidence === "low" && designCase.evidence.length === 0
          ? "gather-evidence"
          : "adopt-patterns";
    const patterns = selected.map(({ pattern, score }, index) =>
      this.assess(pattern, score, scoringContext, recommendation, index),
    );
    const rejectedPatterns = scored
      .filter(({ score }) => score.contradictionPenalty >= 8 || score.total === 0)
      .sort(
        (left, right) =>
          right.score.contradictionPenalty - left.score.contradictionPenalty ||
          left.pattern.id.localeCompare(right.pattern.id),
      )
      .slice(0, 5)
      .map(({ pattern, score }) => this.assess(pattern, score, scoringContext, recommendation, -1));
    const forceMap = analyzeForces(designCase, detection.matches);

    return {
      normalizedCase: designCase,
      forceMap,
      recommendation,
      summary: summarize(recommendation, patterns, confidence),
      confidence,
      questions: questionsFor(forceMap.unknowns, detection.matches, patterns),
      patterns,
      rejectedPatterns,
      compound: buildCompound(patterns),
    };
  }

  public scorePattern(patternId: string, input: DesignCaseInput): PatternAssessment {
    const designCase = designCaseSchema.parse(input);
    const detection = detectConcepts(caseText(designCase));
    const context = { designCase, concepts: detection.matches, rules: detection.rules };
    const pattern = this.store.require(patternId);
    return this.assess(pattern, this.#scorer.score(pattern, context), context, "adopt-patterns", 0);
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
    };
  }

  private isSupporting(pattern: Pattern, context: ScoringContext, index: number): boolean {
    if (index > 3) return false;
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
    ]);
    return (
      supportingIds.has(pattern.id) || context.designCase.candidatePatterns.includes(pattern.id)
    );
  }
}

function assessmentConfidence(
  score: ScoreBreakdown,
  concepts: readonly MatchedConcept[],
): "low" | "medium" | "high" {
  if (score.total >= 45 && concepts.length >= 1) return "high";
  if (score.total >= 24) return "medium";
  return "low";
}

function decisionConfidence(
  evidenceCount: number,
  first: number,
  second: number,
  concepts: readonly MatchedConcept[],
): "low" | "medium" | "high" {
  if (first >= 45 && first - second >= 6 && concepts.length >= 1 && evidenceCount > 0)
    return "high";
  if (first >= 26 && concepts.length >= 1) return "medium";
  return "low";
}

function summarize(
  recommendation: DecisionAnalysis["recommendation"],
  patterns: readonly PatternAssessment[],
  confidence: DecisionAnalysis["confidence"],
): string {
  const top = patterns[0];
  if (recommendation === "prefer-direct-solution") {
    return "No pattern clears the adoption threshold; keep the solution direct and re-evaluate if the forces change.";
  }
  if (recommendation === "gather-evidence") {
    return top
      ? `${top.pattern.name} is a hypothesis, not a prescription. Answer the open questions and collect a baseline first.`
      : "The case lacks enough discriminating forces to justify a pattern. Gather evidence before adding abstraction.";
  }
  return `${top?.pattern.name ?? "The leading option"} is the primary candidate with ${confidence} decision confidence; treat supporting patterns as separate responsibilities.`;
}

function questionsFor(
  unknowns: readonly string[],
  concepts: readonly MatchedConcept[],
  patterns: readonly PatternAssessment[],
): readonly string[] {
  const questions = unknowns.slice(0, 3).map((unknown) => `Clarify: ${unknown}`);
  const conceptIds = new Set(concepts.map((concept) => concept.id));
  if (conceptIds.has("remote-failure") || conceptIds.has("duplicate-delivery")) {
    questions.unshift(
      "Which operations are safe to repeat, and how is duplicate success detected?",
    );
  }
  if (patterns.some((assessment) => assessment.pattern.adoptionCost === "high")) {
    questions.push("What measured pain justifies a high-adoption-cost pattern now?");
  }
  return [...new Set(questions)].slice(0, 5);
}

function buildCompound(patterns: readonly PatternAssessment[]): DecisionAnalysis["compound"] {
  const selected = patterns.filter(
    (assessment) => assessment.role === "primary" || assessment.role === "supporting",
  );
  return selected.map((assessment) => ({
    patternId: assessment.pattern.id,
    role: assessment.role === "primary" ? "primary" : "supporting",
    reason:
      assessment.role === "primary"
        ? "Addresses the dominant force."
        : "Handles a distinct supporting responsibility; it is not bundled implicitly into the primary pattern.",
  }));
}
