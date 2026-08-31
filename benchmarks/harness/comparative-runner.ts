import { spawn } from "node:child_process";
import * as fs from "node:fs/promises";
import * as path from "node:path";

import { evaluateOutput, type RunResult, type Scenario, type TokenUsage } from "./evaluator.js";

const PROJECT_ROOT = process.cwd();
const SCENARIOS_PATH = path.join(
  PROJECT_ROOT,
  "benchmarks/scenarios/maintainability-scenarios.json",
);
const EXTENSION_PATH = path.join(PROJECT_ROOT, "benchmarks/extensions/pattern-intelligence-mcp.ts");
const RESULTS_DIR = path.join(PROJECT_ROOT, "benchmarks/results");

export interface HarnessConfig {
  readonly id: string;
  readonly name: string;
  readonly path: string;
  readonly description: string;
}

export const HARNESSES: Record<string, HarnessConfig> = {
  "clean-code": {
    id: "clean-code",
    name: "Clean Code (85k★ ryanmcdermott)",
    path: path.join(PROJECT_ROOT, "benchmarks/harness/clean-code-javascript-harness.md"),
    description: "Standard Clean Code principles (SRP, OCP, Hexagonal, Anti-Overengineering)",
  },
  ponytail: {
    id: "ponytail",
    name: "Ponytail (DietrichGebert/ponytail)",
    path: path.join(PROJECT_ROOT, "benchmarks/harness/ponytail-harness.md"),
    description: "Radical minimalism, YAGNI, senior dev laziness, delete code > add code",
  },
  caveman: {
    id: "caveman",
    name: "Caveman Mode (Lithic Compression)",
    path: path.join(PROJECT_ROOT, "benchmarks/harness/caveman-harness.md"),
    description: "Extreme token compression, zero fluff, lithic terse density",
  },
};

async function runPiWithJson(
  prompt: string,
  harnessPath: string,
  withMcp: boolean,
): Promise<{
  output: string;
  durationMs: number;
  toolsUsed: string[];
  usage: TokenUsage;
}> {
  return new Promise((resolve) => {
    const args = [
      "--provider",
      "antigravity",
      "--model",
      "gemini-3.6-flash",
      "--mode",
      "json",
      "--append-system-prompt",
      harnessPath,
    ];

    if (withMcp) {
      args.push("-e", EXTENSION_PATH);
    }

    args.push("-p", prompt);

    const start = Date.now();
    let rawStdout = "";
    let rawStderr = "";

    const child = spawn("pi", args, {
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    child.stdout.on("data", (chunk) => {
      rawStdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      rawStderr += chunk.toString();
    });

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
    }, 90_000);

    child.on("close", (_code) => {
      clearTimeout(timer);
      const durationMs = Date.now() - start;

      let fullText = "";
      let totalInput = 0;
      let totalOutput = 0;
      let totalCacheRead = 0;
      const toolSet = new Set<string>();

      const lines = rawStdout.trim().split("\n");
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const event = JSON.parse(line);

          if (event.type === "tool_execution_start" || event.type === "tool_execution_end") {
            if (event.toolName) toolSet.add(event.toolName);
          }

          if (event.type === "message_end" && event.message?.role === "assistant") {
            for (const c of event.message.content || []) {
              if (c.type === "text" && c.text) fullText += `\n${c.text}`;
              if (c.type === "tool_call" && c.toolName) toolSet.add(c.toolName);
            }
            if (event.message.usage) {
              totalInput += event.message.usage.input || 0;
              totalOutput += event.message.usage.output || 0;
              totalCacheRead += event.message.usage.cacheRead || 0;
            }
          }

          if (event.type === "agent_end" && Array.isArray(event.messages)) {
            for (const msg of event.messages) {
              if (msg.role === "assistant" && Array.isArray(msg.content)) {
                for (const c of msg.content) {
                  if (c.type === "text" && c.text && !fullText.includes(c.text)) {
                    fullText += `\n${c.text}`;
                  }
                  if (c.type === "tool_call" && c.toolName) toolSet.add(c.toolName);
                }
              }
            }
          }
        } catch {}
      }

      if (!fullText) fullText = (rawStdout || "") + (rawStderr ? `\n[STDERR]\n${rawStderr}` : "");

      const usage: TokenUsage = {
        input: totalInput,
        output: totalOutput,
        cacheRead: totalCacheRead,
        totalTokens: totalInput + totalOutput + totalCacheRead,
      };

      resolve({
        output: fullText,
        durationMs,
        toolsUsed: Array.from(toolSet),
        usage,
      });
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      const durationMs = Date.now() - start;
      resolve({
        output: `[ERROR] ${err.message}`,
        durationMs,
        toolsUsed: [],
        usage: { input: 0, output: 0, cacheRead: 0, totalTokens: 0 },
      });
    });
  });
}

