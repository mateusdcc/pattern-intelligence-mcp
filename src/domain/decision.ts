import type { DesignCase, DesignCasePatch } from "./design-case.js";
import type { Pattern, PatternLayer } from "./pattern.js";

export interface MatchedConcept {
  readonly id: string;
  readonly description: string;
  readonly matchedSignals: readonly string[];
  readonly strength: number;
}

export interface ForceMap {
  readonly drivers: readonly string[];
  readonly tensions: readonly string[];
  readonly unknowns: readonly string[];
  readonly matchedConcepts: readonly MatchedConcept[];
}

export interface ScoreBreakdown {
  readonly exactName: number;
  readonly lexicalFit: number;
  readonly conceptFit: number;
  readonly structuredContext: number;
  readonly candidatePreference: number;
  readonly complexityPenalty: number;
  readonly contradictionPenalty: number;
  readonly total: number;
}

export type RecommendationRole = "primary" | "supporting" | "alternative" | "avoid";

export type RejectionQualification = "contraindicated" | "overkill" | "premature" | "unnecessary";

export interface RejectionMatrixEntry {
  readonly pattern: string;
  readonly qualification: RejectionQualification;
  readonly reason: string;
  readonly directBaseline: string;
  readonly tippingPoint: string;
}

export interface EvidencePlan {
  readonly hypothesis: string;
  readonly measure: readonly string[];
  readonly experiment: readonly string[];
  readonly rejectWhen: readonly string[];
  readonly removeWhen: readonly string[];
}

export interface PatternAssessment {
  readonly pattern: Pattern;
  readonly score: number;
  readonly confidence: "low" | "medium" | "high";
  readonly role: RecommendationRole;
  readonly scoreBreakdown: ScoreBreakdown;
  readonly why: readonly string[];
  readonly liabilities: readonly string[];
  readonly simplerAlternative: string;
  readonly evidencePlan: EvidencePlan;
  readonly qualification?: RejectionQualification | undefined;
  readonly tippingPoint?: string | undefined;
}

export type ComponentLayer =
  | "Domain Port"
  | "Infrastructure Adapter"
  | "Outbox Relay Worker"
  | "Idempotent Consumer"
  | "Fallback Router"
  | "Workflow Coordinator"
  | "Compensation Handler"
  | "Resilience Interceptor"
  | "Migration Interceptor"
  | "Shadow Comparator"
  | string;

export interface TopologyComponent {
  readonly name: string;
  readonly patternId: string;
  readonly role: "primary" | "supporting";
  readonly layer: ComponentLayer;
  readonly responsibility: string;
}

export interface TopologyDataFlow {
  readonly from: string;
  readonly to: string;
  readonly description: string;
}

export interface CompoundTopology {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly components: readonly TopologyComponent[];
  readonly dataFlows: readonly TopologyDataFlow[];
}

export interface CompoundPattern {
  readonly patternId: string;
  readonly role: "primary" | "supporting";
  readonly reason: string;
  readonly layer?: ComponentLayer | undefined;
  readonly component?: string | undefined;
}

export interface DecisionAnalysis {
  readonly normalizedCase: DesignCase;
  readonly forceMap: ForceMap;
  readonly recommendation: "adopt-patterns" | "gather-evidence" | "prefer-direct-solution";
  readonly summary: string;
  readonly confidence: "low" | "medium" | "high";
  readonly questions: readonly string[];
  readonly patterns: readonly PatternAssessment[];
  readonly rejectedPatterns: readonly PatternAssessment[];
  readonly compound: readonly CompoundPattern[];
  readonly topology?: CompoundTopology | undefined;
}

export interface PatternComparison {
  readonly case: DesignCase;
  readonly winner: string | null;
  readonly summary: string;
  readonly options: readonly PatternAssessment[];
  readonly tippingPoints: readonly string[];
}

export interface MisuseFinding {
  readonly pattern: Pattern;
  readonly risk: "low" | "medium" | "high";
  readonly verdict: "fits" | "questionable" | "cargo-cult-risk";
  readonly qualification?: RejectionQualification | undefined;
  readonly tippingPoint?: string | undefined;
  readonly reasons: readonly string[];
  readonly alternatives: readonly string[];
  readonly requiredEvidence: readonly string[];
}

export interface ScenarioMutation {
  readonly name: string;
  readonly patch: DesignCasePatch;
}

export interface StressTestResult {
  readonly baseline: DecisionAnalysis;
  readonly scenarios: readonly {
    name: string;
    patch: DesignCasePatch;
    topPatternBefore: string | null;
    topPatternAfter: string | null;
    decisionChanged: boolean;
    confidenceAfter: "low" | "medium" | "high";
    explanation: string;
  }[];
  readonly stablePatterns: readonly string[];
  readonly sensitivePatterns: readonly string[];
}

export interface PatternSearchQuery {
  readonly text: string;
  readonly layers?: readonly PatternLayer[];
  readonly maxAdoptionCost?: "low" | "medium" | "high";
  readonly limit?: number;
}
