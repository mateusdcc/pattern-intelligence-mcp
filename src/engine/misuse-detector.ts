import type { MisuseFinding } from "../domain/decision.js";
import type { DesignCaseInput } from "../domain/design-case.js";
import type { Pattern } from "../domain/pattern.js";
import type { PatternStore } from "../knowledge/pattern-store.js";
import type { RecommendationEngine } from "./recommendation-engine.js";
import {
  getDirectBaseline,
  getQuantitativeTippingPoint,
  getRejectionQualification,
} from "./tipping-points.js";

function isSmallTeam(input: DesignCaseInput): boolean {
  const size = input.team?.size;
  const constraints = input.constraints?.join(" ") ?? "";
  return (size !== undefined && size <= 5) || /small team|two-person/i.test(constraints);
}

function isSimpleCrud(input: DesignCaseInput): boolean {
  const text = `${input.problem} ${input.evidence?.join(" ") ?? ""}`;
  return /simple crud|basic crud|thin domain|few business rules|admin app/i.test(text);
}

function is2PCQuery(query: string): boolean {
  return /2pc|two-phase/i.test(query);
}

function checkPremature(pattern: Pattern, input: DesignCaseInput, query: string): boolean {
  if (is2PCQuery(query)) return true;
  if (isSmallTeam(input) && (pattern.adoptionCost === "high" || /microservice/i.test(query))) {
    return true;
  }
  if (isSimpleCrud(input) && (pattern.id === "cqrs" || pattern.id === "event-sourcing")) {
    return true;
  }
  return false;
}

function formatPrematureReason(
  pattern: Pattern,
  input: DesignCaseInput,
  query: string,
): string | null {
  if (is2PCQuery(query)) {
    return "Synchronous Two-Phase Commit coordinates blocking locks across services, causing high latency and coordinator fragility.";
  }
  if (isSmallTeam(input) && (pattern.adoptionCost === "high" || /microservice/i.test(query))) {
    const size = input.team?.size ?? "small";
    return `Microservices and heavy distributed patterns introduce operational overhead premature for ${size} engineers.`;
  }
  if (isSimpleCrud(input) && (pattern.id === "cqrs" || pattern.id === "event-sourcing")) {
    return `Low-volume CRUD with straightforward business rules does not warrant ${pattern.name} complexity.`;
  }
  return null;
}

function resolveAlternatives(
  pattern: Pattern,
  overallPatterns: readonly { pattern: Pattern }[],
  query: string,
): readonly string[] {
  if (is2PCQuery(query)) {
    return ["Single database transaction (ACID)", "Transactional Outbox", "Saga"];
  }
  const direct = getDirectBaseline(pattern);
  const otherCandidates = overallPatterns
    .filter((candidate) => candidate.pattern.id !== pattern.id)
    .slice(0, 2)
    .map((candidate) => candidate.pattern.name);
  return [direct, ...otherCandidates];
}

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
      const premature = checkPremature(pattern, input, value);
      const prematureReason = formatPrematureReason(pattern, input, value);
      const risk =
        premature || assessment.scoreBreakdown.contradictionPenalty >= 8 || assessment.score < 12
          ? "high"
          : assessment.score < 26 || pattern.adoptionCost === "high"
            ? "medium"
            : "low";
      const verdict =
        risk === "high" ? "cargo-cult-risk" : risk === "medium" ? "questionable" : "fits";
      const qualification = getRejectionQualification(
        pattern,
        assessment.score,
        assessment.scoreBreakdown.contradictionPenalty,
        overall.normalizedCase.team?.size,
        value,
      );
      const tippingPoint = getQuantitativeTippingPoint(pattern);

      const reasons = [
        ...(prematureReason ? [prematureReason] : []),
        pattern.misuse,
        ...(assessment.scoreBreakdown.contradictionPenalty > 0
          ? [
              `Observed contradictions contribute a ${assessment.scoreBreakdown.contradictionPenalty}-point penalty.`,
            ]
          : []),
        ...(pattern.adoptionCost === "high" && overall.normalizedCase.evidence.length === 0
          ? ["This is a high-cost pattern, but no measured evidence was supplied."]
          : []),
      ];

      return {
        pattern,
        risk,
        verdict,
        qualification,
        tippingPoint,
        reasons,
        alternatives: resolveAlternatives(pattern, overall.patterns, value),
        requiredEvidence: assessment.evidencePlan.measure,
      };
    });
  }
}
