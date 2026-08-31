import { getModularMonolithRules } from "./fitness-rules-modular-monolith.js";
import { getCqrsRules, getOutboxRules } from "./fitness-rules-outbox-cqrs.js";
import {
  getCleanArchitectureRules,
  getPortsAndAdaptersRules,
} from "./fitness-rules-ports-adapters.js";
import { getConcurrencyRules, getResilienceRules } from "./fitness-rules-resilience-concurrency.js";
import { getSagaRules, getStranglerRules } from "./fitness-rules-saga-strangler.js";
import type { ArchitectureFitnessRules, FitnessFramework } from "./fitness-rules-types.js";

function matchesPattern(norm: string, keywords: readonly string[]): boolean {
  return keywords.some((k) => norm.includes(k));
}

export function selectFitnessRulesTemplate(
  patternName: string,
  framework?: FitnessFramework,
): ArchitectureFitnessRules {
  const norm = patternName.toLowerCase();
  if (matchesPattern(norm, ["outbox", "dual"])) return getOutboxRules(framework);
  if (matchesPattern(norm, ["modular", "monolith", "bounded", "domain-bus", "event-bus"]))
    return getModularMonolithRules(framework);
  if (matchesPattern(norm, ["cqrs", "command", "query"])) return getCqrsRules(framework);
  if (matchesPattern(norm, ["concurrency", "optimistic", "occ", "versioning"]))
    return getConcurrencyRules(framework);
  if (matchesPattern(norm, ["saga", "orchestrat", "compensation"])) return getSagaRules(framework);
  if (matchesPattern(norm, ["strangler", "branch by abstraction", "shadow"]))
    return getStranglerRules(framework);
  if (matchesPattern(norm, ["circuit", "timeout", "resilience", "retry"]))
    return getResilienceRules(framework);
  if (matchesPattern(norm, ["clean", "onion"])) return getCleanArchitectureRules(framework);
  return getPortsAndAdaptersRules(framework);
}
