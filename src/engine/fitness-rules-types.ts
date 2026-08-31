import type { DesignCaseInput } from "../domain/design-case.js";

export interface BoundaryRule {
  readonly sourceLayer: string;
  readonly forbiddenTargetLayers: readonly string[];
  readonly reason: string;
}

export interface EslintRuleConfig {
  readonly description: string;
  readonly plugin: "@typescript-eslint/no-restricted-imports" | "eslint-plugin-boundaries";
  readonly config: string;
}

export interface FitnessTestConfig {
  readonly framework: string;
  readonly filename: string;
  readonly testCode: string;
}

export interface CiCommandConfig {
  readonly bashScript: string;
  readonly commands: readonly string[];
}

export interface FitnessRuleArtifact {
  readonly filename: string;
  readonly language: "typescript" | "javascript" | "json" | "bash";
  readonly description: string;
  readonly content: string;
}

export interface ArchitectureFitnessRules {
  readonly patternName: string;
  readonly architectureStyle: string;
  readonly description: string;
  readonly boundaryRules: readonly BoundaryRule[];
  readonly eslintRules: EslintRuleConfig;
  readonly fitnessTests: FitnessTestConfig;
  readonly ciCommands: CiCommandConfig;
  readonly files: readonly FitnessRuleArtifact[];
  readonly markdownSummary: string;
}

export type FitnessFramework = "vitest" | "ts-arch" | "eslint" | "all";

export interface FitnessRulesOptions {
  readonly patternName?: string | undefined;
  readonly pattern?: string | undefined;
  readonly case?: DesignCaseInput | undefined;
  readonly designCase?: DesignCaseInput | undefined;
  readonly framework?: FitnessFramework | undefined;
}
