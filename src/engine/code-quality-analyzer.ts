import type {
  CodeQualityMetrics,
  CodeQualityReport,
  DetectedSmell,
} from "../domain/code-quality.js";

function countBranches(code: string): number {
  const branchPattern = /\b(if|else if|switch|case|for|while|catch|&&|\|\||\?)\b/g;
  return (code.match(branchPattern) ?? []).length + 1;
}

function calculateMaintainability(lines: number, complexity: number, smells: number): number {
  const raw = 100 - (complexity * 1.5 + Math.min(50, lines / 10) + smells * 10);
  return Math.max(0, Math.min(100, Math.round(raw)));
}

function checkGodClass(_code: string, lines: number, complexity: number): DetectedSmell | null {
  if (lines < 200 && complexity < 25) return null;
  return {
    kind: "god-class",
    severity: "high",
    title: "God Class / Monolithic Responsibility",
    description: "Component aggregates multiple disparate domains or orchestration tasks.",
    evidence: `File has ${lines} lines and cyclomatic complexity ~${complexity}.`,
    suggestedPatterns: ["Facade", "Strategy", "Pipeline", "Command"],
    simplerAlternative: "Extract cohesive helper functions before adding classes.",
  };
}

function checkDualWrite(code: string): DetectedSmell | null {
  const hasDb = /\b(db|database|repository|sql|save|commit)\b/i.test(code);
  const hasPub = /\b(kafka|publish|emit|event|rabbit|sqs|queue)\b/i.test(code);
  if (!hasDb || !hasPub) return null;
  return {
    kind: "dual-write-hazard",
    severity: "critical",
    title: "Dual-Write Consistency Hazard",
    description:
      "Direct DB transaction followed by message broker publish risks data loss on failure.",
    evidence:
      "Detected co-occurring DB persist and message publishing without transactional boundary.",
    suggestedPatterns: ["Transactional Outbox", "Change Data Capture", "Idempotent Receiver"],
    simplerAlternative: "Sync RPC or single datastore transaction if async eventing is unneeded.",
  };
}

function checkMissingTimeout(code: string): DetectedSmell | null {
  const hasFetch = /\b(fetch|axios|http|request|grpc|client\.)\b/i.test(code);
  const hasTimeout = /\b(timeout|abortsignal|deadline|cancel)\b/i.test(code);
  if (!hasFetch || hasTimeout) return null;
  return {
    kind: "missing-timeout",
    severity: "high",
    title: "Unbounded Remote Call (Missing Timeout)",
    description: "External network calls lack explicit timeouts or cancellation tokens.",
    evidence: "Network invocation detected without timeout or AbortController.",
    suggestedPatterns: ["Timeout", "Circuit Breaker", "Bulkhead"],
    simplerAlternative: "Pass AbortSignal.timeout(ms) directly into fetch options.",
  };
}

function checkLeakyAbstraction(code: string): DetectedSmell | null {
  const hasVendorModels =
    /\b(fedex|ups|dhl|stripe|paypal|aws|twilio)\w*(request|response|payload|model)/i.test(code);
  if (!hasVendorModels) return null;
  return {
    kind: "leaky-abstraction",
    severity: "medium",
    title: "Leaky Vendor Types in Core Domain",
    description: "Third-party vendor data contracts bleed into internal business logic.",
    evidence: "Vendor-specific payload models referenced in application/domain code.",
    suggestedPatterns: ["Adapter", "Anti-Corruption Layer"],
    simplerAlternative: "Map vendor payload to an internal domain interface at the boundary.",
  };
}

function checkConcurrency(code: string): DetectedSmell | null {
  const hasMutation = /\b(update|save|write|counter|increment|balance|balance\s*=)\b/i.test(code);
  const hasVersionOrLock = /\b(version|lock|etag|mutex|atomic|serializable)\b/i.test(code);
  if (!hasMutation || hasVersionOrLock) return null;
  return {
    kind: "missing-concurrency-control",
    severity: "medium",
    title: "Missing Concurrency Control / Lost Update Risk",
    description: "Mutable shared state modified without optimistic versioning or locking.",
    evidence: "State update detected without version check or lock guard.",
    suggestedPatterns: ["Optimistic Concurrency Control", "Mutex"],
    simplerAlternative: "Use atomic DB increments (e.g. UPDATE ... SET balance = balance + 1).",
  };
}

export function analyzeCodeQuality(
  sourceCode: string,
  fileName = "component.ts",
): CodeQualityReport {
  const lines = sourceCode.split("\n").length;
  const complexity = countBranches(sourceCode);
  const smells: DetectedSmell[] = [];

  const detectors = [
    checkGodClass,
    checkDualWrite,
    checkMissingTimeout,
    checkLeakyAbstraction,
    checkConcurrency,
  ];
  for (const detector of detectors) {
    const result = detector(sourceCode, lines, complexity);
    if (result) smells.push(result);
  }

  const metrics: CodeQualityMetrics = {
    estimatedLines: lines,
    cyclomaticComplexity: complexity,
    couplingScore:
      smells.filter((s) => s.kind === "leaky-abstraction" || s.kind === "god-class").length * 25,
    cohesionScore: Math.max(10, 100 - complexity * 2),
    maintainabilityIndex: calculateMaintainability(lines, complexity, smells.length),
  };

  const detectedForces = smells.map((s) => s.title);
  const problemStatement =
    smells.length > 0
      ? `Codebase ${fileName} exhibits ${smells.length} architectural smell(s): ${smells.map((s) => s.title).join("; ")}.`
      : `Codebase ${fileName} is clean with cyclomatic complexity ${complexity} and no major architectural smells.`;

  const recommendedAction = smells.some((s) => s.severity === "critical" || s.severity === "high")
    ? "refactor-with-patterns"
    : smells.length > 0
      ? "keep-direct-solution"
      : "gather-metrics";

  return {
    metrics,
    smells,
    problemStatement,
    detectedForces,
    recommendedAction,
  };
}
