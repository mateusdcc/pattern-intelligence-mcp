import type { MatchedConcept } from "../domain/decision.js";
import { CONCEPT_RULES, type ConceptRule } from "../knowledge/ontology.js";
import { includesPhrase, normalizeText, tokenize } from "./text.js";

export interface ConceptDetection {
  readonly matches: readonly MatchedConcept[];
  readonly rules: readonly ConceptRule[];
}

export function detectConcepts(text: string): ConceptDetection {
  const normalized = normalizeText(text);
  const tokens = tokenize(text);
  const detections = CONCEPT_RULES.map((rule) => {
    const matchedSignals = rule.signals.filter((signal) => {
      if (includesPhrase(normalized, signal)) return true;
      const signalTokens = [...tokenize(signal)];
      return signalTokens.length > 0 && signalTokens.every((token) => tokens.has(token));
    });

    return {
      rule,
      match: {
        id: rule.id,
        description: rule.description,
        matchedSignals,
        strength: Math.min(1, matchedSignals.length / 2),
      } satisfies MatchedConcept,
    };
  }).filter(({ match }) => match.matchedSignals.length > 0);

  return {
    matches: detections.map(({ match }) => match),
    rules: detections.map(({ rule }) => rule),
  };
}
