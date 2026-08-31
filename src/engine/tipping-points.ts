import type { RejectionMatrixEntry, RejectionQualification } from "../domain/decision.js";
import type { Pattern } from "../domain/pattern.js";

export interface PatternTippingPoint {
  readonly tippingPoint: string;
  readonly directBaseline: string;
  readonly defaultQualification: RejectionQualification;
}

const TIPPING_POINTS: Readonly<Record<string, PatternTippingPoint>> = {
  cqrs: {
    tippingPoint:
      "> 5,000 writes/sec or read-to-write ratio > 100:1 with distinct asymmetric query models",
    directBaseline: "Relational tables with indexed views and direct SQL query projections",
    defaultQualification: "overkill",
  },
  "event-sourcing": {
    tippingPoint:
      "Strict regulatory audit requirement for point-in-time reconstruction or > 1,000 domain events/sec requiring deterministic replay",
    directBaseline: "State-based relational persistence with an append-only audit log table",
    defaultQualification: "overkill",
  },
  "modular-monolith": {
    tippingPoint:
      "> 15 engineers across 3 squads with independent deployment cadences and decoupled bounded contexts",
    directBaseline:
      "Single modular monolith codebase with package-private boundaries and compile-time contract enforcement",
    defaultQualification: "premature",
  },
  "space-based-architecture": {
    tippingPoint:
      "> 100,000 writes/sec peak in-memory transactional throughput exceeding relational DB scaling limits",
    directBaseline: "Relational database with read replicas and standard Cache-Aside caching",
    defaultQualification: "overkill",
  },
  "cell-based-architecture": {
    tippingPoint:
      "> 1,000,000 active tenants requiring physical blast-radius containment and isolated failure domains",
    directBaseline:
      "Multi-tenant deployment with logical tenant partitioning (row-level security or tenant IDs)",
    defaultQualification: "overkill",
  },
  sharding: {
    tippingPoint:
      "> 5 TB database storage or > 10,000 writes/sec exceeding single-node vertical scaling limits",
    directBaseline: "Vertical database scaling (larger instance size) and read replicas",
    defaultQualification: "premature",
  },
  "event-driven-architecture": {
    tippingPoint:
      "> 3 independent downstream consumers reacting asynchronously to domain facts across distinct lifecycles",
    directBaseline:
      "Synchronous domain service invocation or in-process pub/sub within a modular monolith",
    defaultQualification: "premature",
  },
  saga: {
    tippingPoint:
      "Multi-service workflow spanning >= 3 distributed databases where distributed ACID transactions are physically impossible",
    directBaseline: "Single-database local ACID transaction (BEGIN/COMMIT) inside a single service",
    defaultQualification: "unnecessary",
  },
  singleton: {
    tippingPoint:
      "Stateless pure constants or hardware device drivers with strict single physical controller requirements",
    directBaseline:
      "Dependency injection or explicit Composition Root passing instances via constructor",
    defaultQualification: "contraindicated",
  },
  "transactional-outbox": {
    tippingPoint:
      "Dual-write scenarios where message broker publication must guarantee at-least-once atomicity with database commits",
    directBaseline: "Single database transaction updating domain tables synchronously",
    defaultQualification: "unnecessary",
  },
  singleflight: {
    tippingPoint:
      "> 500 concurrent cache misses/sec on the same hot key causing downstream database connection exhaustion",
    directBaseline: "Standard Cache-Aside pattern without in-flight request deduplication mutexes",
    defaultQualification: "unnecessary",
  },
  "cache-aside-stampede-lock": {
    tippingPoint:
      "> 500 concurrent cache misses/sec on the same hot key causing cache stampede latency spikes",
    directBaseline: "Standard Cache-Aside pattern with probabilistic early expiration",
    defaultQualification: "unnecessary",
  },
  "semantic-cache": {
    tippingPoint:
      "> 50,000 natural language queries/day with >= 30% semantic duplication and cosine similarity threshold >= 0.88",
    directBaseline: "Exact-match key-value cache (Cache-Aside) using normalized prompt hashes",
    defaultQualification: "overkill",
  },
  "model-router": {
    tippingPoint:
      "> 10,000 prompt classifications/day with > 5x cost differential between fast and frontier reasoning models",
    directBaseline:
      "Static single-model configuration or deterministic static prompt-to-model mapping",
    defaultQualification: "overkill",
  },
  "tool-circuit-breaker": {
    tippingPoint:
      "> 5% flaky or failing external agent tool calls causing cascading task loop failures",
    directBaseline: "Standard distributed circuit breaker with simple retry and timeout policies",
    defaultQualification: "unnecessary",
  },
  "optimistic-concurrency-control": {
    tippingPoint:
      "> 5% concurrent write collision rate on shared entity records under multi-user updates",
    directBaseline: "Last-write-wins or database row-level locking",
    defaultQualification: "unnecessary",
  },
  "token-bucket-rate-limiter": {
    tippingPoint:
      "> 1,000 req/sec burst traffic requiring sub-millisecond sliding window admission",
    directBaseline: "Standard fixed-window rate limiting or reverse-proxy throttling",
    defaultQualification: "unnecessary",
  },
};

