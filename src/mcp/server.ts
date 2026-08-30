import { McpServer } from "@modelcontextprotocol/server";

import { PatternIntelligence } from "../application/pattern-intelligence.js";
import { SERVER_NAME, SERVER_VERSION } from "../version.js";
import { registerPrompts } from "./prompts.js";
import { registerResources } from "./resources.js";
import { registerTools } from "./tools.js";

export function createServer(): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      instructions:
        "Use analyze_design_case before selecting patterns. Treat recommendations as hypotheses, preserve uncertainty, consider a direct solution, and validate expensive patterns with evidence and counterfactual stress tests.",
    },
  );
  const intelligence = new PatternIntelligence();

  registerTools(server, intelligence);
  registerResources(server, intelligence);
  registerPrompts(server);
  return server;
}
