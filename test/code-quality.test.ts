import { describe, expect, it } from "vitest";

import { PatternIntelligence } from "../src/application/pattern-intelligence.js";
import { analyzeCodeQuality } from "../src/engine/code-quality-analyzer.js";
import { refactorCodeSmell } from "../src/engine/code-smell-refactorer.js";
import { synthesizeRefactoring } from "../src/engine/refactoring-synthesizer.js";

describe("Code Quality & Smell Analyzer", () => {
  it("detects dual write consistency hazard", () => {
    const code = `
      async function handleOrder(order) {
        await db.orders.insert(order);
        await kafka.publish("orders.created", order);
      }
    `;
    const report = analyzeCodeQuality(code, "order.service.ts");
    expect(report.smells.some((s) => s.kind === "dual-write-hazard")).toBe(true);
    expect(report.recommendedAction).toBe("refactor-with-patterns");
  });

  it("detects missing timeouts on remote HTTP calls", () => {
    const code = `
      async function checkFraud(user) {
        const res = await fetch("https://fraud.api/score", { body: JSON.stringify(user) });
        return res.json();
      }
    `;
    const report = analyzeCodeQuality(code, "fraud.client.ts");
    expect(report.smells.some((s) => s.kind === "missing-timeout")).toBe(true);
  });

  it("detects leaky vendor models in domain code", () => {
    const code = `
      import type { FedExRateRequestPayload } from "fedex-sdk";
      export function buildDomainShipment(payload: FedExRateRequestPayload) {}
    `;
    const report = analyzeCodeQuality(code, "shipment.domain.ts");
    expect(report.smells.some((s) => s.kind === "leaky-abstraction")).toBe(true);
  });

  it("scores clean code with high maintainability index", () => {
    const code = `
      export function calculateTotal(items: number[]): number {
        return items.reduce((a, b) => a + b, 0);
      }
    `;
    const report = analyzeCodeQuality(code, "math.ts");
    expect(report.smells.length).toBe(0);
    expect(report.metrics.maintainabilityIndex).toBeGreaterThan(80);
  });
});

describe("Refactoring Synthesizer & Code Smell Refactorer", () => {
  it("synthesizes adapter scaffold", () => {
    const scaffold = synthesizeRefactoring("Adapter");
    expect(scaffold.patternName).toContain("Adapter");
    expect(scaffold.files.length).toBeGreaterThanOrEqual(2);
    expect(scaffold.migrationSteps.length).toBeGreaterThanOrEqual(3);
  });

  it("synthesizes transactional outbox scaffold", () => {
    const scaffold = synthesizeRefactoring("Transactional Outbox");
    expect(scaffold.patternName).toContain("Outbox");
    expect(scaffold.files.some((f) => f.path.includes("outbox"))).toBe(true);
  });

  it("refactors code smell with end-to-end markdown", () => {
    const code = `
      async function book(req) {
        await db.payments.save(req);
        await kafka.emit("pay", req);
      }
    `;
    const result = refactorCodeSmell(code, "booking.ts");
    expect(result.report.smells.length).toBeGreaterThan(0);
    expect(result.markdownSummary).toContain("Transactional Outbox");
  });

  it("prescribes architecture blueprint in single call", () => {
    const intelligence = new PatternIntelligence();
    const prescription = intelligence.prescribe({
      problem:
        "Three third-party carrier APIs expose incompatible interfaces and leak vendor models inward.",
      evidence: ["provider types appear in 19 domain files"],
    });
    expect(prescription.primaryPattern).toMatch(/Adapter|Anti-Corruption Layer/i);
    expect(prescription.scaffold.files.length).toBeGreaterThan(0);
    expect(prescription.markdownSummary).toContain("Proposed Code Structure");
  });
});
