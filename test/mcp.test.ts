import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createServer } from "../src/mcp/server.js";
import { TOOL_NAMES } from "../src/mcp/tools.js";

describe("MCP surface", () => {
  const server = createServer();
  const client = new Client({ name: "protocol-test", version: "1.0.0" });

  beforeAll(async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
  });

  afterAll(async () => {
    await client.close();
    await server.close();
  });

  it("lists tools in deterministic decision order", async () => {
    const { tools } = await client.listTools();

    expect(tools.map((tool) => tool.name)).toEqual(TOOL_NAMES);
    expect(tools.every((tool) => tool.annotations?.readOnlyHint)).toBe(true);
  });

  it("invokes an analysis through the protocol", async () => {
    const result = await client.callTool({
      name: "analyze_design_case",
      arguments: {
        case: {
          problem:
            "A carrier API has an incompatible interface and leaks vendor models into checkout.",
          evidence: ["three provider-specific imports cross the domain boundary"],
        },
      },
    });
    const payload = (
      result.structuredContent as
        | { result: { patterns: Array<{ pattern: { id: string } }> } }
        | undefined
    )?.result;

    expect(result.isError).not.toBe(true);
    expect(payload?.patterns[0]?.pattern.id).toMatch(/adapter|anti-corruption-layer/);
  });

  it("executes every decision workflow tool", async () => {
    const designCase = {
      problem: "Multiple pricing algorithms vary at runtime while checkout flow remains stable.",
      changeAxes: ["pricing policy"],
      evidence: ["policies changed fourteen times this quarter"],
    };
    const calls = [
      {
        name: "prescribe_architecture",
        arguments: { case: designCase },
      },
      {
        name: "refactor_code_smell",
        arguments: { code: "async function calc(x) { return x * 2; }", fileName: "calc.ts" },
      },
      {
        name: "compare_pattern_options",
        arguments: { case: designCase, patterns: ["Strategy", "Template Method"] },
      },
      {
        name: "detect_pattern_misuse",
        arguments: { case: designCase, patternsInUse: ["Singleton", "Strategy"] },
      },
      {
        name: "stress_test_pattern_decision",
        arguments: {
          case: designCase,
          scenarios: [
            {
              name: "behavior becomes fixed",
              patch: {
                problem: "One fixed pricing calculation has no expected axis of variation.",
                evidence: ["the rule has not changed in three years"],
              },
            },
          ],
        },
      },
      {
        name: "plan_pattern_adoption",
        arguments: { case: designCase, pattern: "Strategy" },
      },
      {
        name: "write_pattern_adr",
        arguments: { title: "Select pricing behavior", case: designCase },
      },
      {
        name: "get_pattern_evidence_plan",
        arguments: { case: designCase, pattern: "Strategy" },
      },
      {
        name: "query_pattern_graph",
        arguments: { text: designCase.problem, seedPatterns: ["Strategy"], limit: 8 },
      },
      {
        name: "diagnose_code_quality",
        arguments: { code: "class Svc { execute() {} }", fileName: "svc.ts" },
      },
      {
        name: "synthesize_pattern_refactoring",
        arguments: { pattern: "Transactional Outbox" },
      },
      {
        name: "generate_architecture_fitness_rules",
        arguments: { patternName: "Ports & Adapters", framework: "vitest" },
      },
    ] as const;

    for (const call of calls) {
      const result = await client.callTool(call);
      expect(result.isError, call.name).not.toBe(true);
      expect(result.structuredContent, call.name).toHaveProperty("result");
    }
  });

  it("serves catalog and templated pattern resources", async () => {
    const resources = await client.listResources();
    const templates = await client.listResourceTemplates();
    const detail = await client.readResource({ uri: "pattern://pattern/strategy" });
    const layer = await client.readResource({ uri: "pattern://layer/testing" });
    const firstContent = detail.contents[0];

    expect(resources.resources.map((resource) => resource.uri)).toContain("pattern://catalog");
    expect(templates.resourceTemplates.map((template) => template.uriTemplate)).toContain(
      "pattern://pattern/{patternId}",
    );
    expect(firstContent).toMatchObject({ mimeType: "application/json" });
    expect(firstContent && "text" in firstContent ? firstContent.text : "").toContain(
      '"name": "Strategy"',
    );
    expect(
      layer.contents[0] && "text" in layer.contents[0] ? layer.contents[0].text : "",
    ).toContain('"name": "Contract Test"');
  });

  it("returns workflow prompts that direct intelligent tool use", async () => {
    const prompts = await client.listPrompts();
    const result = await client.getPrompt({
      name: "safe-refactor",
      arguments: {
        problem: "A global registry leaks mutable state across tests.",
        proposedPattern: "Singleton",
      },
    });

    expect(prompts.prompts.map((prompt) => prompt.name)).toContain("architecture-decision");
    expect(result.messages[0]?.content).toMatchObject({ type: "text" });
    expect(
      result.messages[0]?.content.type === "text" ? result.messages[0].content.text : "",
    ).toContain("detect_pattern_misuse");
  });

  it("generates architectural fitness rules via MCP tool call", async () => {
    const result = await client.callTool({
      name: "generate_architecture_fitness_rules",
      arguments: {
        patternName: "Ports & Adapters",
        framework: "vitest",
      },
    });

    expect(result.isError).not.toBe(true);
    const content = result.structuredContent as
      | {
          result: {
            patternName: string;
            eslintRules: { config: string };
            files: unknown[];
            ciCommands: { commands: string[] };
          };
        }
      | undefined;
    expect(content?.result.patternName).toContain("Ports & Adapters");
    expect(content?.result.eslintRules.config).toContain(
      "@typescript-eslint/no-restricted-imports",
    );
    expect(content?.result.files.length).toBeGreaterThanOrEqual(3);
    expect(content?.result.ciCommands.commands.length).toBeGreaterThanOrEqual(1);
  });
});
