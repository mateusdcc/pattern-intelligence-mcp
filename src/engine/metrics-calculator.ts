import type { CodeQualityMetrics, MetricComparison } from "../domain/code-quality.js";
import type { ParsedClass, ParsedExport, ParsedFunction, ParsedImport } from "./code-ast.js";

export function calculateCyclomaticComplexity(code: string): number {
  let count = 1;
  const stripped = code
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/`([^`\\]|\\.)*`/g, "``");
  const branches = stripped.match(/\b(if|for|while|case|catch)\b/g);
  if (branches) count += branches.length;
  const logicalOps = stripped.match(/(&&|\|\||\?\?)/g);
  if (logicalOps) count += logicalOps.length;
  const ternaries = stripped.match(/(?<!\?)\?(?!\.|\?|:)/g);
  if (ternaries) count += ternaries.length;
  return count;
}

function buildClassAdjacency(methods: readonly ParsedFunction[]): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();
  for (const m of methods) adj.set(m.name, new Set());
  for (let i = 0; i < methods.length; i++) {
    const m1 = methods[i];
    if (!m1) continue;
    for (let j = i + 1; j < methods.length; j++) {
      const m2 = methods[j];
      if (!m2) continue;
      const shared = m1.fieldAccesses.some((f) => m2.fieldAccesses.includes(f));
      const calls = m1.methodCalls.includes(m2.name) || m2.methodCalls.includes(m1.name);
      if (shared || calls) {
        adj.get(m1.name)?.add(m2.name);
        adj.get(m2.name)?.add(m1.name);
      }
    }
  }
  return adj;
}

function countConnectedComponents(adj: Map<string, Set<string>>): number {
  const visited = new Set<string>();
  let count = 0;
  for (const node of adj.keys()) {
    if (visited.has(node)) continue;
    count++;
    const queue = [node];
    visited.add(node);
    while (queue.length > 0) {
      const curr = queue.shift();
      if (!curr) continue;
      for (const neighbor of adj.get(curr) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
  }
  return Math.max(1, count);
}

export function calculateLCOM4ForClass(cls: ParsedClass): number {
  if (cls.methods.length <= 1) return 1;
  const adj = buildClassAdjacency(cls.methods);
  return countConnectedComponents(adj);
}

export function calculateLCOM4(classes: readonly ParsedClass[]): number {
  if (classes.length === 0) return 1;
  return Math.max(...classes.map(calculateLCOM4ForClass));
}

export function calculateCohesionScore(lcom4: number): number {
  if (lcom4 <= 1) return 100;
  if (lcom4 === 2) return 60;
  if (lcom4 === 3) return 40;
  return 20;
}

export function calculateCoupling(
  imports: readonly ParsedImport[],
  exports: readonly ParsedExport[],
): {
  readonly afferentCoupling: number;
  readonly efferentCoupling: number;
  readonly instabilityIndex: number;
  readonly couplingScore: number;
} {
  const uniqueModules = new Set(imports.map((i) => i.moduleSpecifier));
  const efferentCoupling = uniqueModules.size;
  const afferentCoupling = exports.length;
  const total = afferentCoupling + efferentCoupling;
  const instabilityIndex = total === 0 ? 0 : Number((efferentCoupling / total).toFixed(2));
  const couplingScore = Math.min(
    100,
    Math.round(instabilityIndex * 60 + Math.min(40, efferentCoupling * 8)),
  );
  return { afferentCoupling, efferentCoupling, instabilityIndex, couplingScore };
}

export function calculateMaintainabilityIndex(
  lines: number,
  complexity: number,
  smellsCount: number,
  instability = 0,
): number {
  const penalty = complexity * 1.5 + Math.min(40, lines / 8) + smellsCount * 12 + instability * 10;
  return Math.max(0, Math.min(100, Math.round(100 - penalty)));
}

export function projectCleanMetrics(before: CodeQualityMetrics): MetricComparison {
  const projectedCe = Math.min(2, before.efferentCoupling);
  const projectedCa = Math.max(1, before.afferentCoupling);
  const projectedInstability = Number((projectedCe / (projectedCa + projectedCe)).toFixed(2));
  const projectedAfter: CodeQualityMetrics = {
    estimatedLines: Math.max(15, Math.round(before.estimatedLines * 0.75)),
    cyclomaticComplexity: Math.min(4, Math.max(1, Math.round(before.cyclomaticComplexity / 4))),
    couplingScore: Math.min(20, Math.round(before.couplingScore * 0.3)),
    cohesionScore: 100,
    maintainabilityIndex: Math.max(85, Math.min(98, before.maintainabilityIndex + 35)),
    afferentCoupling: projectedCa,
    efferentCoupling: projectedCe,
    instabilityIndex: projectedInstability,
    lcom4Score: 1,
  };
  const diff = projectedAfter.maintainabilityIndex - before.maintainabilityIndex;
  const improvementPercentage = Math.max(
    0,
    Math.round((diff / Math.max(1, 100 - before.maintainabilityIndex)) * 100),
  );
  return { before, projectedAfter, improvementPercentage };
}
