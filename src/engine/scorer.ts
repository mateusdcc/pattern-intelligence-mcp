import type { MatchedConcept, ScoreBreakdown } from "../domain/decision.js";
import type { DesignCase } from "../domain/design-case.js";
import type { Cost, Pattern } from "../domain/pattern.js";
import type { ConceptRule } from "../knowledge/ontology.js";
import type { PatternStore } from "../knowledge/pattern-store.js";
import { caseText } from "./case-text.js";
import { includesPhrase, tokenize } from "./text.js";

const COST_RANK: Readonly<Record<Cost, number>> = { low: 0, medium: 1, high: 2 };

export interface ScoringContext {
  readonly designCase: DesignCase;
  readonly concepts: readonly MatchedConcept[];
  readonly rules: readonly ConceptRule[];
}

export class PatternScorer {
  readonly #documentFrequency: ReadonlyMap<string, number>;

  public constructor(private readonly store: PatternStore) {
    const frequency = new Map<string, number>();
    for (const pattern of store.all()) {
      for (const token of this.patternTokens(pattern)) {
        frequency.set(token, (frequency.get(token) ?? 0) + 1);
      }
    }
    this.#documentFrequency = frequency;
  }

  public score(pattern: Pattern, context: ScoringContext): ScoreBreakdown {
    const text = caseText(context.designCase);
    const exactName = includesPhrase(text, pattern.name) ? 18 : 0;
    const lexicalFit = this.lexicalFit(pattern, text);
    const conceptFit = this.conceptFit(pattern, context);
    const structuredContext = this.structuredContextFit(pattern, context.designCase);
    const candidatePreference = this.isCandidate(pattern, context.designCase) ? 6 : 0;
    const complexityPenalty = this.complexityPenalty(pattern, context.designCase);
    const contradictionPenalty = this.contradictionPenalty(pattern, context);
    const raw =
      exactName +
      lexicalFit +
      conceptFit +
      structuredContext +
      candidatePreference -
      complexityPenalty -
      contradictionPenalty;

    return {
      exactName,
      lexicalFit: round(lexicalFit),
      conceptFit: round(conceptFit),
      structuredContext: round(structuredContext),
      candidatePreference,
      complexityPenalty: round(complexityPenalty),
      contradictionPenalty: round(contradictionPenalty),
      total: clamp(round(raw), 0, 100),
    };
  }

  private lexicalFit(pattern: Pattern, text: string): number {
    const queryTokens = tokenize(text);
    if (queryTokens.size === 0) return 0;

    let weightedMatches = 0;
    let possible = 0;
    for (const token of this.patternTokens(pattern)) {
      const frequency = this.#documentFrequency.get(token) ?? this.store.count();
      const inverseFrequency = Math.log((this.store.count() + 1) / (frequency + 1)) + 1;
      possible += inverseFrequency;
      if (queryTokens.has(token)) weightedMatches += inverseFrequency;
    }

    return possible === 0 ? 0 : Math.min(28, (weightedMatches / Math.sqrt(possible)) * 5.5);
  }

  private conceptFit(pattern: Pattern, context: ScoringContext): number {
    let value = 0;
    for (const [index, rule] of context.rules.entries()) {
      const strength = context.concepts[index]?.strength ?? 0;
      value += (rule.boosts[pattern.id] ?? 0) * strength * 2.3;
    }
    return Math.min(34, value);
  }

  private structuredContextFit(pattern: Pattern, designCase: DesignCase): number {
    let value = 0;
    const throughput = designCase.scale?.throughput;
    const distributed = pattern.layer === "distributed-systems";
    const messaging = pattern.layer === "integration-messaging";

    if ((throughput === "high" || throughput === "extreme") && distributed) value += 4;
    if (designCase.scale?.geographicDistribution === "global" && distributed) value += 5;
    if (designCase.scale?.tenancy === "highly-isolated" && distributed) value += 4;
    if (designCase.delivery === "at-least-once" && messaging) value += 6;
    if (designCase.consistency === "eventual" && distributed) value += 4;
    if (designCase.statefulness === "stateful" && pattern.id === "actor") value += 3;
    if (designCase.riskTolerance === "low" && pattern.layer === "testing") value += 2;

    return value;
  }

  private complexityPenalty(pattern: Pattern, designCase: DesignCase): number {
    const adoption = COST_RANK[pattern.adoptionCost];
    const operations = COST_RANK[pattern.operationalCost];
    const multiplier =
      designCase.complexityBudget === "minimal"
        ? 2.2
        : designCase.complexityBudget === "substantial"
          ? 0.45
          : 1;
    let penalty = (adoption * 3.5 + operations * 3) * multiplier;

    if (designCase.team?.operationsCapacity === "limited") {
      penalty += operations * 4;
    }
    if ((designCase.team?.size ?? Number.POSITIVE_INFINITY) <= 3) {
      penalty += adoption * 2;
    }
    return penalty;
  }

  private contradictionPenalty(pattern: Pattern, context: ScoringContext): number {
    let penalty = 0;
    for (const [index, rule] of context.rules.entries()) {
      penalty +=
        (rule.penalties?.[pattern.id] ?? 0) * (context.concepts[index]?.strength ?? 0) * 2.4;
    }

    const antiGoalText = context.designCase.antiGoals.join(" ");
    if (includesPhrase(antiGoalText, pattern.name)) penalty += 18;

    return Math.min(35, penalty);
  }

  private isCandidate(pattern: Pattern, designCase: DesignCase): boolean {
    return designCase.candidatePatterns.some(
      (candidate) =>
        candidate.trim().toLowerCase() === pattern.id ||
        candidate.trim().toLowerCase() === pattern.name.toLowerCase(),
    );
  }

  private patternTokens(pattern: Pattern): ReadonlySet<string> {
    return tokenize(
      [
        pattern.name,
        pattern.problem,
        pattern.exampleContext,
        pattern.mechanism,
        pattern.evidence,
        ...pattern.signals,
      ].join(" "),
    );
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
