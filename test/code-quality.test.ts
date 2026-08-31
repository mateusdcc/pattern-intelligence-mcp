import { describe, expect, it } from "vitest";

import { PatternIntelligence } from "../src/application/pattern-intelligence.js";
import { analyzeCodeQuality } from "../src/engine/code-quality-analyzer.js";
import { refactorCodeSmell } from "../src/engine/code-smell-refactorer.js";
import { synthesizeRefactoring } from "../src/engine/refactoring-synthesizer.js";

describe("Code Quality & Smell Analyzer", () => {
  it("detects dual write consistency hazard in a function", () => {
    const code = `
      async function handleOrder(order) {
        await db.orders.insert(order);
        await kafka.publish("orders.created", order);
      }
    `;
    const report = analyzeCodeQuality(code, "order.service.ts");
    expect(report.smells.some((s) => s.kind === "dual-write-hazard")).toBe(true);
    expect(report.recommendedAction).toBe("refactor-with-patterns");
    const smell = report.smells.find((s) => s.kind === "dual-write-hazard");
    expect(smell?.evidence).toContain("db.orders.insert");
    expect(smell?.evidence).toContain("kafka.publish");
  });

  it("detects dual write hazard in class methods while ignoring safe methods", () => {
    const code = `
      export class CheckoutService {
        private db: Database;
        private kafka: MessageBroker;

        async processCheckout(order: Order): Promise<void> {
          await this.db.orders.insert(order);
          await this.kafka.publish("checkout.completed", order);
        }

        async getOrder(id: string): Promise<Order> {
          return this.db.orders.findById(id);
        }
      }
    `;
    const report = analyzeCodeQuality(code, "checkout.service.ts");
    expect(report.smells.some((s) => s.kind === "dual-write-hazard")).toBe(true);
    const smell = report.smells.find((s) => s.kind === "dual-write-hazard");
    expect(smell?.evidence).toContain("processCheckout");
  });

  it("does not flag dual-write when transactional outbox is used", () => {
    const code = `
      async function handleOrder(order: Order, tx: Transaction) {
        await tx.orders.insert(order);
        await tx.outbox.insert({ topic: "orders.created", payload: order });
      }
    `;
    const report = analyzeCodeQuality(code, "order.service.ts");
    expect(report.smells.some((s) => s.kind === "dual-write-hazard")).toBe(false);
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

  it("detects missing timeout on axios and client invocations", () => {
    const code = `
      async function syncData(client: ApiClient, payload: any) {
        const res1 = await axios.post("https://api.partner.com/sync", payload);
        const res2 = await client.send(payload);
        return { res1, res2 };
      }
    `;
    const report = analyzeCodeQuality(code, "sync.service.ts");
    expect(report.smells.some((s) => s.kind === "missing-timeout")).toBe(true);
  });

  it("does not flag remote calls when timeout or AbortSignal is supplied", () => {
    const code = `
      async function checkFraudSafe(user: User) {
        const res = await fetch("https://fraud.api/score", {
          body: JSON.stringify(user),
          signal: AbortSignal.timeout(3000),
        });
        const axiosRes = await axios.post("https://api.partner.com/sync", user, {
          timeout: 5000,
        });
        return { res, axiosRes };
      }
    `;
    const report = analyzeCodeQuality(code, "safe-fraud.client.ts");
    expect(report.smells.some((s) => s.kind === "missing-timeout")).toBe(false);
  });

  it("detects leaky vendor models in domain code", () => {
    const code = `
      import type { FedExRateRequestPayload } from "fedex-sdk";
      export function buildDomainShipment(payload: FedExRateRequestPayload) {}
    `;
    const report = analyzeCodeQuality(code, "shipment.domain.ts");
    expect(report.smells.some((s) => s.kind === "leaky-abstraction")).toBe(true);
  });

  it("calculates deterministic cyclomatic complexity accurately", () => {
    const code = `
      export function evaluateRisk(user: any, order: any): string {
        if (user.isBlocked) {
          return "blocked";
        }
        for (const item of order.items) {
          if (item.price > 1000 || item.isFlagged) {
            return "high-risk";
          }
        }
        return user.score > 50 ? "low-risk" : "medium-risk";
      }
    `;
    const report = analyzeCodeQuality(code, "risk.ts");
    expect(report.metrics.cyclomaticComplexity).toBeGreaterThanOrEqual(6);
  });

  it("computes LCOM4 cohesion and detects God Class on multi-responsibility classes", () => {
    const code = `
      import { Mailer } from "mailer";
      import { DB } from "database";
      import { Analytics } from "analytics";
      import { Logger } from "logger";

      export class MonolithicManager {
        private db: DB;
        private mailer: Mailer;
        private analytics: Analytics;
        private logger: Logger;

        async saveOrder(order: any) {
          if (!order) throw new Error();
          await this.db.save(order);
        }

        async deleteOrder(id: string) {
          if (!id) throw new Error();
          await this.db.delete(id);
        }

        async sendNewsletter(email: string) {
          if (!email) throw new Error();
          await this.mailer.send(email);
        }

        async trackEvent(event: string) {
          if (!event) throw new Error();
          await this.analytics.track(event);
        }

        async flushLogs() {
          await this.logger.flush();
        }
      }
    `;
    const report = analyzeCodeQuality(code, "monolith.ts");
    expect(report.metrics.lcom4Score).toBeGreaterThanOrEqual(3);
    expect(report.metrics.cohesionScore).toBeLessThanOrEqual(50);
    expect(report.metrics.efferentCoupling).toBeGreaterThanOrEqual(4);
    expect(report.smells.some((s) => s.kind === "god-class")).toBe(true);
  });

  it("computes high cohesion for cohesive single-purpose classes", () => {
    const code = `
      export class AccountBalance {
        private balance = 0;

        deposit(amount: number): number {
          this.balance += amount;
          return this.balance;
        }

        withdraw(amount: number): number {
          this.balance -= amount;
          return this.balance;
        }

        getBalance(): number {
          return this.balance;
        }
      }
    `;
    const report = analyzeCodeQuality(code, "account.ts");
    expect(report.metrics.lcom4Score).toBe(1);
    expect(report.metrics.cohesionScore).toBe(100);
  });

  it("computes afferent, efferent coupling and instability index deterministically", () => {
    const code = `
      import { ServiceA } from "lib-a";
      import { ServiceB } from "lib-b";
      import { ServiceC } from "lib-c";

      export function featureOne() {}
      export function featureTwo() {}
    `;
    const report = analyzeCodeQuality(code, "features.ts");
    expect(report.metrics.efferentCoupling).toBe(3);
    expect(report.metrics.afferentCoupling).toBe(2);
    expect(report.metrics.instabilityIndex).toBe(0.6);
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

  it("synthesizes optimistic concurrency control scaffold with conditional update and retry", () => {
    const scaffold = synthesizeRefactoring("Optimistic Concurrency Control");
    expect(scaffold.patternName).toContain("Optimistic Concurrency");
    expect(scaffold.files.length).toBeGreaterThanOrEqual(4);

    const errFile = scaffold.files.find((f) => f.path.includes("concurrency-conflict"));
    expect(errFile).toBeDefined();
    expect(errFile?.code).toContain("class ConcurrencyConflictError");

    const entityFile = scaffold.files.find((f) => f.path.includes("inventory-item"));
    expect(entityFile?.code).toContain("version: number");

    const repoFile = scaffold.files.find((f) => f.path.includes("repository"));
    expect(repoFile?.code).toContain("UPDATE inventory_items SET");
    expect(repoFile?.code).toContain("WHERE id = $4 AND version = $5");

    const serviceFile = scaffold.files.find((f) => f.path.includes("reservation.service"));
    expect(serviceFile?.code).toContain("executeWithRetry");
    expect(serviceFile?.code).toContain("backoffMultiplier");

    expect(scaffold.migrationSteps.length).toBeGreaterThanOrEqual(3);
    expect(scaffold.verificationTests.length).toBeGreaterThanOrEqual(2);
  });

  it("synthesizes distributed saga orchestration scaffold with state machine and rollback", () => {
    const scaffold = synthesizeRefactoring("Saga Orchestration");
    expect(scaffold.patternName).toContain("Saga");
    expect(scaffold.files.length).toBeGreaterThanOrEqual(3);

    const stepFile = scaffold.files.find((f) => f.path.includes("saga-step"));
    expect(stepFile?.code).toContain("StepState =");
    expect(stepFile?.code).toContain('"PENDING"');
    expect(stepFile?.code).toContain('"EXECUTING"');
    expect(stepFile?.code).toContain('"COMPENSATING"');

    const coordFile = scaffold.files.find((f) => f.path.includes("saga-coordinator"));
    expect(coordFile?.code).toContain("class SagaExecutionCoordinator");
    expect(coordFile?.code).toContain("rollback(");

    const workflowFile = scaffold.files.find((f) => f.path.includes("fulfillment.saga"));
    expect(workflowFile?.code).toContain("PaymentStep");
    expect(workflowFile?.code).toContain("compensate(");

    expect(scaffold.migrationSteps.length).toBeGreaterThanOrEqual(3);
    expect(scaffold.verificationTests.length).toBeGreaterThanOrEqual(2);
  });

  it("synthesizes modular monolith scaffold with in-memory domain bus and boundaries", () => {
    const scaffold = synthesizeRefactoring("Modular Monolith");
    expect(scaffold.patternName).toContain("Modular Monolith");
    expect(scaffold.files.length).toBeGreaterThanOrEqual(4);

    const busFile = scaffold.files.find((f) => f.path.includes("domain-event-bus"));
    expect(busFile?.code).toContain("class DomainEventBus");
    expect(busFile?.code).toContain("subscribe<TEvent");
    expect(busFile?.code).toContain("publish<TEvent");

    const apiFile = scaffold.files.find((f) => f.path.includes("public-api"));
    expect(apiFile?.code).toContain("OrdersModuleApi");

    const lintFile = scaffold.files.find((f) => f.path.includes("eslint-boundaries"));
    expect(lintFile?.code).toContain("import/no-restricted-paths");

    expect(scaffold.migrationSteps.length).toBeGreaterThanOrEqual(3);
    expect(scaffold.verificationTests.length).toBeGreaterThanOrEqual(2);
  });

  it("synthesizes strangler fig scaffold with proxy, fallback, and shadow execution", () => {
    const scaffold = synthesizeRefactoring("Strangler Fig");
    expect(scaffold.patternName).toContain("Strangler Fig");
    expect(scaffold.files.length).toBeGreaterThanOrEqual(3);

    const portFile = scaffold.files.find((f) => f.path.includes("pricing-service.port"));
    expect(portFile?.code).toContain("interface PricingServicePort");

    const proxyFile = scaffold.files.find((f) => f.path.includes("strangler-proxy"));
    expect(proxyFile?.code).toContain("class StranglerPricingProxy");
    expect(proxyFile?.code).toContain("isEnabled");
    expect(proxyFile?.code).toContain("executeShadow");
    expect(proxyFile?.code).toContain("this.legacyService.calculate");

    const shadowFile = scaffold.files.find((f) => f.path.includes("shadow-parity-reporter"));
    expect(shadowFile?.code).toContain("class ShadowParityReporter");

    expect(scaffold.migrationSteps.length).toBeGreaterThanOrEqual(3);
    expect(scaffold.verificationTests.length).toBeGreaterThanOrEqual(2);
  });

  it("ensures all scaffolds have zero TODO placeholders and valid structure", () => {
    const patterns = [
      "Optimistic Concurrency Control",
      "Saga Orchestration",
      "Modular Monolith",
      "Strangler Fig",
      "Adapter",
      "Transactional Outbox",
      "Strategy Pattern",
      "Circuit Breaker",
    ];

    for (const pattern of patterns) {
      const scaffold = synthesizeRefactoring(pattern);
      expect(scaffold.files.length).toBeGreaterThan(0);
      expect(scaffold.migrationSteps.length).toBeGreaterThan(0);
      expect(scaffold.verificationTests.length).toBeGreaterThan(0);

      for (const file of scaffold.files) {
        expect(file.code).not.toContain("TODO");
        expect(file.code.length).toBeGreaterThan(20);
        expect(file.path.length).toBeGreaterThan(0);
        expect(file.description.length).toBeGreaterThan(0);
      }
    }
  });

  it("refactors code smell with end-to-end markdown and before/after metrics comparison", () => {
    const code = `
      async function book(req) {
        await db.payments.save(req);
        await kafka.emit("pay", req);
      }
    `;
    const result = refactorCodeSmell(code, "booking.ts");
    expect(result.report.smells.length).toBeGreaterThan(0);
    expect(result.markdownSummary).toContain("Transactional Outbox");
    expect(result.markdownSummary).toContain("Deterministic Metrics Comparison");
    expect(result.markdownSummary).toContain("Maintainability Index");
    expect(result.metricsComparison.before.maintainabilityIndex).toBeLessThan(
      result.metricsComparison.projectedAfter.maintainabilityIndex,
    );
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

  it("prescribes architecture blueprint seamlessly for optimistic concurrency control", () => {
    const intelligence = new PatternIntelligence();
    const prescription = intelligence.prescribe({
      problem:
        "Concurrent updates are uncommon enough that conflicts can be detected rather than prevented by long locks for inventory versioned records.",
      evidence: ["conflict rate is 0.5%", "retries resolve automatically"],
    });
    expect(prescription.primaryPattern).toMatch(/Optimistic Concurrency Control|optimistic/i);
    expect(prescription.scaffold.files.length).toBeGreaterThanOrEqual(4);
    expect(prescription.migrationSeams.length).toBeGreaterThanOrEqual(3);
    expect(prescription.markdownSummary).toContain("Proposed Code Structure");
    expect(prescription.markdownSummary).toContain("Reversible Rollout Seams");
  });
});
