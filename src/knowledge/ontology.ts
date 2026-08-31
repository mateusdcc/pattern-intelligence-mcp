import type { Pattern } from "../domain/pattern.js";

export interface ConceptRule {
  readonly id: string;
  readonly description: string;
  readonly signals: readonly string[];
  readonly boosts: Readonly<Record<string, number>>;
  readonly penalties?: Readonly<Record<string, number>>;
}

export const CONCEPT_RULES: readonly ConceptRule[] = [
  {
    id: "closed-state-space",
    description: "A finite set of states or variants must be made explicit and exhaustive.",
    signals: [
      "mutually exclusive state",
      "illegal state",
      "exhaustive",
      "finite states",
      "state machine",
      "workflow state",
    ],
    boosts: { "discriminated-union": 8, state: 7, visitor: 3, result: 2 },
  },
  {
    id: "behavior-variation",
    description: "One behavior changes independently while the surrounding flow remains stable.",
    signals: [
      "vary behavior",
      "multiple algorithms",
      "pricing rule",
      "policy changes",
      "select algorithm",
      "pluggable behavior",
    ],
    boosts: { strategy: 9, "higher-order-function": 7, "template-method": 3 },
  },
  {
    id: "incompatible-boundary",
    description: "External models or interfaces differ from the application's contract.",
    signals: [
      "incompatible api",
      "third-party provider",
      "vendor model",
      "legacy schema",
      "translate interface",
      "provider types",
    ],
    boosts: { adapter: 9, "anti-corruption-layer": 8, "message-translator": 6, bridge: 3 },
  },
  {
    id: "coherent-product-family",
    description: "Several collaborating products must vary together as a compatible family.",
    signals: [
      "product family",
      "provider-specific family",
      "compatible objects",
      "cloud provider",
      "theme family",
    ],
    boosts: { "abstract-factory": 9, bridge: 4, builder: 2 },
  },
  {
    id: "complex-construction",
    description:
      "Construction has ordered stages, cross-field invariants, or many meaningful choices.",
    signals: [
      "many optional fields",
      "construction stages",
      "invalid configuration",
      "fluent construction",
      "complex setup",
    ],
    boosts: { builder: 9, "factory-method": 3 },
  },
  {
    id: "global-mutable-state",
    description: "Hidden global state creates lifecycle, isolation, or concurrency defects.",
    signals: [
      "global mutable",
      "shared global",
      "test leakage",
      "hidden dependency",
      "single instance",
      "global registry",
    ],
    boosts: { "composition-root": 9, "dependency-injection": 8 },
    penalties: { singleton: 10, "service-layer": 2 },
  },
  {
    id: "simple-crud",
    description: "The domain is mostly straightforward request/validation/persistence flow.",
    signals: [
      "simple crud",
      "basic crud",
      "admin app",
      "thin domain",
      "straightforward workflow",
      "few business rules",
    ],
    boosts: { "transaction-script": 9, "active-record": 7, "layered-architecture": 5 },
    penalties: {
      cqrs: 9,
      "event-sourcing": 10,
      "event-driven-architecture": 7,
      "space-based-architecture": 8,
    },
  },
  {
    id: "rich-domain",
    description: "Business invariants, identity, and behavior are central and evolve together.",
    signals: [
      "complex business rules",
      "domain invariants",
      "rich domain",
      "business behavior",
      "aggregate boundary",
      "ubiquitous language",
    ],
    boosts: { "domain-model": 9, aggregate: 8, "value-object": 7, repository: 5, specification: 4 },
    penalties: { "transaction-script": 4, "active-record": 3 },
  },
  {
    id: "read-write-asymmetry",
    description: "Reads and writes have materially different models, loads, or scaling needs.",
    signals: [
      "read heavy",
      "different read model",
      "read write split",
      "query model",
      "denormalized view",
      "independent read scaling",
    ],
    boosts: { cqrs: 8, "materialized-view": 8, "data-transfer-object": 2 },
  },
  {
    id: "audit-replay",
    description:
      "The complete history is a business requirement and must support replay or temporal queries.",
    signals: [
      "complete audit history",
      "temporal query",
      "rebuild state",
      "event replay",
      "history is source",
      "point in time",
    ],
    boosts: { "event-sourcing": 10, "domain-event": 4, cqrs: 3 },
  },
  {
    id: "duplicate-delivery",
    description:
      "Messages or requests can be delivered more than once and effects must occur once.",
    signals: [
      "duplicate message",
      "duplicate charge",
      "at least once",
      "redelivery",
      "idempotency",
      "same request twice",
    ],
    boosts: { "idempotent-receiver": 10, "correlation-identifier": 4, "transactional-outbox": 3 },
  },
  {
    id: "dual-write",
    description: "A state change and emitted message must not diverge under partial failure.",
    signals: [
      "dual write",
      "database and message",
      "lost event",
      "publish after commit",
      "atomic message",
      "outbox",
    ],
    boosts: { "transactional-outbox": 10, "unit-of-work": 5, "idempotent-receiver": 3 },
  },
  {
    id: "remote-failure",
    description: "A remote dependency can be slow, unavailable, or intermittently failing.",
    signals: [
      "slow dependency",
      "remote timeout",
      "transient failure",
      "downstream unavailable",
      "connection reset",
      "provider outage",
    ],
    boosts: { timeout: 10, "circuit-breaker": 8, "retry-with-backoff-and-jitter": 6, bulkhead: 5 },
  },
  {
    id: "overload-pressure",
    description: "Demand can exceed capacity and needs an explicit admission or buffering policy.",
    signals: [
      "traffic spike",
      "overload",
      "backpressure",
      "queue growing",
      "capacity limit",
      "too many requests",
    ],
    boosts: {
      "rate-limiter": 9,
      bulkhead: 7,
      semaphore: 6,
      "producer-consumer": 5,
      "competing-consumers": 4,
    },
  },
  {
    id: "parallel-workers",
    description: "Independent workers should share queued work while controlling concurrency.",
    signals: [
      "worker pool",
      "parallel consumers",
      "scale workers",
      "queue workers",
      "work distribution",
    ],
    boosts: { "competing-consumers": 10, "producer-consumer": 7, semaphore: 4 },
  },
  {
    id: "distributed-transaction",
    description: "A business operation spans services without a safe global transaction.",
    signals: [
      "distributed transaction",
      "multi-service workflow",
      "compensating action",
      "partial business failure",
      "long running transaction",
    ],
    boosts: {
      saga: 10,
      "idempotent-receiver": 5,
      "transactional-outbox": 5,
      "eventual-consistency": 4,
    },
  },
  {
    id: "legacy-migration",
    description: "A legacy capability must be replaced incrementally without a big-bang cutover.",
    signals: [
      "legacy migration",
      "incremental replacement",
      "monolith extraction",
      "gradual cutover",
      "old system",
    ],
    boosts: { "strangler-fig": 10, "anti-corruption-layer": 8, facade: 4, adapter: 4 },
  },
  {
    id: "recursive-structure",
    description:
      "The problem is naturally a recursive tree with either varying nodes or varying operations.",
    signals: [
      "recursive tree",
      "abstract syntax tree",
      "nested policy",
      "tree traversal",
      "expression tree",
      "hierarchy of nodes",
    ],
    boosts: { composite: 9, visitor: 7, interpreter: 6, iterator: 3, "discriminated-union": 3 },
  },
  {
    id: "undo-snapshot",
    description: "Operations or state need undo, replay, queuing, or snapshots.",
    signals: [
      "undo",
      "redo",
      "command history",
      "snapshot state",
      "replay command",
      "rollback action",
    ],
    boosts: { command: 9, memento: 9, "event-sourcing": 3 },
  },
  {
    id: "event-fanout",
    description: "One fact should notify multiple independent consumers without direct coupling.",
    signals: [
      "multiple subscribers",
      "fan out event",
      "broadcast update",
      "independent consumers",
      "notify observers",
    ],
    boosts: {
      "publish-subscribe-channel": 9,
      "event-message": 8,
      observer: 7,
      "event-driven-architecture": 5,
    },
  },
  {
    id: "processing-pipeline",
    description: "Data passes through ordered, independently replaceable processing stages.",
    signals: [
      "processing pipeline",
      "ordered stages",
      "filters",
      "middleware chain",
      "transform stream",
      "pipeline step",
    ],
    boosts: {
      "pipes-and-filters": 9,
      "chain-of-responsibility": 7,
      decorator: 5,
      "higher-order-function": 4,
    },
  },
  {
    id: "concurrent-update",
    description: "Concurrent actors can overwrite or corrupt shared state.",
    signals: [
      "lost update",
      "version conflict",
      "concurrent write",
      "race condition",
      "compare and swap",
      "shared resource",
    ],
    boosts: { "optimistic-concurrency-control": 9, mutex: 8, semaphore: 3, lease: 3, actor: 3 },
  },
  {
    id: "tenant-isolation-scale",
    description: "Load and failures need partitioning by key, tenant, or cell.",
    signals: [
      "tenant isolation",
      "blast radius",
      "partition by customer",
      "horizontal partition",
      "regional cell",
      "noisy neighbor",
    ],
    boosts: {
      "cell-based-architecture": 10,
      sharding: 8,
      bulkhead: 6,
      "space-based-architecture": 4,
    },
  },
  {
    id: "legacy-test-safety",
    description:
      "Unfamiliar or side-effect-heavy code needs a behavioral safety net before change.",
    signals: [
      "legacy code",
      "unknown behavior",
      "refactor safely",
      "hard to test",
      "side effects",
      "existing behavior",
    ],
    boosts: {
      "characterization-test": 10,
      "humble-object": 7,
      "approval-testing": 6,
      "test-double": 4,
    },
  },
  {
    id: "boundary-compatibility",
    description: "A boundary must be verified against a consumer/provider contract.",
    signals: [
      "api compatibility",
      "consumer contract",
      "provider contract",
      "integration drift",
      "schema compatibility",
    ],
    boosts: {
      "contract-test": 10,
      adapter: 5,
      "anti-corruption-layer": 4,
      "data-transfer-object": 3,
    },
  },
  {
    id: "ai-model-routing",
    description:
      "Prompts with varying complexity, latency, and cost need dynamic dispatch to suitable LLMs.",
    signals: [
      "llm routing",
      "model router",
      "model cascade",
      "cost vs latency",
      "dynamic model dispatch",
      "prompt complexity",
    ],
    boosts: { "model-router": 10, strategy: 4, "semantic-cache": 3 },
  },
  {
    id: "agent-tool-fault-tolerance",
    description:
      "Unreliable or failing external tool executions must be isolated to prevent agent failure.",
    signals: [
      "agent tool failure",
      "tool execution fault",
      "tool circuit breaker",
      "flaky tool",
      "function calling failure",
    ],
    boosts: { "tool-circuit-breaker": 10, "circuit-breaker": 6, bulkhead: 4 },
  },
  {
    id: "semantic-similarity-caching",
    description:
      "Paraphrased or semantically equivalent natural language prompts should reuse cached LLM completions.",
    signals: [
      "semantic cache",
      "embedding cache",
      "vector cache",
      "prompt similarity",
      "paraphrased query",
      "cache llm response",
    ],
    boosts: { "semantic-cache": 10, "cache-aside": 5, "model-router": 3 },
  },
  {
    id: "cache-stampede-coalescing",
    description:
      "Concurrent requests for the same missing key or expensive computation must not duplicate downstream execution.",
    signals: [
      "thundering herd",
      "cache stampede",
      "duplicate in-flight",
      "request coalescing",
      "singleflight",
      "stampede lock",
    ],
    boosts: {
      singleflight: 9,
      "cache-aside-stampede-lock": 9,
      "cache-aside": 6,
      mutex: 4,
    },
  },
  {
    id: "bursty-traffic-shaping",
    description: "Traffic streams require bounded rate limiting with burst tolerance.",
    signals: [
      "token bucket",
      "bursty traffic",
      "rate limit burst",
      "traffic shaping",
      "refill rate",
    ],
    boosts: {
      "token-bucket-rate-limiter": 10,
      "rate-limiter": 7,
      semaphore: 4,
    },
  },
] as const;

