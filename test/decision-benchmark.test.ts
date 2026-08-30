import { describe, expect, it } from "vitest";

import { PatternIntelligence } from "../src/application/pattern-intelligence.js";
import type { DesignCaseInput } from "../src/domain/design-case.js";

interface BenchmarkCase {
  readonly name: string;
  readonly input: DesignCaseInput;
  readonly acceptable: readonly string[];
}

const CASES: readonly BenchmarkCase[] = [
  {
    name: "incompatible carrier boundary",
    input: {
      problem:
        "Three third-party carrier APIs expose incompatible interfaces and leak vendor models inward.",
      evidence: ["provider types appear in 19 domain files"],
    },
    acceptable: ["adapter", "anti-corruption-layer"],
  },
  {
    name: "staged configuration",
    input: {
      problem:
        "Construction has ordered stages, many optional fields, and invalid cross-field configurations.",
      evidence: ["configuration validation caused eight production defects"],
    },
    acceptable: ["builder"],
  },
  {
    name: "historical audit source",
    input: {
      problem:
        "Regulation requires complete audit history, point-in-time reconstruction, and deterministic event replay.",
      complexityBudget: "substantial",
      team: { operationsCapacity: "dedicated", experience: "experienced" },
      evidence: ["auditors request temporal state weekly"],
    },
    acceptable: ["event-sourcing"],
  },
  {
    name: "database and broker dual write",
    input: {
      problem:
        "A database update succeeds but publishing after commit sometimes loses the event in a dual write.",
      delivery: "at-least-once",
      evidence: ["43 missing events after broker outages"],
    },
    acceptable: ["transactional-outbox"],
  },
  {
    name: "multi-service compensation",
    input: {
      problem:
        "A long-running distributed transaction spans services and needs compensating actions after partial failure.",
      consistency: "eventual",
      complexityBudget: "substantial",
      evidence: ["partial checkout completion affects 0.4% of orders"],
    },
    acceptable: ["saga"],
  },
  {
    name: "unreliable dependency",
    input: {
      problem:
        "A downstream provider is slow or unavailable and transient failures cascade through request threads.",
      failureModes: ["remote timeout", "provider outage"],
      evidence: ["p99 latency reaches 19 seconds during outages"],
    },
    acceptable: ["timeout", "circuit-breaker", "bulkhead", "retry-with-backoff-and-jitter"],
  },
  {
    name: "capacity pressure",
    input: {
      problem:
        "Traffic spikes exceed capacity, the queue keeps growing, and the service needs explicit backpressure.",
      scale: { throughput: "extreme" },
      evidence: ["queue depth grows from 100 to 90000 at peak"],
    },
    acceptable: ["rate-limiter", "bulkhead", "semaphore", "producer-consumer"],
  },
  {
    name: "lost concurrent updates",
    input: {
      problem:
        "Concurrent writes cause lost updates and version conflicts on the same shared resource.",
      statefulness: "stateful",
      evidence: ["28 lost updates reproduced under concurrency"],
    },
    acceptable: ["optimistic-concurrency-control", "mutex"],
  },
  {
    name: "legacy behavior safety net",
    input: {
      problem:
        "We must refactor unfamiliar legacy code safely but its existing behavior is undocumented and hard to test.",
      riskTolerance: "low",
      evidence: ["no tests cover the billing module"],
    },
    acceptable: ["characterization-test", "approval-testing", "humble-object"],
  },
  {
    name: "consumer provider drift",
    input: {
      problem:
        "Consumer and provider APIs drift independently and integration schema compatibility breaks at deploy time.",
      evidence: ["six incompatible provider releases this year"],
    },
    acceptable: ["contract-test", "adapter", "anti-corruption-layer"],
  },
  {
    name: "recursive syntax tree",
    input: {
      problem:
        "An abstract syntax tree has recursive nodes and many operations that traverse the hierarchy.",
      changeAxes: ["tree operations"],
      evidence: ["twelve operations traverse the same node hierarchy"],
    },
    acceptable: ["composite", "visitor", "interpreter"],
  },
  {
    name: "tenant failure isolation",
    input: {
      problem:
        "Noisy neighbors require tenant isolation, a smaller blast radius, and partitioning by customer.",
      scale: { tenancy: "highly-isolated", dataVolume: "massive" },
      complexityBudget: "substantial",
      evidence: ["one tenant exhausted a shared regional cluster"],
    },
    acceptable: ["cell-based-architecture", "sharding", "bulkhead"],
  },
  {
    name: "asymmetric read workload",
    input: {
      problem:
        "Reads are heavy and need a different query model, denormalized views, and independent read scaling.",
      scale: { throughput: "high", dataVolume: "large" },
      evidence: ["reads outnumber writes 700 to 1"],
    },
    acceptable: ["cqrs", "materialized-view"],
  },
  {
    name: "behavior-rich business core",
    input: {
      problem:
        "Complex business rules, domain invariants, identity, and aggregate boundaries evolve together.",
      evidence: ["most defects violate cross-entity business invariants"],
    },
    acceptable: ["domain-model", "aggregate", "value-object"],
  },
  {
    name: "ordered processing stages",
    input: {
      problem:
        "Data moves through ordered replaceable filters in a processing pipeline and each stage transforms it.",
      changeAxes: ["pipeline stages"],
      evidence: ["new stages are added monthly"],
    },
    acceptable: ["pipes-and-filters", "chain-of-responsibility"],
  },
] as const;

describe("decision benchmark", () => {
  const intelligence = new PatternIntelligence();

  for (const benchmark of CASES) {
    it(`finds a plausible candidate for ${benchmark.name}`, () => {
      const result = intelligence.analyze(benchmark.input, 6);
      const candidates = result.patterns.map((assessment) => assessment.pattern.id);

      expect(
        candidates.some((candidate) => benchmark.acceptable.includes(candidate)),
        `Expected one of ${benchmark.acceptable.join(", ")}; received ${candidates.join(", ")}`,
      ).toBe(true);
    });
  }
});
