import { describe, expect, it } from "vitest";

import { PatternIntelligence } from "../src/application/pattern-intelligence.js";
import { generateFitnessRules } from "../src/engine/fitness-rules-generator.js";

describe("Architectural Fitness Rules Generator", () => {
  const intelligence = new PatternIntelligence();

  it("generates Ports & Adapters fitness rules", () => {
    const rules = intelligence.generateFitnessRules("Ports & Adapters");

    expect(rules.patternName).toContain("Ports & Adapters");
    expect(rules.architectureStyle).toContain("Hexagonal");
    expect(rules.boundaryRules.length).toBeGreaterThan(0);
    expect(rules.boundaryRules[0]?.sourceLayer).toBe("src/domain/**");
    expect(rules.eslintRules.config).toContain("@typescript-eslint/no-restricted-imports");
    expect(rules.fitnessTests.filename).toContain("ports-adapters.fitness.test.ts");
    expect(rules.fitnessTests.testCode).toContain('describe("Architectural Fitness');
    expect(rules.ciCommands.commands.length).toBeGreaterThanOrEqual(2);
    expect(rules.files.length).toBe(3);
    expect(rules.markdownSummary).toContain("### Architectural Fitness Rules");
  });

  it("generates Modular Monolith fitness rules", () => {
    const rules = intelligence.generateFitnessRules({ patternName: "Modular Monolith" });

    expect(rules.patternName).toContain("Modular Monolith");
    expect(rules.boundaryRules[0]?.forbiddenTargetLayers[0]).toContain("public-api");
    expect(rules.eslintRules.plugin).toBe("eslint-plugin-boundaries");
    expect(rules.fitnessTests.filename).toContain("modular-monolith.fitness.test.ts");
    expect(rules.ciCommands.bashScript).toContain("npx vitest run");
  });

  it("generates Transactional Outbox fitness rules", () => {
    const rules = intelligence.generateFitnessRules({ patternName: "Transactional Outbox" });

    expect(rules.patternName).toContain("Transactional Outbox");
    expect(rules.boundaryRules[0]?.forbiddenTargetLayers).toContain("kafkajs");
    expect(rules.eslintRules.config).toContain("kafkajs");
    expect(rules.fitnessTests.filename).toContain("outbox.fitness.test.ts");
  });

  it("generates CQRS fitness rules", () => {
    const rules = intelligence.generateFitnessRules({ patternName: "CQRS" });

    expect(rules.patternName).toContain("Command Query Responsibility Segregation");
    expect(rules.boundaryRules[0]?.sourceLayer).toContain("queries");
    expect(rules.fitnessTests.filename).toContain("cqrs.fitness.test.ts");
  });

  it("generates Circuit Breaker / Resilience fitness rules", () => {
    const rules = intelligence.generateFitnessRules({ patternName: "Circuit Breaker" });

    expect(rules.patternName).toContain("Circuit Breaker");
    expect(rules.boundaryRules[0]?.forbiddenTargetLayers).toContain("axios");
    expect(rules.fitnessTests.filename).toContain("resilience.fitness.test.ts");
  });

  it("generates Optimistic Concurrency Control fitness rules", () => {
    const rules = intelligence.generateFitnessRules({
      patternName: "Optimistic Concurrency Control",
    });

    expect(rules.patternName).toContain("Optimistic Concurrency Control");
    expect(rules.fitnessTests.filename).toContain("concurrency.fitness.test.ts");
    expect(rules.fitnessTests.testCode).toContain("version");
  });

  it("generates Saga orchestration fitness rules", () => {
    const rules = intelligence.generateFitnessRules({ patternName: "Saga" });

    expect(rules.patternName).toContain("Distributed Saga Orchestration");
    expect(rules.fitnessTests.filename).toContain("saga.fitness.test.ts");
    expect(rules.fitnessTests.testCode).toContain("compensate(");
  });

  it("generates Strangler Fig fitness rules", () => {
    const rules = intelligence.generateFitnessRules({ patternName: "Strangler Fig" });

    expect(rules.patternName).toContain("Strangler Fig");
    expect(rules.fitnessTests.filename).toContain("strangler.fitness.test.ts");
    expect(rules.boundaryRules[0]?.forbiddenTargetLayers).toContain("src/infrastructure/legacy/**");
  });

  it("diagnoses pattern from design case when patternName is not provided", () => {
    const rules = intelligence.generateFitnessRules({
      case: {
        problem:
          "Need atomic event publishing with database writes to prevent dual write data corruption.",
        candidatePatterns: ["Transactional Outbox"],
        evidence: ["broker outages cause desync"],
      },
    });

    expect(rules.patternName).toContain("Transactional Outbox");
  });

  it("falls back to Ports & Adapters when no pattern is specified", () => {
    const rules = generateFitnessRules();

    expect(rules.patternName).toContain("Ports & Adapters");
  });
});
