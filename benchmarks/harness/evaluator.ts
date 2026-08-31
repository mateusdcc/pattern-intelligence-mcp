export interface ScenarioOracle {
  readonly expectedRecommendation?: string;
  readonly targetPatterns: readonly string[];
  readonly contraindicatedPatterns: readonly string[];
  readonly keyForces?: readonly string[];
}

export interface Scenario {
  readonly id: string;
  readonly category: string;
  readonly title: string;
  readonly problem: string;
  readonly context?: Record<string, unknown>;
  readonly prompt: string;
  readonly oracle: ScenarioOracle;
}

export interface EvaluationScore {
  readonly decisionSoundness: number; // 0-100
  readonly antiCargoCult: number; // 0-100
  readonly maintainabilityQuality: number; // 0-100
  readonly evidenceReversibility: number; // 0-100
  readonly overall: number; // 0-100
  readonly matchedTargetPatterns: string[];
  readonly flaggedContraindicatedPatterns: string[];
  readonly matchedForces: string[];
  readonly detectedRollback: boolean;
  readonly detectedMeasurements: boolean;
  readonly directSolutionCorrectlyIdentified: boolean;
}

export interface TokenUsage {
  readonly input: number;
  readonly output: number;
  readonly cacheRead: number;
  readonly totalTokens: number;
}

export interface RunResult {
  readonly scenarioId: string;
  readonly scenarioTitle: string;
  readonly category: string;
  readonly mode: "harness-without-mcp" | "harness-with-mcp";
  readonly output: string;
  readonly durationMs: number;
  readonly toolsUsed: string[];
  readonly usage: TokenUsage;
  readonly evaluation: EvaluationScore;
}

