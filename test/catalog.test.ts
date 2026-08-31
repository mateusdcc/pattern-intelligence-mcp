import { describe, expect, it } from "vitest";

import type { Pattern } from "../src/domain/pattern.js";
import { loadCatalog } from "../src/knowledge/catalog-loader.js";
import {
  CONCEPT_RULES,
  findComplementaryPatterns,
  findConflictingPatterns,
  findMitigatingPatterns,
  findPrerequisites,
  getRelationshipCategory,
  isRelationshipType,
  queryRelationships,
  RELATIONSHIP_TYPES,
  validatePatternRelationships,
} from "../src/knowledge/ontology.js";
import { PatternStore } from "../src/knowledge/pattern-store.js";

describe("pattern catalog", () => {
  const catalog = loadCatalog();
  const store = new PatternStore(catalog);

  it("loads all 116 unique patterns", () => {
    expect(store.count()).toBe(116);
    expect(new Set(store.all().map((pattern) => pattern.id)).size).toBe(116);
  });

  it("resolves every internal relationship", () => {
    for (const pattern of store.all()) {
      for (const relatedId of pattern.related) {
        expect(store.get(relatedId), `${pattern.id} -> ${relatedId}`).toBeDefined();
      }
    }
  });

  it("keeps ontology weights within the catalog", () => {
    for (const rule of CONCEPT_RULES) {
      for (const patternId of Object.keys(rule.boosts)) {
        expect(store.get(patternId), `${rule.id} boosts ${patternId}`).toBeDefined();
      }
      for (const patternId of Object.keys(rule.penalties ?? {})) {
        expect(store.get(patternId), `${rule.id} penalizes ${patternId}`).toBeDefined();
      }
    }
  });

  it("supports layer and graph queries", () => {
    expect(store.byLayer("testing")).toHaveLength(8);
    expect(store.byLayer("ai-agent")).toHaveLength(3);
    expect(store.relatedTo("strategy").map((pattern) => pattern.id)).toContain(
      "higher-order-function",
    );
  });

  it("validates all typed graph relationships in catalog", () => {
    const errors = validatePatternRelationships(catalog.patterns);
    expect(errors).toHaveLength(0);
  });

  it("detects invalid targets, self-references, and duplicates in validation", () => {
    const mockPatterns = [
      {
        id: "p1",
        name: "Pattern 1",
        track: "t1",
        trackTitle: "Track 1",
        layer: "language",
        problem: "problem 1",
        exampleContext: "ctx 1",
        mechanism: "mech 1",
        simplerAlternative: "alt 1",
        misuse: "misuse 1",
        evidence: "evidence 1",
        typescript: "ts 1",
        related: [],
        relatedConcepts: [],
        complements: ["non-existent-pattern", "p1", "p2", "p2"],
        adoptionCost: "low",
        operationalCost: "low",
        level: "core",
        signals: [],
      },
      {
        id: "p2",
        name: "Pattern 2",
        track: "t1",
        trackTitle: "Track 1",
        layer: "language",
        problem: "problem 2",
        exampleContext: "ctx 2",
        mechanism: "mech 2",
        simplerAlternative: "alt 2",
        misuse: "misuse 2",
        evidence: "evidence 2",
        typescript: "ts 2",
        related: [],
        relatedConcepts: [],
        adoptionCost: "low",
        operationalCost: "low",
        level: "core",
        signals: [],
      },
    ] as unknown as readonly Pattern[];

    const errors = validatePatternRelationships(mockPatterns);
    expect(errors).toContain(
      "Pattern 'p1' has complements targeting unknown pattern 'non-existent-pattern'.",
    );
    expect(errors).toContain("Pattern 'p1' cannot have complements targeting itself.");
    expect(errors).toContain("Pattern 'p1' has duplicate complements link to 'p2'.");
  });

  it("exposes relationship categories and type predicates", () => {
    for (const relType of RELATIONSHIP_TYPES) {
      expect(isRelationshipType(relType)).toBe(true);
      const category = getRelationshipCategory(relType);
      expect(category).toBeDefined();
      expect(category?.type).toBe(relType);
      expect(category?.name.length).toBeGreaterThan(0);
      expect(category?.description.length).toBeGreaterThan(0);
    }
    expect(isRelationshipType("unknown-type")).toBe(false);
    expect(getRelationshipCategory("unknown-type" as never)).toBeUndefined();
  });

  it("queries complementary patterns", () => {
    const outboxComplements = store.complements("transactional-outbox").map((p) => p.id);
    expect(outboxComplements).toContain("idempotent-receiver");
    expect(outboxComplements).toContain("domain-event");
    expect(outboxComplements).toContain("eventual-consistency");

    const cbComplements = store.complements("circuit-breaker").map((p) => p.id);
    expect(cbComplements).toContain("retry-with-backoff-and-jitter");
    expect(cbComplements).toContain("bulkhead");
    expect(cbComplements).toContain("timeout");

    const cqrsComplements = store.complements("cqrs").map((p) => p.id);
    expect(cqrsComplements).toContain("event-sourcing");
    expect(cqrsComplements).toContain("materialized-view");
  });

  it("queries prerequisite patterns in both directions", () => {
    const outboxPrereqFor = store.prerequisiteFor("transactional-outbox").map((p) => p.id);
    expect(outboxPrereqFor).toContain("saga");
    expect(outboxPrereqFor).toContain("event-driven-architecture");

    const sagaPrereqs = store.prerequisitesOf("saga").map((p) => p.id);
    expect(sagaPrereqs).toContain("transactional-outbox");
    expect(sagaPrereqs).toContain("idempotent-receiver");

    const viewPrereqs = store.prerequisites("materialized-view").map((p) => p.id);
    expect(viewPrereqs).toContain("cqrs");
  });

  it("queries liability mitigation in both directions", () => {
    const cbMitigates = store.mitigatesLiabilityOf("circuit-breaker").map((p) => p.id);
    expect(cbMitigates).toContain("retry-with-backoff-and-jitter");

    const occMitigates = store
      .mitigatesLiabilityOf("optimistic-concurrency-control")
      .map((p) => p.id);
    expect(occMitigates).toContain("aggregate");

    const retryMitigatedBy = store
      .liabilitiesMitigatedBy("retry-with-backoff-and-jitter")
      .map((p) => p.id);
    expect(retryMitigatedBy).toContain("circuit-breaker");
    expect(retryMitigatedBy).toContain("idempotent-receiver");
  });

  it("queries conflicting patterns bidirectionally", () => {
    const cqrsConflicts = store.conflictsWith("cqrs").map((p) => p.id);
    expect(cqrsConflicts).toContain("active-record");
    expect(cqrsConflicts).toContain("transaction-script");

    const activeRecordConflicts = store.conflictsWith("active-record").map((p) => p.id);
    expect(activeRecordConflicts).toContain("cqrs");
    expect(activeRecordConflicts).toContain("ports-and-adapters");
    expect(activeRecordConflicts).toContain("domain-model");

    const occConflicts = store.conflictsWith("optimistic-concurrency-control").map((p) => p.id);
    expect(occConflicts).toContain("mutex");
    expect(occConflicts).toContain("reader-writer-lock");
  });

  it("queries neighbors by relationship type and relatedByType", () => {
    expect(store.neighbors("cqrs", "complements")).toEqual(store.complements("cqrs"));
    expect(store.neighbors("cqrs", "conflictsWith")).toEqual(store.conflictsWith("cqrs"));
    expect(store.neighbors("cqrs")).toEqual(store.relatedTo("cqrs"));
    expect(store.relatedByType("saga", "complements")).toEqual(store.complements("saga"));
  });

  it("provides ontology relationship query helpers", () => {
    const prereqs = findPrerequisites(catalog.patterns, "saga");
    expect(prereqs).toContain("transactional-outbox");
    expect(prereqs).toContain("idempotent-receiver");

    const mitigators = findMitigatingPatterns(catalog.patterns, "retry-with-backoff-and-jitter");
    expect(mitigators).toContain("circuit-breaker");

    const conflicts = findConflictingPatterns(catalog.patterns, "ports-and-adapters");
    expect(conflicts).toContain("active-record");
    expect(conflicts).toContain("transaction-script");

    const complements = findComplementaryPatterns(catalog.patterns, "ports-and-adapters");
    expect(complements).toContain("dependency-injection");

    expect(queryRelationships(catalog.patterns, "ports-and-adapters", "conflictsWith")).toContain(
      "active-record",
    );
    expect(queryRelationships(catalog.patterns, "ports-and-adapters", "complements")).toContain(
      "dependency-injection",
    );
  });

  describe("modern cloud-native and AI/agent patterns expansion", () => {
    const newPatternIds = [
      "model-router",
      "tool-circuit-breaker",
      "semantic-cache",
      "singleflight",
      "cache-aside-stampede-lock",
      "token-bucket-rate-limiter",
    ] as const;

    it("loads all 6 modern expansion patterns with valid schemas and properties", () => {
      for (const id of newPatternIds) {
        const pattern = store.get(id);
        expect(pattern, `Pattern '${id}' should exist in store`).toBeDefined();
        expect(pattern?.id).toBe(id);
        expect(pattern?.name.length).toBeGreaterThan(0);
        expect(pattern?.problem.length).toBeGreaterThan(0);
        expect(pattern?.exampleContext.length).toBeGreaterThan(0);
        expect(pattern?.mechanism.length).toBeGreaterThan(0);
        expect(pattern?.simplerAlternative.length).toBeGreaterThan(0);
        expect(pattern?.misuse.length).toBeGreaterThan(0);
        expect(pattern?.evidence.length).toBeGreaterThan(0);
        expect(pattern?.typescript.length).toBeGreaterThan(0);
        expect(pattern?.signals.length).toBeGreaterThanOrEqual(10);
      }
    });

    it("ensures no em dashes are present in any pattern text", () => {
      for (const pattern of store.all()) {
        const fields = [
          pattern.name,
          pattern.problem,
          pattern.exampleContext,
          pattern.mechanism,
          pattern.simplerAlternative,
          pattern.misuse,
          pattern.evidence,
          pattern.typescript,
          ...pattern.signals,
        ];
        for (const field of fields) {
          expect(field).not.toContain("—");
        }
      }
    });

    it("verifies AI/Agent patterns layer and track classification", () => {
      const modelRouter = store.require("model-router");
      expect(modelRouter.layer).toBe("ai-agent");
      expect(modelRouter.track).toBe("11-ai-agent");
      expect(modelRouter.level).toBe("advanced");
      expect(modelRouter.adoptionCost).toBe("medium");
      expect(modelRouter.operationalCost).toBe("medium");

      const toolCircuitBreaker = store.require("tool-circuit-breaker");
      expect(toolCircuitBreaker.layer).toBe("ai-agent");
      expect(toolCircuitBreaker.track).toBe("11-ai-agent");
      expect(toolCircuitBreaker.level).toBe("core");
      expect(toolCircuitBreaker.adoptionCost).toBe("medium");
      expect(toolCircuitBreaker.operationalCost).toBe("low");

      const semanticCache = store.require("semantic-cache");
      expect(semanticCache.layer).toBe("ai-agent");
      expect(semanticCache.track).toBe("11-ai-agent");
      expect(semanticCache.level).toBe("advanced");
      expect(semanticCache.adoptionCost).toBe("medium");
      expect(semanticCache.operationalCost).toBe("medium");
    });

    it("verifies cloud-distributed and concurrency resilience patterns classification", () => {
      const singleflight = store.require("singleflight");
      expect(singleflight.layer).toBe("distributed-systems");
      expect(singleflight.track).toBe("07-distributed-resilience");
      expect(singleflight.level).toBe("core");
      expect(singleflight.adoptionCost).toBe("low");
      expect(singleflight.operationalCost).toBe("low");

      const stampedeLock = store.require("cache-aside-stampede-lock");
      expect(stampedeLock.layer).toBe("distributed-systems");
      expect(stampedeLock.track).toBe("07-distributed-resilience");
      expect(stampedeLock.level).toBe("advanced");
      expect(stampedeLock.adoptionCost).toBe("medium");
      expect(stampedeLock.operationalCost).toBe("medium");

      const tokenBucket = store.require("token-bucket-rate-limiter");
      expect(tokenBucket.layer).toBe("concurrency");
      expect(tokenBucket.track).toBe("08-concurrency-async");
      expect(tokenBucket.level).toBe("core");
      expect(tokenBucket.adoptionCost).toBe("low");
      expect(tokenBucket.operationalCost).toBe("low");
    });

    it("verifies typed graph relationships for modern expansion patterns", () => {
      const mrComplements = store.complements("model-router").map((p) => p.id);
      expect(mrComplements).toContain("semantic-cache");
      expect(mrComplements).toContain("tool-circuit-breaker");

      const tcbMitigates = store.mitigatesLiabilityOf("tool-circuit-breaker").map((p) => p.id);
      expect(tcbMitigates).toContain("retry-with-backoff-and-jitter");

      const scMitigates = store.mitigatesLiabilityOf("semantic-cache").map((p) => p.id);
      expect(scMitigates).toContain("model-router");

      const sfMitigates = store.mitigatesLiabilityOf("singleflight").map((p) => p.id);
      expect(sfMitigates).toContain("cache-aside");

      const caslMitigates = store
        .mitigatesLiabilityOf("cache-aside-stampede-lock")
        .map((p) => p.id);
      expect(caslMitigates).toContain("cache-aside");

      const tbComplements = store.complements("token-bucket-rate-limiter").map((p) => p.id);
      expect(tbComplements).toContain("rate-limiter");
      expect(tbComplements).toContain("semaphore");
    });

    it("verifies ontology concept rules for modern expansion patterns", () => {
      const aiRouterRule = CONCEPT_RULES.find((r) => r.id === "ai-model-routing");
      expect(aiRouterRule).toBeDefined();
      expect(aiRouterRule?.boosts["model-router"]).toBeGreaterThan(0);

      const agentFaultRule = CONCEPT_RULES.find((r) => r.id === "agent-tool-fault-tolerance");
      expect(agentFaultRule).toBeDefined();
      expect(agentFaultRule?.boosts["tool-circuit-breaker"]).toBeGreaterThan(0);

      const semanticCacheRule = CONCEPT_RULES.find((r) => r.id === "semantic-similarity-caching");
      expect(semanticCacheRule).toBeDefined();
      expect(semanticCacheRule?.boosts["semantic-cache"]).toBeGreaterThan(0);

      const stampedeRule = CONCEPT_RULES.find((r) => r.id === "cache-stampede-coalescing");
      expect(stampedeRule).toBeDefined();
      expect(stampedeRule?.boosts.singleflight).toBeGreaterThan(0);
      expect(stampedeRule?.boosts["cache-aside-stampede-lock"]).toBeGreaterThan(0);

      const burstRule = CONCEPT_RULES.find((r) => r.id === "bursty-traffic-shaping");
      expect(burstRule).toBeDefined();
      expect(burstRule?.boosts["token-bucket-rate-limiter"]).toBeGreaterThan(0);
    });
  });
});
