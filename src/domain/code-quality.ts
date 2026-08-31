export type SmellSeverity = "critical" | "high" | "medium" | "low";

export type SmellKind =
  | "god-class"
  | "leaky-abstraction"
  | "primitive-obsession"
  | "dual-write-hazard"
  | "unbounded-retry"
  | "missing-timeout"
  | "missing-concurrency-control"
  | "shotgun-surgery"
  | "tight-coupling"
  | "feature-envy";

export interface DetectedSmell {
  readonly kind: SmellKind;
  readonly severity: SmellSeverity;
  readonly title: string;
  readonly description: string;
  readonly evidence: string;
  readonly suggestedPatterns: readonly string[];
  readonly simplerAlternative: string;
}

export interface CodeQualityMetrics {
  readonly estimatedLines: number;
  readonly cyclomaticComplexity: number;
  readonly couplingScore: number;
  readonly cohesionScore: number;
  readonly maintainabilityIndex: number;
}

export interface CodeQualityReport {
  readonly metrics: CodeQualityMetrics;
  readonly smells: readonly DetectedSmell[];
  readonly problemStatement: string;
  readonly detectedForces: readonly string[];
  readonly recommendedAction: "refactor-with-patterns" | "keep-direct-solution" | "gather-metrics";
}
