import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import { buildAdoptionPlan, buildAdr, PatternIntelligence, queryGraph } from "../../dist/index.js";
import type { DesignCaseInput, ScenarioMutation } from "../../src/domain/design-case.js";

export default function patternIntelligenceExtension(pi: ExtensionAPI): void {
  const intelligence = new PatternIntelligence();

  // Register hook so agent is instructed to use pattern intelligence on design tasks
  pi.on("before_agent_start", async (_event) => {
    return {
      systemPrompt:
        "CRITICAL ARCHITECTURAL DIRECTIVE: You have access to the Pattern Intelligence MCP tools (`analyze_design_case`, `compare_pattern_options`, `detect_pattern_misuse`, `diagnose_code_quality`, `synthesize_pattern_refactoring`, `write_pattern_adr`). When facing any architectural decisions, refactoring, code quality, design patterns, or evaluating system tradeoffs, ALWAYS call `analyze_design_case`, `diagnose_code_quality`, or `compare_pattern_options` first to extract deterministic forces, complexity penalties, and verify whether a direct solution or pattern is justified with evidence before answering.",
    };
  });

  pi.registerTool({
    name: "analyze_design_case",
    label: "Analyze Design Case",
    description:
      "Diagnose forces before prescribing a design pattern. Returns questions, transparent multi-term scores, rejected patterns, a non-pattern direct baseline, evidence plans, and a bounded pattern compound.",
    promptSnippet:
      "Analyze architectural forces, tradeoffs, and design pattern recommendations for a design case",
    promptGuidelines: [
      "Use analyze_design_case when facing architectural decisions, refactoring options, or deciding whether an abstraction is justified over a direct solution.",
    ],
    parameters: Type.Object({
      case: Type.Object({
        problem: Type.String({ description: "Concrete problem and system context statement" }),
        goals: Type.Optional(Type.Array(Type.String())),
        failureModes: Type.Optional(Type.Array(Type.String())),
        changeAxes: Type.Optional(Type.Array(Type.String())),
        scale: Type.Optional(
          Type.Object({
            throughput: Type.Optional(Type.String()),
            dataVolume: Type.Optional(Type.String()),
            latencyRequirement: Type.Optional(Type.String()),
          }),
        ),
        statefulness: Type.Optional(Type.String()),
        delivery: Type.Optional(Type.String()),
        consistency: Type.Optional(Type.String()),
        concurrency: Type.Optional(Type.String()),
        complexityBudget: Type.Optional(Type.String()),
        riskTolerance: Type.Optional(Type.String()),
        team: Type.Optional(
          Type.Object({
            size: Type.Optional(Type.String()),
            experience: Type.Optional(Type.String()),
            operationsCapacity: Type.Optional(Type.String()),
          }),
        ),
        evidence: Type.Optional(Type.Array(Type.String())),
      }),
      maxRecommendations: Type.Optional(
        Type.Number({ description: "Maximum patterns to return (1-10)" }),
      ),
    }),
    async execute(_id, params) {
      const result = intelligence.analyze(
        params.case as unknown as DesignCaseInput,
        params.maxRecommendations,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: {
          recommendation: result.recommendation,
          topPattern: result.patterns[0]?.pattern?.name,
        },
      };
    },
  });

  pi.registerTool({
    name: "compare_pattern_options",
    label: "Compare Pattern Options",
    description:
      "Compare two to six named design patterns against one concrete case. Returns contextual winner or no winner, plus tipping points.",
    promptSnippet:
      "Compare candidate design patterns against a case to find the best fit and tipping points",
    promptGuidelines: [
      "Use compare_pattern_options when evaluating multiple plausible architectural patterns or competing abstractions.",
    ],
    parameters: Type.Object({
      case: Type.Object({
        problem: Type.String(),
        evidence: Type.Optional(Type.Array(Type.String())),
      }),
      patterns: Type.Array(Type.String(), {
        minItems: 2,
        maxItems: 6,
        description: "Names or IDs of patterns to compare",
      }),
    }),
    async execute(_id, params) {
      const result = intelligence.compare(
        params.case as unknown as DesignCaseInput,
        params.patterns,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: { winner: result.winner },
      };
    },
  });

  pi.registerTool({
    name: "detect_pattern_misuse",
    label: "Detect Pattern Misuse",
    description:
      "Audit patterns already used or proposed for cargo-cult risk, missing forces, hidden costs, and simpler alternatives.",
    promptSnippet:
      "Audit codebase or proposed design for pattern misuse, cargo culting, and over-engineering",
    promptGuidelines: [
      "Use detect_pattern_misuse to check whether complex patterns (e.g. Singleton, CQRS, Event Sourcing, Sagas) are unnecessary or harmful in the given context.",
    ],
    parameters: Type.Object({
      case: Type.Object({
        problem: Type.String(),
        evidence: Type.Optional(Type.Array(Type.String())),
      }),
      patternsInUse: Type.Array(Type.String(), {
        description: "Patterns currently used or proposed",
      }),
    }),
    async execute(_id, params) {
      const result = intelligence.detectMisuse(
        params.case as unknown as DesignCaseInput,
        params.patternsInUse,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: { findingsCount: result.length },
      };
    },
  });

  pi.registerTool({
    name: "stress_test_pattern_decision",
    label: "Stress Test Pattern Decision",
    description:
      "Apply counterfactual scenarios (scale, delivery, consistency, team, evidence) and report when the leading decision flips.",
    promptSnippet:
      "Stress test an architectural decision under changing scale, team, or failure assumptions",
    promptGuidelines: [
      "Use stress_test_pattern_decision before committing to complex architectures to see if the decision holds under scenario changes.",
    ],
    parameters: Type.Object({
      case: Type.Object({
        problem: Type.String(),
        evidence: Type.Optional(Type.Array(Type.String())),
      }),
      scenarios: Type.Array(
        Type.Object({
          name: Type.String(),
          patch: Type.Object({
            problem: Type.Optional(Type.String()),
            scale: Type.Optional(Type.Any()),
            delivery: Type.Optional(Type.String()),
            consistency: Type.Optional(Type.String()),
            evidence: Type.Optional(Type.Array(Type.String())),
          }),
        }),
      ),
    }),
    async execute(_id, params) {
      const result = intelligence.stressTest(
        params.case as unknown as DesignCaseInput,
        params.scenarios as unknown as readonly ScenarioMutation[],
      );
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: {},
      };
    },
  });

  pi.registerTool({
    name: "diagnose_code_quality",
    label: "Diagnose Code Quality",
    description:
      "Analyze code or architecture snippets for cyclomatic complexity, coupling, cohesion, and architectural smells.",
    promptSnippet: "Diagnose code smells, maintainability index, and coupling metrics",
    parameters: Type.Object({
      code: Type.String({ description: "Source code or architecture snippet" }),
      fileName: Type.Optional(Type.String()),
    }),
    async execute(_id, params) {
      const result = intelligence.diagnoseCodeQuality(params.code, params.fileName);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: { maintainabilityIndex: result.metrics.maintainabilityIndex },
      };
    },
  });

  pi.registerTool({
    name: "synthesize_pattern_refactoring",
    label: "Synthesize Pattern Refactoring",
    description:
      "Generate concrete TypeScript refactoring code, domain port interfaces, adapter implementations, and test scaffolds.",
    promptSnippet: "Generate concrete pattern refactoring scaffold and TypeScript implementation",
    parameters: Type.Object({
      pattern: Type.String({ description: "Pattern name to scaffold" }),
    }),
    async execute(_id, params) {
      const result = intelligence.synthesizeRefactoring(params.pattern);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: { filesCount: result.files.length },
      };
    },
  });

  pi.registerTool({
    name: "plan_pattern_adoption",
    label: "Plan Pattern Adoption",
    description:
      "Create a reversible, evidence-gated adoption plan for one named pattern with baseline, smallest production slice, exit criteria, and rollback.",
    promptSnippet: "Create a staged adoption and rollback plan for a design pattern",
    parameters: Type.Object({
      case: Type.Object({
        problem: Type.String(),
        evidence: Type.Optional(Type.Array(Type.String())),
      }),
      pattern: Type.String({ description: "Pattern name or ID" }),
    }),
    async execute(_id, params) {
      const assessment = intelligence.assessPattern(
        params.case as unknown as DesignCaseInput,
        params.pattern,
      );
      const result = buildAdoptionPlan(assessment);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: { verdict: result.verdict },
      };
    },
  });

  pi.registerTool({
    name: "write_pattern_adr",
    label: "Write Pattern ADR",
    description:
      "Generate an Architecture Decision Record (ADR) from a case, recording options, uncertainty, validation metrics, open questions, and reversal triggers.",
    promptSnippet:
      "Generate an Architecture Decision Record (ADR) with reversal triggers and tradeoff rationale",
    parameters: Type.Object({
      title: Type.String({ description: "ADR Title" }),
      case: Type.Object({
        problem: Type.String(),
        evidence: Type.Optional(Type.Array(Type.String())),
      }),
    }),
    async execute(_id, params) {
      const analysis = intelligence.analyze(params.case as unknown as DesignCaseInput);
      const markdown = buildAdr(params.title, analysis);
      return {
        content: [{ type: "text", text: markdown }],
        details: { title: params.title },
      };
    },
  });

  pi.registerTool({
    name: "get_pattern_evidence_plan",
    label: "Get Pattern Evidence Plan",
    description:
      "Return the hypothesis, measurements, experiment, rejection criteria, and deletion triggers for one pattern in one case.",
    promptSnippet: "Get verification hypotheses, measures, and deletion triggers for a pattern",
    parameters: Type.Object({
      case: Type.Object({
        problem: Type.String(),
        evidence: Type.Optional(Type.Array(Type.String())),
      }),
      pattern: Type.String({ description: "Pattern name or ID" }),
    }),
    async execute(_id, params) {
      const assessment = intelligence.assessPattern(
        params.case as unknown as DesignCaseInput,
        params.pattern,
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                pattern: assessment.pattern.name,
                score: assessment.score,
                plan: assessment.evidencePlan,
              },
              null,
              2,
            ),
          },
        ],
        details: {},
      };
    },
  });

  pi.registerTool({
    name: "query_pattern_graph",
    label: "Query Pattern Graph",
    description:
      "Traverse contextual candidates and explicit pattern relationships with layer and cost filters.",
    promptSnippet:
      "Query bounded design pattern relationships and layer filters across the 110-pattern knowledge graph",
    parameters: Type.Object({
      seedPattern: Type.Optional(Type.String()),
      layer: Type.Optional(Type.String()),
      maxCost: Type.Optional(Type.String()),
      force: Type.Optional(Type.String()),
      limit: Type.Optional(Type.Number()),
    }),
    async execute(_id, params) {
      const result = queryGraph(intelligence, {
        seedPatterns: params.seedPattern ? [params.seedPattern] : undefined,
        limit: params.limit,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: { nodeCount: result.nodes.length, edgeCount: result.edges.length },
      };
    },
  });
}