export const RELATIONSHIP_TYPES = [
  "complements",
  "prerequisiteFor",
  "mitigatesLiabilityOf",
  "conflictsWith",
] as const;

export type PatternRelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export interface RelationshipCategory {
  readonly type: PatternRelationshipType;
  readonly name: string;
  readonly description: string;
}

export const RELATIONSHIP_CATEGORIES: readonly RelationshipCategory[] = [
  {
    type: "complements",
    name: "Complements",
    description: "Patterns that work synergistically when combined together.",
  },
  {
    type: "prerequisiteFor",
    name: "Prerequisite For",
    description: "Pattern that should or must be established before adopting the target pattern.",
  },
  {
    type: "mitigatesLiabilityOf",
    name: "Mitigates Liability Of",
    description:
      "Pattern that directly alleviates liabilities or failure modes introduced by the target pattern.",
  },
  {
    type: "conflictsWith",
    name: "Conflicts With",
    description:
      "Patterns that represent opposing architectural approaches or mutually exclusive mechanisms.",
  },
];

export function isRelationshipType(value: string): value is PatternRelationshipType {
  return (RELATIONSHIP_TYPES as readonly string[]).includes(value);
}

export function getRelationshipCategory(
  type: PatternRelationshipType,
): RelationshipCategory | undefined {
  return RELATIONSHIP_CATEGORIES.find((category) => category.type === type);
}

