import type { McpServer } from "@modelcontextprotocol/server";

import { buildAdoptionPlan, buildAdr, queryGraph } from "../application/decision-artifacts.js";
import type { PatternIntelligence } from "../application/pattern-intelligence.js";
import {
  adrInputSchema,
  analyzeInputSchema,
  codeQualityInputSchema,
  compareInputSchema,
  fitnessRulesInputSchema,
  graphInputSchema,
  misuseInputSchema,
  patternDecisionInputSchema,
  prescribeArchitectureInputSchema,
  refactorSmellInputSchema,
  stressTestInputSchema,
  synthesizeRefactoringInputSchema,
} from "./tool-schemas.js";

export const TOOL_NAMES = [
  "prescribe_architecture",
  "refactor_code_smell",
  "analyze_design_case",
  "compare_pattern_options",
  "detect_pattern_misuse",
  "stress_test_pattern_decision",
  "plan_pattern_adoption",
  "write_pattern_adr",
  "get_pattern_evidence_plan",
  "query_pattern_graph",
  "diagnose_code_quality",
  "synthesize_pattern_refactoring",
  "generate_architecture_fitness_rules",
] as const;

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

export function registerTools(server: McpServer, intelligence: PatternIntelligence): void {
  server.registerTool(
    TOOL_NAMES[0],
    {
      title: "Prescribe architecture and refactoring blueprint",
      description:
        "Unified architectural prescription engine: performs force diagnosis, anti-cargo-cult evaluation, and generates concrete domain port interfaces, infrastructure adapters, migration seams, and rollback triggers in a single call.",
      inputSchema: prescribeArchitectureInputSchema,
      annotations: READ_ONLY,
    },
    async ({ case: designCase }) => {
      const result = intelligence.prescribe(designCase);
      return toolResult(result, result.markdownSummary);
    },
  );

  server.registerTool(
    TOOL_NAMES[1],
    {
      title: "Refactor code smell into clean architecture",
      description:
        "Analyzes source code for architectural smells (God Class, Dual-Write, Missing Timeout, Leaky Abstraction, Concurrency), computes complexity metrics, and synthesizes refactored Clean Code TypeScript modules.",
      inputSchema: refactorSmellInputSchema,
      annotations: READ_ONLY,
    },
    async ({ code, fileName }) => {
      const result = intelligence.refactorSmell(code, fileName);
      return toolResult(result, result.markdownSummary);
    },
  );

  server.registerTool(
    TOOL_NAMES[2],
    {
      title: "Analyze a design case",
      description:
        "Diagnose forces before prescribing a pattern. Returns questions, transparent scores, rejected patterns, a non-pattern baseline, evidence plans, and a bounded pattern compound. Use this first for an open-ended design problem.",
      inputSchema: analyzeInputSchema,
      annotations: READ_ONLY,
    },
    async ({ case: designCase, maxRecommendations }) =>
      toolResult(
        intelligence.analyze(designCase, maxRecommendations),
        "Design case analyzed with transparent force and cost scoring.",
      ),
  );

  server.registerTool(
    TOOL_NAMES[3],
    {
      title: "Compare pattern options",
      description:
        "Compare two to six named patterns against one concrete case. Returns no winner when evidence is insufficient and states the force that would make each option preferable.",
      inputSchema: compareInputSchema,
      annotations: READ_ONLY,
    },
    async ({ case: designCase, patterns }) => {
      const result = intelligence.compare(designCase, patterns);
      return toolResult(
        result,
        result.winner ? `Contextual winner: ${result.winner}.` : "No decisive winner.",
      );
    },
  );

  server.registerTool(
    TOOL_NAMES[4],
    {
      title: "Detect pattern misuse",
      description:
        "Audit patterns already used or proposed for cargo-cult risk, missing forces, hidden costs, and simpler alternatives. Use during design or code review, not as a generic pattern search.",
      inputSchema: misuseInputSchema,
      annotations: READ_ONLY,
    },
    async ({ case: designCase, patternsInUse }) => {
      const result = intelligence.detectMisuse(designCase, patternsInUse);
      const highRisk = result.filter((finding) => finding.risk === "high").length;
      return toolResult(result, `${highRisk} high-risk misuse finding(s).`);
    },
  );

  server.registerTool(
    TOOL_NAMES[5],
    {
      title: "Stress-test a pattern decision",
      description:
        "Apply explicit counterfactual scenarios - scale, delivery, consistency, team, evidence, or goals - and report when the leading decision flips. Use before committing to expensive architecture.",
      inputSchema: stressTestInputSchema,
      annotations: READ_ONLY,
    },
    async ({ case: designCase, scenarios }) => {
      const result = intelligence.stressTest(designCase, scenarios);
      const changes = result.scenarios.filter((scenario) => scenario.decisionChanged).length;
      return toolResult(
        result,
        `${changes} of ${result.scenarios.length} scenario(s) changed the decision.`,
      );
    },
  );

  server.registerTool(
    TOOL_NAMES[6],
    {
      title: "Plan safe pattern adoption",
      description:
        "Create a reversible, evidence-gated adoption plan for one named pattern. The plan starts with a baseline and smallest production slice and includes exit criteria and rollback.",
      inputSchema: patternDecisionInputSchema,
      annotations: READ_ONLY,
    },
    async ({ case: designCase, pattern }) => {
      const assessment = intelligence.assessPattern(designCase, pattern);
      const result = buildAdoptionPlan(assessment);
      return toolResult(result, `${result.pattern}: ${result.verdict}.`);
    },
  );

  server.registerTool(
    TOOL_NAMES[7],
    {
      title: "Write a pattern ADR",
      description:
        "Generate a proposed architecture decision record from a case. It records considered options, uncertainty, validation metrics, open questions, and reversal triggers rather than pretending the decision is final.",
      inputSchema: adrInputSchema,
      annotations: READ_ONLY,
    },
    async ({ title, case: designCase }) => {
      const analysis = intelligence.analyze(designCase);
      const result = { markdown: buildAdr(title, analysis), analysis };
      return toolResult(result, result.markdown);
    },
  );

  server.registerTool(
    TOOL_NAMES[8],
    {
      title: "Get a pattern evidence plan",
      description:
        "Return the hypothesis, measurements, experiment, rejection criteria, and deletion triggers for one pattern in one case. Use when a recommendation needs proof before implementation.",
      inputSchema: patternDecisionInputSchema,
      annotations: READ_ONLY,
    },
    async ({ case: designCase, pattern }) => {
      const assessment = intelligence.assessPattern(designCase, pattern);
      return toolResult(
        {
          pattern: assessment.pattern.name,
          score: assessment.score,
          plan: assessment.evidencePlan,
        },
        `Evidence plan prepared for ${assessment.pattern.name}.`,
      );
    },
  );

  server.registerTool(
    TOOL_NAMES[9],
    {
      title: "Query the pattern graph",
      description:
        "Traverse contextual candidates and explicit pattern relationships with layer and cost filters. Use for bounded discovery around a problem or seed - not to dump the entire catalog.",
      inputSchema: graphInputSchema,
      annotations: READ_ONLY,
    },
    async (input) => {
      const result = queryGraph(intelligence, input);
      return toolResult(
        result,
        `${result.nodes.length} contextual node(s), ${result.edges.length} relation(s).`,
      );
    },
  );

  server.registerTool(
    TOOL_NAMES[10],
    {
      title: "Diagnose code quality and smells",
      description:
        "Analyze code or architecture snippets for cyclomatic complexity, coupling, cohesion, and architectural smells (God Class, Dual-Write, Missing Timeout, Leaky Abstractions, OCC).",
      inputSchema: codeQualityInputSchema,
      annotations: READ_ONLY,
    },
    async ({ code, fileName }) => {
      const result = intelligence.diagnoseCodeQuality(code, fileName);
      return toolResult(
        result,
        `Diagnosed ${result.smells.length} smell(s) with maintainability index ${result.metrics.maintainabilityIndex}/100.`,
      );
    },
  );

  server.registerTool(
    TOOL_NAMES[11],
    {
      title: "Synthesize pattern refactoring scaffold",
      description:
        "Generate concrete TypeScript refactoring code, domain port interfaces, adapter implementations, step-by-step migration seams, and verification tests.",
      inputSchema: synthesizeRefactoringInputSchema,
      annotations: READ_ONLY,
    },
    async ({ pattern }) => {
      const result = intelligence.synthesizeRefactoring(pattern);
      return toolResult(
        result,
        `Generated ${result.patternName} refactoring scaffold with ${result.files.length} files.`,
      );
    },
  );

  server.registerTool(
    TOOL_NAMES[12],
    {
      title: "Generate architectural fitness rules and tests",
      description:
        "Generates automated ESLint import boundary configurations, Vitest / TS-Arch architectural fitness test suites, and CI verification commands to enforce design boundaries and prevent layer contamination.",
      inputSchema: fitnessRulesInputSchema,
      annotations: READ_ONLY,
    },
    async (input) => {
      const result = intelligence.generateFitnessRules(input);
      return toolResult(result, result.markdownSummary);
    },
  );
}

function toolResult(value: unknown, summary: string) {
  return {
    content: [{ type: "text" as const, text: summary }],
    structuredContent: { result: value },
  };
}
