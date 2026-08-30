#!/usr/bin/env node

import { serveStdio } from "@modelcontextprotocol/server/stdio";

import { createServer } from "./mcp/server.js";

const handle = serveStdio(createServer, {
  onerror: (error) => process.stderr.write(`[pattern-intelligence-mcp] ${error.message}\n`),
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void handle.close().finally(() => process.exit(0));
  });
}