export function getQuantitativeTippingPoint(pattern: Pattern): string {
  const known = TIPPING_POINTS[pattern.id];
  return (
    known?.tippingPoint ??
    `Measured requirement where ${pattern.problem} produces validated bottlenecks exceeding adoption overhead.`
  );
}

export function getDirectBaseline(pattern: Pattern): string {
  const known = TIPPING_POINTS[pattern.id];
  return known?.directBaseline ?? pattern.simplerAlternative;
}

export function getRejectionQualification(
  pattern: Pattern,
  score: number,
  contradictionPenalty: number,
  teamSize?: number,
  query?: string,
): RejectionQualification {
  if (query && /2pc|two-phase/i.test(query)) return "contraindicated";
  if (pattern.id === "singleton") return "contraindicated";
  if (
    teamSize !== undefined &&
    teamSize <= 5 &&
    (pattern.adoptionCost === "high" || pattern.layer === "architecture")
  ) {
    return "premature";
  }
  const known = TIPPING_POINTS[pattern.id];
  if (known) return known.defaultQualification;
  if (contradictionPenalty >= 8) return "contraindicated";
  if (score < 12 && pattern.adoptionCost === "high") return "overkill";
  if (score < 24) return "premature";
  return "unnecessary";
}

export function buildRejectionMatrixEntry(
  pattern: Pattern,
  score: number,
  contradictionPenalty: number,
  reasons: readonly string[],
  teamSize?: number,
): RejectionMatrixEntry {
  return {
    pattern: pattern.name,
    qualification: getRejectionQualification(pattern, score, contradictionPenalty, teamSize),
    reason: reasons[0] ?? pattern.misuse,
    directBaseline: getDirectBaseline(pattern),
    tippingPoint: getQuantitativeTippingPoint(pattern),
  };
}

export function formatRejectionMatrixMarkdown(
  entries: readonly RejectionMatrixEntry[],
): readonly string[] {
  if (entries.length === 0) return [];
  return [
    "#### Anti-Pattern Rejection Matrix",
    "",
    "| Pattern | Qualification | Rejection Reason | Direct Baseline | Revisit Tipping Point |",
    "| :--- | :--- | :--- | :--- | :--- |",
    ...entries.map(
      (e) =>
        `| ${e.pattern} | ${e.qualification.toUpperCase()} | ${e.reason} | ${e.directBaseline} | ${e.tippingPoint} |`,
    ),
    "",
  ];
}

export function formatTippingPointsMarkdown(
  entries: readonly RejectionMatrixEntry[],
): readonly string[] {
  if (entries.length === 0) return [];
  return [
    "#### Revisit & Tipping Point Criteria",
    ...entries.map((e) => `- **Revisit ${e.pattern} When**: ${e.tippingPoint}`),
    "",
  ];
}