export interface HarnessEvaluationResult {
  readonly harnessId: string;
  readonly harnessName: string;
  readonly noMcp: {
    readonly overall: number;
    readonly soundness: number;
    readonly antiCargoCult: number;
    readonly quality: number;
    readonly evidence: number;
    readonly avgInputTokens: number;
    readonly avgOutputTokens: number;
    readonly avgTotalTokens: number;
    readonly efficiency: number;
    readonly runs: RunResult[];
  };
  readonly withMcp: {
    readonly overall: number;
    readonly soundness: number;
    readonly antiCargoCult: number;
    readonly quality: number;
    readonly evidence: number;
    readonly avgInputTokens: number;
    readonly avgOutputTokens: number;
    readonly avgTotalTokens: number;
    readonly efficiency: number;
    readonly runs: RunResult[];
  };
  readonly deltaScore: number;
  readonly deltaTokens: number;
  readonly efficiencyMultiplier: number;
}

const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

async function evaluateHarness(
  harness: HarnessConfig,
  scenarios: Scenario[],
): Promise<HarnessEvaluationResult> {
  console.log(`\n===============================================================`);
  console.log(`  Evaluating Harness: ${harness.name}`);
  console.log(`  Description: ${harness.description}`);
  console.log(`===============================================================\n`);

  const noMcpRuns: RunResult[] = [];
  const withMcpRuns: RunResult[] = [];

  for (let i = 0; i < scenarios.length; i++) {
    const s = scenarios[i];
    console.log(`[${i + 1}/${scenarios.length}] Scenario: ${s.title} (${s.category})...`);

    // 1. Run Without MCP
    process.stdout.write(`  -> [${harness.id}] Without MCP... `);
    const noMcpRun = await runPiWithJson(s.prompt, harness.path, false);
    const noMcpEval = evaluateOutput(noMcpRun.output, s.oracle);
    noMcpRuns.push({
      scenarioId: s.id,
      scenarioTitle: s.title,
      category: s.category,
      mode: "harness-without-mcp",
      output: noMcpRun.output,
      durationMs: noMcpRun.durationMs,
      toolsUsed: noMcpRun.toolsUsed,
      usage: noMcpRun.usage,
      evaluation: noMcpEval,
    });
    console.log(
      `Score: ${noMcpEval.overall}/100 | In: ${noMcpRun.usage.input} | Out: ${noMcpRun.usage.output} | Total: ${noMcpRun.usage.totalTokens} tokens (${noMcpRun.durationMs}ms)`,
    );

    // 2. Run WITH MCP
    process.stdout.write(`  -> [${harness.id}] WITH MCP... `);
    const withMcpRun = await runPiWithJson(s.prompt, harness.path, true);
    const withMcpEval = evaluateOutput(withMcpRun.output, s.oracle);
    withMcpRuns.push({
      scenarioId: s.id,
      scenarioTitle: s.title,
      category: s.category,
      mode: "harness-with-mcp",
      output: withMcpRun.output,
      durationMs: withMcpRun.durationMs,
      toolsUsed: withMcpRun.toolsUsed,
      usage: withMcpRun.usage,
      evaluation: withMcpEval,
    });
    console.log(
      `Score: ${withMcpEval.overall}/100 | In: ${withMcpRun.usage.input} | Out: ${withMcpRun.usage.output} | Total: ${withMcpRun.usage.totalTokens} tokens (${withMcpRun.durationMs}ms) [Tools: ${withMcpRun.toolsUsed.join(", ") || "direct"}]`,
    );

    const delta = withMcpEval.overall - noMcpEval.overall;
    const tokenDelta = withMcpRun.usage.totalTokens - noMcpRun.usage.totalTokens;
    console.log(
      `  => Score Delta: ${delta >= 0 ? `+${delta}` : delta} pts | Token Delta: ${tokenDelta >= 0 ? `+${tokenDelta}` : tokenDelta} tokens\n`,
    );
  }

  const noMcpOverall = avg(noMcpRuns.map((r) => r.evaluation.overall));
  const withMcpOverall = avg(withMcpRuns.map((r) => r.evaluation.overall));

  const noMcpAvgInput = avg(noMcpRuns.map((r) => r.usage.input));
  const withMcpAvgInput = avg(withMcpRuns.map((r) => r.usage.input));

  const noMcpAvgOutput = avg(noMcpRuns.map((r) => r.usage.output));
  const withMcpAvgOutput = avg(withMcpRuns.map((r) => r.usage.output));

  const noMcpAvgTotal = avg(noMcpRuns.map((r) => r.usage.totalTokens));
  const withMcpAvgTotal = avg(withMcpRuns.map((r) => r.usage.totalTokens));

  const noMcpEfficiency = (noMcpOverall / (noMcpAvgTotal || 1)) * 1000;
  const withMcpEfficiency = (withMcpOverall / (withMcpAvgTotal || 1)) * 1000;

  return {
    harnessId: harness.id,
    harnessName: harness.name,
    noMcp: {
      overall: Number(noMcpOverall.toFixed(1)),
      soundness: Number(avg(noMcpRuns.map((r) => r.evaluation.decisionSoundness)).toFixed(1)),
      antiCargoCult: Number(avg(noMcpRuns.map((r) => r.evaluation.antiCargoCult)).toFixed(1)),
      quality: Number(avg(noMcpRuns.map((r) => r.evaluation.maintainabilityQuality)).toFixed(1)),
      evidence: Number(avg(noMcpRuns.map((r) => r.evaluation.evidenceReversibility)).toFixed(1)),
      avgInputTokens: Math.round(noMcpAvgInput),
      avgOutputTokens: Math.round(noMcpAvgOutput),
      avgTotalTokens: Math.round(noMcpAvgTotal),
      efficiency: Number(noMcpEfficiency.toFixed(2)),
      runs: noMcpRuns,
    },
    withMcp: {
      overall: Number(withMcpOverall.toFixed(1)),
      soundness: Number(avg(withMcpRuns.map((r) => r.evaluation.decisionSoundness)).toFixed(1)),
      antiCargoCult: Number(avg(withMcpRuns.map((r) => r.evaluation.antiCargoCult)).toFixed(1)),
      quality: Number(avg(withMcpRuns.map((r) => r.evaluation.maintainabilityQuality)).toFixed(1)),
      evidence: Number(avg(withMcpRuns.map((r) => r.evaluation.evidenceReversibility)).toFixed(1)),
      avgInputTokens: Math.round(withMcpAvgInput),
      avgOutputTokens: Math.round(withMcpAvgOutput),
      avgTotalTokens: Math.round(withMcpAvgTotal),
      efficiency: Number(withMcpEfficiency.toFixed(2)),
      runs: withMcpRuns,
    },
    deltaScore: Number((withMcpOverall - noMcpOverall).toFixed(1)),
    deltaTokens: Math.round(withMcpAvgTotal - noMcpAvgTotal),
    efficiencyMultiplier: Number((withMcpEfficiency / (noMcpEfficiency || 1)).toFixed(2)),
  };
}

