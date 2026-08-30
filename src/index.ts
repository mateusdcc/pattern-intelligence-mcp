#!/usr/bin/env node

export {
  type AdoptionPlan,
  buildAdoptionPlan,
  buildAdr,
  type GraphQueryResult,
  queryGraph,
} from "./application/decision-artifacts.js";
export { PatternIntelligence } from "./application/pattern-intelligence.js";
export { createServer } from "./mcp/server.js";
export { SERVER_NAME, SERVER_VERSION } from "./version.js";