export function validatePatternRelationships(patterns: readonly Pattern[]): readonly string[] {
  const knownIds = new Set(patterns.map((p) => p.id));
  return patterns.flatMap((pattern) => validateSinglePattern(pattern, knownIds));
}

function validateSinglePattern(pattern: Pattern, knownIds: ReadonlySet<string>): readonly string[] {
  return RELATIONSHIP_TYPES.flatMap((relType) =>
    validateRelationTargets(pattern.id, relType, pattern[relType] ?? [], knownIds),
  );
}

function validateRelationTargets(
  id: string,
  type: PatternRelationshipType,
  targets: readonly string[],
  knownIds: ReadonlySet<string>,
): readonly string[] {
  const seen = new Set<string>();
  const errors: string[] = [];
  for (const target of targets) {
    if (!knownIds.has(target))
      errors.push(`Pattern '${id}' has ${type} targeting unknown pattern '${target}'.`);
    if (target === id) errors.push(`Pattern '${id}' cannot have ${type} targeting itself.`);
    if (seen.has(target)) errors.push(`Pattern '${id}' has duplicate ${type} link to '${target}'.`);
    seen.add(target);
  }
  return errors;
}

export function findPrerequisites(
  patterns: readonly Pattern[],
  targetId: string,
): readonly string[] {
  return patterns.filter((p) => (p.prerequisiteFor ?? []).includes(targetId)).map((p) => p.id);
}

