# Agent Instructions & Guidelines

## Benchmark Freeze Policy (STRICT)
- **The benchmark suite under `benchmarks/` is permanently FROZEN.**
- Do NOT modify `benchmarks/scenarios/maintainability-scenarios.json`, `benchmarks/harness/evaluator.ts`, `benchmarks/harness/runner.ts`, or any evaluation scoring logic.
- All capability improvements must be achieved strictly by refining the MCP server (`src/engine/`, `src/knowledge/`, `src/application/`, `src/mcp/`) and model reasoning.
- Modifying benchmark metrics, evaluation thresholds, or scenario oracles to fit the model is strictly prohibited.

## Architecture & Code Standards
- Single Responsibility Principle (SRP): aim for extreme function brevity (< 10 lines) and high cohesion (LCOM4 = 1).
- Keep file sizes under 200 lines unless domain boundaries require an exception.
- Avoid circular dependencies and ensure zero dead modules.
- Maintain 100% deterministic local TypeScript execution with no external AI API or vector database dependencies.
- Never use the em dash. Always use the plain dash "-".
- Conventional Commits: break changes into minimal, atomic, single-intent commits without adding agent names as co-authors.
