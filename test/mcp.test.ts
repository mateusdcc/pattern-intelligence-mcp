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

  it("serves catalog and templated pattern resources", async () => {
    const resources = await client.listResources();
    const templates = await client.listResourceTemplates();
    const detail = await client.readResource({ uri: "pattern://pattern/strategy" });
    const firstContent = detail.contents[0];

    expect(resources.resources.map((resource) => resource.uri)).toContain("pattern://catalog");
    expect(templates.resourceTemplates.map((template) => template.uriTemplate)).toContain(
      "pattern://pattern/{patternId}",
    );
    expect(firstContent).toMatchObject({ mimeType: "application/json" });
    expect(firstContent && "text" in firstContent ? firstContent.text : "").toContain(
      '"name": "Strategy"',
    );
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
});