export function evaluateOutput(output: string, oracle: ScenarioOracle): EvaluationScore {
  const normalized = output.toLowerCase();

  // 1. Target Pattern Matching
  const matchedTargetPatterns: string[] = [];
  for (const target of oracle.targetPatterns) {
    const escaped = target.toLowerCase().replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "i");
    if (regex.test(normalized) || normalized.includes(target.toLowerCase())) {
      matchedTargetPatterns.push(target);
    }
  }

  // 2. Contraindicated Anti-Pattern Detection with robust avoidance detection
  const flaggedContraindicatedPatterns: string[] = [];
  const rejectionVerbs =
    "avoid|reject|unnecessary|not recommend|overkill|anti-pattern|simpler alternative|contraindicated|excessive|premature|unjustified|do not adopt|do not use|not needed|inappropriate|not warranted|not suitable|skip|penaliz|disadvantage|downside|overhead|without|instead of|rather than|never use|no need for|eliminat";

  for (const contraindicated of oracle.contraindicatedPatterns) {
    const escaped = contraindicated.toLowerCase().replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "i");
    if (regex.test(normalized) || normalized.includes(contraindicated.toLowerCase())) {
      // Check if it was mentioned in an avoidance / rejection context
      const avoidanceBefore = new RegExp(`(${rejectionVerbs})[^.\\n]{0,100}\\b${escaped}`, "i");
      const avoidanceAfter = new RegExp(
        `\\b${escaped}\\b[^.\\n]{0,100}(is|are|as|would be|was)?\\s*(${rejectionVerbs})`,
        "i",
      );
      if (!avoidanceBefore.test(normalized) && !avoidanceAfter.test(normalized)) {
        flaggedContraindicatedPatterns.push(contraindicated);
      }
    }
  }

  // 3. Key Forces Matching
  const matchedForces: string[] = [];
  if (oracle.keyForces) {
    for (const force of oracle.keyForces) {
      const words = force
        .toLowerCase()
        .split(" ")
        .filter((w) => w.length > 3);
      const matchedWords = words.filter((w) => normalized.includes(w));
      if (matchedWords.length >= Math.ceil(words.length * 0.45)) {
        matchedForces.push(force);
      }
    }
  }

  // 4. Evidence & Reversibility indicators
  const rollbackKeywords = [
    "rollback",
    "revert",
    "deletion trigger",
    "exit criteria",
    "fallback",
    "feature flag",
    "strangler",
    "seam",
    "reversib",
    "phase",
    "migration plan",
    "step-by-step",
  ];
  const detectedRollback = rollbackKeywords.some((kw) => normalized.includes(kw));

  const measurementKeywords = [
    "metric",
    "measure",
    "latency",
    "p99",
    "throughput",
    "falsif",
    "hypothesis",
    "experiment",
    "sla",
    "slo",
    "benchmark",
    "test",
    "assert",
    "coverage",
  ];
  const detectedMeasurements = measurementKeywords.some((kw) => normalized.includes(kw));

  // 5. Anti-Cargo-Cult direct solution check
  const directKeywords = [
    "direct solution",
    "keep it simple",
    "unnecessary",
    "over-engineering",
    "monolith",
    "modular monolith",
    "premature",
    "no pattern needed",
    "prefer-direct-solution",
    "crud",
    "simple",
    "simple postgresql",
    "relational database",
  ];
  const mentionsDirect = directKeywords.some((kw) => normalized.includes(kw));
  const isDirectExpected = oracle.expectedRecommendation === "prefer-direct-solution";
  const directSolutionCorrectlyIdentified = isDirectExpected ? mentionsDirect : true;

  // Compute Scores (0-100)
  // A. Decision Soundness
  const targetRatio =
    oracle.targetPatterns.length > 0
      ? matchedTargetPatterns.length / oracle.targetPatterns.length
      : 1;
  let soundnessScore = Math.min(
    100,
    Math.round(targetRatio * 75 + (matchedForces.length > 0 ? 25 : 0)),
  );
  if (isDirectExpected) {
    soundnessScore = mentionsDirect ? 100 : 35;
  }

  // B. Anti-Cargo-Cult Resistance
  let cargoCultScore = 100;
  if (flaggedContraindicatedPatterns.length > 0) {
    cargoCultScore = Math.max(0, 100 - flaggedContraindicatedPatterns.length * 35);
  }
  if (isDirectExpected && !mentionsDirect) {
    cargoCultScore = 25;
  }

  // C. Maintainability & Code Quality Projection
  let maintainabilityScore = 50;
  if (
    normalized.includes("coupling") ||
    normalized.includes("cohesion") ||
    normalized.includes("single responsibility")
  ) {
    maintainabilityScore += 20;
  }
  if (
    normalized.includes("boundary") ||
    normalized.includes("interface") ||
    normalized.includes("insulat") ||
    normalized.includes("port") ||
    normalized.includes("adapter")
  ) {
    maintainabilityScore += 15;
  }
  if (
    normalized.includes("test") ||
    normalized.includes("contract") ||
    normalized.includes("seam") ||
    normalized.includes("verification")
  ) {
    maintainabilityScore += 15;
  }
  maintainabilityScore = Math.min(100, maintainabilityScore);

  // D. Evidence & Reversibility Score
  let evidenceScore = 30;
  if (detectedRollback) evidenceScore += 35;
  if (detectedMeasurements) evidenceScore += 35;
  evidenceScore = Math.min(100, evidenceScore);

  // Overall Score (Weighted Average)
  const overall = Math.round(
    soundnessScore * 0.35 +
      cargoCultScore * 0.25 +
      maintainabilityScore * 0.2 +
      evidenceScore * 0.2,
  );

  return {
    decisionSoundness: soundnessScore,
    antiCargoCult: cargoCultScore,
    maintainabilityQuality: maintainabilityScore,
    evidenceReversibility: evidenceScore,
    overall,
    matchedTargetPatterns,
    flaggedContraindicatedPatterns,
    matchedForces,
    detectedRollback,
    detectedMeasurements,
    directSolutionCorrectlyIdentified,
  };
}