export function findMitigatingPatterns(
  patterns: readonly Pattern[],
  targetId: string,
): readonly string[] {
  return patterns.filter((p) => (p.mitigatesLiabilityOf ?? []).includes(targetId)).map((p) => p.id);
}

export function findConflictingPatterns(
  patterns: readonly Pattern[],
  patternId: string,
): readonly string[] {
  const pattern = patterns.find((p) => p.id === patternId);
  const direct = pattern?.conflictsWith ?? [];
  const incoming = patterns
    .filter((p) => (p.conflictsWith ?? []).includes(patternId))
    .map((p) => p.id);
  return Array.from(new Set([...direct, ...incoming]));
}

export function findComplementaryPatterns(
  patterns: readonly Pattern[],
  patternId: string,
): readonly string[] {
  const pattern = patterns.find((p) => p.id === patternId);
  const direct = pattern?.complements ?? [];
  const incoming = patterns
    .filter((p) => (p.complements ?? []).includes(patternId))
    .map((p) => p.id);
  return Array.from(new Set([...direct, ...incoming]));
}

export function queryRelationships(
  patterns: readonly Pattern[],
  patternId: string,
  type: PatternRelationshipType,
): readonly string[] {
  if (type === "complements") return findComplementaryPatterns(patterns, patternId);
  if (type === "prerequisiteFor")
    return patterns.find((p) => p.id === patternId)?.prerequisiteFor ?? [];
  if (type === "mitigatesLiabilityOf")
    return patterns.find((p) => p.id === patternId)?.mitigatesLiabilityOf ?? [];
  return findConflictingPatterns(patterns, patternId);
}