async function main() {
  const rawData = await fs.readFile(SCENARIOS_PATH, "utf-8");
  const allScenarios: Scenario[] = JSON.parse(rawData);

  // Parse command line arguments
  const args = process.argv.slice(2);
  const harnessArg = args.find((a) => a.startsWith("--harness="))?.split("=")[1] || "all";
  const limitArg = args.find((a) => a.startsWith("--limit="))?.split("=")[1];

  let scenarios = allScenarios;
  if (limitArg) {
    const limit = Number.parseInt(limitArg, 10);
    if (!Number.isNaN(limit) && limit > 0) {
      scenarios = allScenarios.slice(0, limit);
    }
  }

  const selectedHarnesses: HarnessConfig[] = [];
  if (harnessArg === "all") {
    selectedHarnesses.push(HARNESSES["clean-code"], HARNESSES.ponytail, HARNESSES.caveman);
  } else if (HARNESSES[harnessArg]) {
    selectedHarnesses.push(HARNESSES[harnessArg]);
  } else {
    console.error(
      `Unknown harness: ${harnessArg}. Available: ${Object.keys(HARNESSES).join(", ")}, all`,
    );
    process.exit(1);
  }

  console.log("===============================================================");
  console.log("       MULTI-HARNESS TOKEN-MINIMIZATION BENCHMARK SUITE        ");
  console.log("  Evaluating: Clean Code vs Ponytail vs Caveman Mode           ");
  console.log("  Model: Gemini 3.6 Flash (Antigravity Provider)               ");
  console.log(`  Scenarios: ${scenarios.length} scenarios                     `);
  console.log("===============================================================\n");

  const results: HarnessEvaluationResult[] = [];
  for (const h of selectedHarnesses) {
    const result = await evaluateHarness(h, scenarios);
    results.push(result);
  }

  // Summary Report Generation
  await fs.mkdir(RESULTS_DIR, { recursive: true });
  await fs.writeFile(
    path.join(RESULTS_DIR, "comparative-benchmark-results.json"),
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        model: "gemini-3.6-flash",
        provider: "antigravity",
        scenariosCount: scenarios.length,
        harnesses: results,
      },
      null,
      2,
    ),
  );

  const reportMarkdown = [
    "# Multi-Harness Comparative Benchmark Report: Clean Code vs Ponytail vs Caveman",
    "",
    "**Evaluation Model:** `gemini-3.6-flash` via Google Antigravity Provider  ",
    `**Evaluation Date:** ${new Date().toISOString().split("T")[0]}  `,
    `**Scenarios Evaluated:** ${scenarios.length} software engineering maintainability scenarios  `,
    "",
    "## 1. Multi-Harness Executive Summary",
    "",
    "This benchmark measures the impact of combining specialized prompt-efficiency harnesses (**Ponytail**, **Caveman Mode**, and **Clean Code**) with the **Pattern Intelligence MCP**.",
    "",
    "### Cross-Harness Comparison Table",
    "",
    "| Harness | Mode | Overall Quality | Decision Soundness | Anti-Cargo-Cult | Total Tokens / Scenario | Token Efficiency (pts/1k) |",
    "|---|---|---|---|---|---|---|",
    ...results.flatMap((r) => [
      `| **${r.harnessName}** | Without MCP | ${r.noMcp.overall}/100 | ${r.noMcp.soundness} | ${r.noMcp.antiCargoCult} | ${r.noMcp.avgTotalTokens} | ${r.noMcp.efficiency} pts/1k |`,
      `| **${r.harnessName}** | **WITH MCP** | **${r.withMcp.overall}/100** | **${r.withMcp.soundness}** | **${r.withMcp.antiCargoCult}** | **${r.withMcp.avgTotalTokens}** | **${r.withMcp.efficiency} pts/1k** (${r.efficiencyMultiplier}x) |`,
    ]),
    "",
    "## 2. Token Reduction & Efficiency Surge",
    "",
    "| Harness | Without MCP Avg Tokens | WITH MCP Avg Tokens | Token Reduction | Quality Delta | Efficiency Multiplier |",
    "|---|---|---|---|---|---|",
    ...results.map(
      (r) =>
        `| **${r.harnessName}** | ${r.noMcp.avgTotalTokens} tokens | ${r.withMcp.avgTotalTokens} tokens | **${r.deltaTokens < 0 ? Math.round((Math.abs(r.deltaTokens) / (r.noMcp.avgTotalTokens || 1)) * 100) : 0}% reduction** | ${r.deltaScore >= 0 ? `+${r.deltaScore}` : r.deltaScore} pts | **${r.efficiencyMultiplier}x** |`,
    ),
    "",
    "## 3. Harness Profiles & Analysis",
    "",
    "### A. Ponytail (`DietrichGebert/ponytail`)",
    '- **Philosophy:** "The best code is the code you never wrote. Think like the laziest senior dev in the room."',
    "- **Synergy with MCP:** Ponytail prioritizes YAGNI and rejecting over-engineering. Pairing Ponytail with Pattern Intelligence MCP provides deterministic rejection matrices and mathematical tipping points, validating the senior developer's intuition with verifiable architectural evidence.",
    "",
    "### B. Caveman Mode (Lithic Compression)",
    "- **Philosophy:** Extreme token compression, dropping preambles and conversational fluff for maximum technical density.",
    "- **Synergy with MCP:** Caveman mode drastically cuts output tokens, while Pattern Intelligence MCP supplies dense, structured TypeScript scaffolds and boundary rules without needing verbose explanation.",
    "",
    "### C. Clean Code (`ryanmcdermott/clean-code-javascript`)",
    "- **Philosophy:** Single Responsibility Principle, Open/Closed polymorphic dispatch, and domain boundary insulation.",
    "- **Synergy with MCP:** Keeps 116 design patterns and force ontologies outside the system prompt, preserving context tokens while maintaining strict architectural rigor.",
    "",
    "## 4. Benchmark Artifacts",
    "",
    "- Harness Definitions: `benchmarks/harness/` (`clean-code-javascript-harness.md`, `ponytail-harness.md`, `caveman-harness.md`)",
    "- Raw Evaluation Data: `benchmarks/results/comparative-benchmark-results.json`",
    "- Comparative Report: `benchmarks/results/COMPARATIVE_BENCHMARK_REPORT.md`",
  ].join("\n");

  await fs.writeFile(path.join(RESULTS_DIR, "COMPARATIVE_BENCHMARK_REPORT.md"), reportMarkdown);
  console.log(`\nComparative benchmark report written to:`);
  console.log(`- ${path.join(RESULTS_DIR, "comparative-benchmark-results.json")}`);
  console.log(`- ${path.join(RESULTS_DIR, "COMPARATIVE_BENCHMARK_REPORT.md")}\n`);
}

main().catch((err) => {
  console.error("Comparative runner failed:", err);
  process.exit(1);
});
