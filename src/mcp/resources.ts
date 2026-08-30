import { type McpServer, ResourceTemplate } from "@modelcontextprotocol/server";

import type { PatternIntelligence } from "../application/pattern-intelligence.js";
import { patternLayerSchema } from "../domain/pattern.js";
import { CONCEPT_RULES } from "../knowledge/ontology.js";

export function registerResources(server: McpServer, intelligence: PatternIntelligence): void {
  server.registerResource(
    "pattern-catalog",
    "pattern://catalog",
    {
      title: "Design pattern catalog",
      description:
        "Compact index of all patterns; read an individual pattern for full decision data.",
      mimeType: "application/json",
    },
    async (uri) => ({
      contents: [jsonResource(uri.href, intelligence.store.all().map(patternSummary))],
    }),
  );

  server.registerResource(
    "decision-ontology",
    "pattern://ontology",
    {
      title: "Pattern decision ontology",
      description: "Force concepts and their positive and negative pattern relationships.",
      mimeType: "application/json",
    },
    async (uri) => ({ contents: [jsonResource(uri.href, CONCEPT_RULES)] }),
  );

  server.registerResource(
    "pattern-detail",
    new ResourceTemplate("pattern://pattern/{patternId}", {
      list: undefined,
      complete: {
        patternId: (value) =>
          intelligence.store
            .all()
            .map((pattern) => pattern.id)
            .filter((id) => id.startsWith(value))
            .slice(0, 30),
      },
    }),
    {
      title: "Pattern detail",
      description: "Full pattern forces, mechanism, costs, misuse, evidence, and graph relations.",
      mimeType: "application/json",
    },
    async (uri, variables) => {
      const patternId = String(variables.patternId);
      const pattern = intelligence.store.require(patternId);
      return { contents: [jsonResource(uri.href, pattern)] };
    },
  );

  server.registerResource(
    "pattern-layer",
    new ResourceTemplate("pattern://layer/{layer}", {
      list: undefined,
      complete: {
        layer: (value) =>
          patternLayerSchema.options.filter((layer) => layer.startsWith(value)).slice(0, 20),
      },
    }),
    {
      title: "Patterns by layer",
      description: "Pattern summaries within one abstraction layer.",
      mimeType: "application/json",
    },
    async (uri, variables) => {
      const layer = patternLayerSchema.parse(String(variables.layer));
      return {
        contents: [jsonResource(uri.href, intelligence.store.byLayer(layer).map(patternSummary))],
      };
    },
  );
}

function patternSummary(pattern: ReturnType<PatternIntelligence["store"]["require"]>) {
  return {
    id: pattern.id,
    name: pattern.name,
    layer: pattern.layer,
    problem: pattern.problem,
    adoptionCost: pattern.adoptionCost,
    operationalCost: pattern.operationalCost,
  };
}

function jsonResource(uri: string, value: unknown) {
  return {
    uri,
    mimeType: "application/json",
    text: JSON.stringify(value, null, 2),
  };
}
