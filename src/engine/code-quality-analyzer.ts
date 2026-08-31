import type {
  CodeQualityMetrics,
  CodeQualityReport,
  DetectedSmell,
} from "../domain/code-quality.js";
import {
  detectConcurrencySmell,
  detectDualWriteSmells,
  detectGodClassSmell,
  detectLeakyAbstractionSmell,
  detectMissingTimeoutSmells,
  detectTightCouplingSmell,
} from "./ast-smell-detectors.js";
import { parseSourceModule } from "./code-ast.js";
import {
  calculateCohesionScore,
  calculateCoupling,
  calculateCyclomaticComplexity,
  calculateLCOM4,
  calculateMaintainabilityIndex,
} from "./metrics-calculator.js";

function collectSmells(
  sourceCode: string,
  parsed: ReturnType<typeof parseSourceModule>,
  complexity: number,
  lcom4Score: number,
  coupling: ReturnType<typeof calculateCoupling>,
): readonly DetectedSmell[] {
  const smells: DetectedSmell[] = [
    ...detectDualWriteSmells(parsed.functions, parsed.allCalls),
    ...detectMissingTimeoutSmells(parsed.allCalls),
  ];
  const godClass = detectGodClassSmell(
    parsed.rawLines,
    complexity,
    lcom4Score,
    coupling.efferentCoupling,
  );
  if (godClass) smells.push(godClass);
  const leaky = detectLeakyAbstractionSmell(sourceCode, parsed.imports);
  if (leaky) smells.push(leaky);
  const concurrency = detectConcurrencySmell(sourceCode);
  if (concurrency) smells.push(concurrency);
  const tight = detectTightCouplingSmell(coupling.instabilityIndex, coupling.efferentCoupling);
  if (tight) smells.push(tight);
  return smells;
}

function determineAction(smells: readonly DetectedSmell[]): CodeQualityReport["recommendedAction"] {
  if (smells.some((s) => s.severity === "critical" || s.severity === "high")) {
    return "refactor-with-patterns";
  }
  return smells.length > 0 ? "keep-direct-solution" : "gather-metrics";
}

function buildProblemStatement(
  fileName: string,
  smells: readonly DetectedSmell[],
  cc: number,
): string {
  if (smells.length === 0) {
    return `Codebase ${fileName} is clean with cyclomatic complexity ${cc} and no major architectural smells.`;
  }
  return `Codebase ${fileName} exhibits ${smells.length} architectural smell(s): ${smells.map((s) => s.title).join("; ")}.`;
}

export function analyzeCodeQuality(
  sourceCode: string,
  fileName = "component.ts",
): CodeQualityReport {
  const parsed = parseSourceModule(sourceCode);
  const complexity = calculateCyclomaticComplexity(sourceCode);
  const lcom4Score = calculateLCOM4(parsed.classes);
  const cohesionScore = calculateCohesionScore(lcom4Score);
  const coupling = calculateCoupling(parsed.imports, parsed.exports);
  const smells = collectSmells(sourceCode, parsed, complexity, lcom4Score, coupling);

  const metrics: CodeQualityMetrics = {
    estimatedLines: parsed.rawLines,
    cyclomaticComplexity: complexity,
    couplingScore: coupling.couplingScore,
    cohesionScore,
    maintainabilityIndex: calculateMaintainabilityIndex(
      parsed.rawLines,
      complexity,
      smells.length,
      coupling.instabilityIndex,
    ),
    afferentCoupling: coupling.afferentCoupling,
    efferentCoupling: coupling.efferentCoupling,
    instabilityIndex: coupling.instabilityIndex,
    lcom4Score,
  };

  return {
    metrics,
    smells,
    problemStatement: buildProblemStatement(fileName, smells, complexity),
    detectedForces: smells.map((s) => s.title),
    recommendedAction: determineAction(smells),
  };
}
