import { selectFitnessRulesTemplate } from "./fitness-rules-templates.js";
import type { ArchitectureFitnessRules, FitnessRulesOptions } from "./fitness-rules-types.js";
import type { RecommendationEngine } from "./recommendation-engine.js";

export type {
  ArchitectureFitnessRules,
  BoundaryRule,
  CiCommandConfig,
  EslintRuleConfig,
  FitnessFramework,
  FitnessRuleArtifact,
  FitnessRulesOptions,
  FitnessTestConfig,
} from "./fitness-rules-types.js";

function resolvePatternFromCase(
  options: FitnessRulesOptions,
  recommendations?: RecommendationEngine,
): string | undefined {
  const designCase = options.case ?? options.designCase;
  if (!designCase) return undefined;
  if (recommendations) {
    const analysis = recommendations.analyze(designCase);
    const top = analysis.patterns[0];
    if (top) return top.pattern.name;
  }
  return designCase.candidatePatterns?.[0];
}

function resolvePatternName(
  options?: FitnessRulesOptions | string,
  recommendations?: RecommendationEngine,
): { name: string; framework?: FitnessRulesOptions["framework"] } {
  if (typeof options === "string") return { name: options };
  if (!options) return { name: "Ports & Adapters" };

  const explicitName = options.patternName ?? options.pattern;
  if (explicitName) return { name: explicitName, framework: options.framework };

  const diagnosedName = resolvePatternFromCase(options, recommendations);
  return {
    name: diagnosedName ?? "Ports & Adapters",
    framework: options.framework,
  };
}

export function generateFitnessRules(
  options?: FitnessRulesOptions | string,
  recommendations?: RecommendationEngine,
): ArchitectureFitnessRules {
  const { name, framework } = resolvePatternName(options, recommendations);
  return selectFitnessRulesTemplate(name, framework);
}
