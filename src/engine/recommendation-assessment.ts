import type {
  DecisionAnalysis,
  MatchedConcept,
  PatternAssessment,
  ScoreBreakdown,
} from "../domain/decision.js";

const ADOPTION_THRESHOLD = 24;

export function determineRecommendation(
  topScore: number,
  confidence: "low" | "medium" | "high",
  evidenceCount: number,
): DecisionAnalysis["recommendation"] {
  if (topScore < ADOPTION_THRESHOLD) {
    return evidenceCount === 0 ? "gather-evidence" : "prefer-direct-solution";
  }
  return confidence === "low" && evidenceCount === 0 ? "gather-evidence" : "adopt-patterns";
}

export function assessmentConfidence(
  score: ScoreBreakdown,
  concepts: readonly MatchedConcept[],
): "low" | "medium" | "high" {
  if (score.total >= 45 && concepts.length >= 1) return "high";
  if (score.total >= 24) return "medium";
  return "low";
}

export function decisionConfidence(
  evidenceCount: number,
  first: number,
  second: number,
  concepts: readonly MatchedConcept[],
): "low" | "medium" | "high" {
  if (first >= 45 && first - second >= 6 && concepts.length >= 1 && evidenceCount > 0) {
    return "high";
  }
  if (first >= 26 && concepts.length >= 1) return "medium";
  return "low";
}

export function summarizeRecommendation(
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

export function questionsFor(
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
