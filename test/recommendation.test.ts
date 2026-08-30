import { describe, expect, it } from "vitest";

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
});
