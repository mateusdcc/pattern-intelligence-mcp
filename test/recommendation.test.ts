import { describe, expect, it } from "vitest";

import { buildAdr } from "../src/application/decision-artifacts.js";
import { PatternIntelligence } from "../src/application/pattern-intelligence.js";

const intelligence = new PatternIntelligence();

describe("recommendation intelligence", () => {
  it("chooses Strategy for variable pricing behavior", () => {
    const result = intelligence.analyze({
      problem:
        "Pricing rules vary by country and product, and we need to select an algorithm at runtime.",
      goals: ["add pricing policies without changing checkout"],
      changeAxes: ["pricing behavior"],
      evidence: ["pricing rules changed 14 times this quarter"],
      complexityBudget: "minimal",
    });

    expect(result.patterns[0]?.pattern.id).toBe("strategy");
    expect(result.patterns.some((item) => item.pattern.id === "higher-order-function")).toBe(true);
  });

  it("treats payment retries as an idempotency compound", () => {
    const result = intelligence.analyze({
      problem:
        "A payment provider times out and messages use at least once delivery, causing duplicate charges after retry.",
      failureModes: ["provider outage", "duplicate message", "duplicate charge"],
      goals: ["contain remote failure", "never charge twice"],
      delivery: "at-least-once",
      evidence: ["0.3% provider timeouts", "17 duplicate attempts last week"],
    });
    const topIds = result.patterns.slice(0, 6).map((item) => item.pattern.id);

    expect(topIds).toContain("idempotent-receiver");
    expect(topIds).toContain("timeout");
    expect(topIds).toContain("retry-with-backoff-and-jitter");
    expect(result.questions[0]).toContain("safe to repeat");
  });

  it("penalizes CQRS and Event Sourcing for simple CRUD", () => {
    const result = intelligence.analyze({
      problem: "This is a simple CRUD admin app with a thin domain and few business rules.",
      goals: ["ship quickly"],
      constraints: ["two-person team", "no dedicated operations"],
      team: { size: 2, operationsCapacity: "limited", experience: "mixed" },
      complexityBudget: "minimal",
      evidence: ["four tables and five straightforward workflows"],
    });
    const topIds = result.patterns.slice(0, 3).map((item) => item.pattern.id);

    expect(topIds).toContain("transaction-script");
    expect(result.rejectedPatterns.map((item) => item.pattern.id)).toContain("event-sourcing");
    expect(result.rejectedPatterns.map((item) => item.pattern.id)).toContain("cqrs");
  });

  it("detects Singleton cargo-cult risk for mutable global state", () => {
    const findings = intelligence.detectMisuse(
      {
        problem:
          "A global mutable registry causes test leakage and hidden dependencies between modules.",
        goals: ["isolated tests", "visible lifecycle"],
        evidence: ["21 order-dependent test failures"],
      },
      ["Singleton"],
    );

    expect(findings[0]?.verdict).toBe("cargo-cult-risk");
    expect(findings[0]?.alternatives.join(" ")).toMatch(/Composition Root|Dependency Injection/);
  });

  it("compares patterns using contextual tipping points", () => {
    const result = intelligence.compare(
      {
        problem: "We have multiple algorithms for fraud scoring that vary at runtime.",
        changeAxes: ["algorithm"],
        evidence: ["providers change monthly"],
      },
      ["Strategy", "Template Method", "State"],
    );

    expect(result.winner).toBe("strategy");
    expect(result.tippingPoints).toHaveLength(3);
  });

  it("shows when a decision flips under a counterfactual", () => {
    const result = intelligence.stressTest(
      {
        problem: "A basic admin application performs simple CRUD over a small dataset.",
        evidence: ["low traffic and few business rules"],
        complexityBudget: "minimal",
      },
      [
        {
          name: "domain becomes behavior-rich",
          patch: {
            problem: "Complex business rules and domain invariants now govern every update.",
            goals: ["protect aggregate boundaries and business behavior"],
            complexityBudget: "substantial",
          },
        },
      ],
    );

    expect(result.scenarios[0]?.decisionChanged).toBe(true);
    expect(result.scenarios[0]?.topPatternAfter).toMatch(/domain-model|aggregate|value-object/);
  });

  describe("compound topologies", () => {
    it("assembles Dual-Write compound topology with explicit component layers and CDC relay", () => {
      const result = intelligence.analyze({
        problem:
          "A database update succeeds but publishing after commit sometimes loses the event in a dual write.",
        delivery: "at-least-once",
        evidence: ["43 missing events after broker outages"],
      });

      expect(result.topology).toBeDefined();
      expect(result.topology?.id).toBe("dual-write-cdc");
      expect(result.topology?.name).toContain("Dual-Write CDC Outbox Topology");

      const layers = result.topology?.components.map((c) => c.layer);
      expect(layers).toContain("Domain Port");
      expect(layers).toContain("Infrastructure Adapter");
      expect(layers).toContain("Outbox Relay Worker");
      expect(layers).toContain("Idempotent Consumer");

      const compoundIds = result.compound.map((c) => c.patternId);
      expect(compoundIds).toContain("transactional-outbox");
      expect(compoundIds).toContain("idempotent-receiver");

      const flows = result.topology?.dataFlows ?? [];
      expect(flows.length).toBeGreaterThanOrEqual(4);
      expect(flows.some((f) => f.to === "Transactional Outbox Writer")).toBe(true);
      expect(flows.some((f) => f.to === "CDC Outbox Relay Worker")).toBe(true);
    });

    it("assembles Dependency Resilience compound topology with bulkhead and fallback routing", () => {
      const result = intelligence.analyze({
        problem:
          "A downstream provider is slow or unavailable and transient failures cascade through request threads.",
        failureModes: ["remote timeout", "provider outage"],
        evidence: ["p99 latency reaches 19 seconds during outages"],
      });

      expect(result.topology).toBeDefined();
      expect(result.topology?.id).toBe("dependency-resilience");

      const layers = result.topology?.components.map((c) => c.layer);
      expect(layers).toContain("Fallback Router");
      expect(layers).toContain("Resilience Interceptor");
      expect(layers).toContain("Infrastructure Adapter");

      const compoundIds = result.compound.map((c) => c.patternId);
      expect(compoundIds).toContain("circuit-breaker");
      expect(compoundIds).toContain("bulkhead");
      expect(compoundIds).toContain("timeout");

      const flows = result.topology?.dataFlows ?? [];
      expect(flows.some((f) => f.to === "Bulkhead Isolation Pool")).toBe(true);
      expect(flows.some((f) => f.to === "Resilient Fallback Router")).toBe(true);
    });

    it("assembles Third-Party Insulation compound topology with ports, ACL, and strategy", () => {
      const result = intelligence.analyze({
        problem:
          "Three third-party carrier APIs expose incompatible interfaces and leak vendor models inward.",
        evidence: ["provider types appear in 19 domain files"],
      });

      expect(result.topology).toBeDefined();
      expect(result.topology?.id).toBe("third-party-insulation");

      const components = result.topology?.components ?? [];
      const patternIds = components.map((c) => c.patternId);
      expect(patternIds).toContain("ports-and-adapters");
      expect(patternIds).toContain("strategy");
      expect(patternIds).toContain("adapter");
      expect(patternIds).toContain("anti-corruption-layer");

      const flows = result.topology?.dataFlows ?? [];
      expect(flows.some((f) => f.to === "Anti-Corruption Layer Translator")).toBe(true);
      expect(flows.some((f) => f.to === "Provider Strategy Router")).toBe(true);
    });

    it("assembles Distributed Workflow compound topology with saga, outbox, and compensation", () => {
      const result = intelligence.analyze({
        problem:
          "A long-running distributed transaction spans services and needs compensating actions after partial failure.",
        consistency: "eventual",
        complexityBudget: "substantial",
        evidence: ["partial checkout completion affects 0.4% of orders"],
      });

      expect(result.topology).toBeDefined();
      expect(result.topology?.id).toBe("distributed-workflow");

      const layers = result.topology?.components.map((c) => c.layer);
      expect(layers).toContain("Domain Port");
      expect(layers).toContain("Workflow Coordinator");
      expect(layers).toContain("Outbox Relay Worker");
      expect(layers).toContain("Idempotent Consumer");
      expect(layers).toContain("Compensation Handler");

      const flows = result.topology?.dataFlows ?? [];
      expect(flows.some((f) => f.to === "Saga Step Outbox Dispatcher")).toBe(true);
      expect(flows.some((f) => f.to === "Compensating Transaction Handler")).toBe(true);
    });

    it("assembles Safe Migration compound topology with strangler, shadow reconciliation, and canary", () => {
      const result = intelligence.analyze({
        problem:
          "We need an incremental replacement and legacy migration from a monolith extraction without big-bang cutover.",
        evidence: ["legacy system handles 100k req/s"],
      });

      expect(result.topology).toBeDefined();
      expect(result.topology?.id).toBe("safe-migration");

      const layers = result.topology?.components.map((c) => c.layer);
      expect(layers).toContain("Migration Interceptor");
      expect(layers).toContain("Domain Port");
      expect(layers).toContain("Infrastructure Adapter");
      expect(layers).toContain("Shadow Comparator");
      expect(layers).toContain("Fallback Router");

      const flows = result.topology?.dataFlows ?? [];
      expect(flows.some((f) => f.to === "Shadow Reconciliation Verifier")).toBe(true);
      expect(flows.some((f) => f.to === "Canary Fallback Router")).toBe(true);
    });

    it("formats compound topology boundaries and data flows in architectural prescription markdown", () => {
      const prescription = intelligence.prescribe({
        problem:
          "A database update succeeds but publishing after commit sometimes loses the event in a dual write.",
        delivery: "at-least-once",
        evidence: ["43 missing events after broker outages"],
      });

      expect(prescription.topology).toBeDefined();
      expect(prescription.markdownSummary).toContain(
        "Architectural Topology: Dual-Write CDC Outbox Topology",
      );
      expect(prescription.markdownSummary).toContain("Component Boundaries & Layers");
      expect(prescription.markdownSummary).toContain("**Domain Port**");
      expect(prescription.markdownSummary).toContain("**Infrastructure Adapter**");
      expect(prescription.markdownSummary).toContain("**Outbox Relay Worker**");
      expect(prescription.markdownSummary).toContain("**Idempotent Consumer**");
      expect(prescription.markdownSummary).toContain("Data Flow & Interactions");
      expect(prescription.markdownSummary).toContain(
        "`Domain Outbox Port` -> `Transactional Outbox Writer`",
      );
    });
  });

  describe("anti-cargo-cult rejection framework", () => {
    it("detects premature complexity for Microservices with small teams and quantitative tipping points", () => {
      const findings = intelligence.detectMisuse(
        {
          problem: "A small web application needs internal structure.",
          constraints: ["two-person team", "minimal operations"],
          team: { size: 2, operationsCapacity: "limited" },
          complexityBudget: "minimal",
        },
        ["microservices"],
      );

      expect(findings[0]?.verdict).toBe("cargo-cult-risk");
      expect(findings[0]?.risk).toBe("high");
      expect(findings[0]?.qualification).toBe("premature");
      expect(findings[0]?.tippingPoint).toContain("> 15 engineers across 3 squads");
      expect(findings[0]?.reasons.some((r) => r.includes("premature for 2 engineers"))).toBe(true);
      expect(findings[0]?.alternatives[0]).toContain("Single modular monolith codebase");
    });

    it("detects premature complexity for CQRS and Event Sourcing on low-volume CRUD", () => {
      const findings = intelligence.detectMisuse(
        {
          problem: "Simple CRUD admin panel with thin domain and five standard workflows.",
          evidence: ["low volume 10 writes/day"],
          complexityBudget: "minimal",
        },
        ["CQRS", "Event Sourcing"],
      );

      const cqrs = findings.find((f) => f.pattern.id === "cqrs");
      const es = findings.find((f) => f.pattern.id === "event-sourcing");

      expect(cqrs?.verdict).toBe("cargo-cult-risk");
      expect(cqrs?.qualification).toBe("overkill");
      expect(cqrs?.tippingPoint).toContain("> 5,000 writes/sec");
      expect(cqrs?.alternatives[0]).toContain("Relational tables with indexed views");

      expect(es?.verdict).toBe("cargo-cult-risk");
      expect(es?.qualification).toBe("overkill");
      expect(es?.tippingPoint).toContain("Strict regulatory audit requirement");
      expect(es?.alternatives[0]).toContain(
        "State-based relational persistence with an append-only audit log table",
      );
    });

    it("detects Two-Phase Commit (2PC) cargo-cult risk with contraindicated qualification", () => {
      const findings = intelligence.detectMisuse(
        {
          problem: "Distributed microservices coordinating checkout across billing and inventory.",
          delivery: "at-least-once",
        },
        ["2PC"],
      );

      expect(findings[0]?.verdict).toBe("cargo-cult-risk");
      expect(findings[0]?.qualification).toBe("contraindicated");
      expect(findings[0]?.reasons[0]).toContain("Synchronous Two-Phase Commit");
      expect(findings[0]?.alternatives).toContain("Single database transaction (ACID)");
      expect(findings[0]?.tippingPoint).toContain("Multi-service workflow");
    });

    it("generates Anti-Pattern Rejection Matrix and direct baseline when prefer-direct-solution is prescribed", () => {
      const prescription = intelligence.prescribe({
        problem: "A basic CRUD internal tool with 3 tables and low traffic.",
        complexityBudget: "minimal",
        constraints: ["small team"],
        evidence: ["20 internal users"],
      });

      expect(prescription.verdict).toBe("prefer-direct-solution");
      expect(prescription.rejectionMatrix).toBeDefined();
      expect(prescription.rejectionMatrix?.length).toBeGreaterThan(0);

      for (const entry of prescription.rejectionMatrix ?? []) {
        expect(["contraindicated", "overkill", "premature", "unnecessary"]).toContain(
          entry.qualification,
        );
        expect(entry.directBaseline.length).toBeGreaterThan(0);
        expect(entry.tippingPoint.length).toBeGreaterThan(0);
      }

      expect(prescription.markdownSummary).toContain("#### Anti-Pattern Rejection Matrix");
      expect(prescription.markdownSummary).toContain("#### Revisit & Tipping Point Criteria");
      expect(prescription.markdownSummary).toContain(
        "| Pattern | Qualification | Rejection Reason | Direct Baseline | Revisit Tipping Point |",
      );
      expect(prescription.tippingPoints?.length).toBeGreaterThan(0);
    });

    it("builds ADR with Anti-Pattern Rejection Matrix and revisit tipping points for direct solution", () => {
      const analysis = intelligence.analyze({
        problem: "Simple CRUD admin tool with standard workflows.",
        complexityBudget: "minimal",
        evidence: ["low volume"],
      });

      const adr = buildAdr("Direct Admin Implementation", analysis);
      expect(adr).toContain("## Anti-Pattern Rejection Matrix");
      expect(adr).toContain(
        "| Pattern | Qualification | Rejection Reason | Direct Baseline | Revisit Tipping Point |",
      );
      expect(adr).toContain("## Reversal triggers");
      expect(adr).toContain("Revisit");
    });
  });
});
