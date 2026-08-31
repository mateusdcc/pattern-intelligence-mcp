#!/usr/bin/env node

export {
  type AdoptionPlan,
  buildAdoptionPlan,
  buildAdr,
  type GraphQueryResult,
  queryGraph,
} from "./application/decision-artifacts.js";
export { PatternIntelligence } from "./application/pattern-intelligence.js";
export type {
  ParsedCall,
  ParsedClass,
  ParsedExport,
  ParsedFunction,
  ParsedImport,
  ParsedModule,
} from "./domain/code-ast-types.js";
export type {
  CodeQualityMetrics,
  CodeQualityReport,
  DetectedSmell,
  MetricComparison,
  SmellKind,
  SmellSeverity,
} from "./domain/code-quality.js";
export {
  type ArchitecturePrescription,
  prescribeArchitecture,
} from "./engine/architecture-prescriber.js";
export { analyzeCodeQuality } from "./engine/code-quality-analyzer.js";
export {
  refactorCodeSmell,
  type SmellRefactorResult,
} from "./engine/code-smell-refactorer.js";
export {
  type ArchitectureFitnessRules,
  generateFitnessRules,
} from "./engine/fitness-rules-generator.js";
export {
  type RefactoringScaffold,
  synthesizeRefactoring,
} from "./engine/refactoring-synthesizer.js";
export { createServer } from "./mcp/server.js";
export { SERVER_NAME, SERVER_VERSION } from "./version.js";
