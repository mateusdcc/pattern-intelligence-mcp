# Pattern Intelligence MCP

Deterministic architectural decision engine, TypeScript refactoring synthesizer, and automated fitness governance for AI coding agents.

Most pattern tools are searchable glossaries or static prompts. **Pattern Intelligence MCP** is a full-fledged local architectural intelligence platform: it diagnoses system forces, penalizes unjustified complexity, recommends direct baselines when appropriate, synthesizes complete production TypeScript scaffolds, and generates automated CI/CD architectural fitness rules.

It is implemented in strict TypeScript with 100% deterministic local execution (zero model API, vector database, or external network dependencies) and speaks the Model Context Protocol through the official SDK.

---

## Why Use Pattern Intelligence MCP?

### 1. Stopping Context Bloat in Multi-Turn Agents
Prompt-heavy frameworks inject tens of thousands of tokens into context on every turn, causing severe attention dilution and bloating token costs. **Pattern Intelligence MCP** keeps 116 design patterns, AST analyzers, and force ontologies **outside the context window**, delivering exact blueprints and TypeScript scaffolds on demand.

### 2. From Abstract Advice to Executable Code & Governance
Where standard LLMs or prompt skills offer conversational opinions, Pattern Intelligence MCP generates:
- **Executable TypeScript Scaffolds:** Ready-to-use domain ports, infrastructure adapters, outbox tables, and saga coordinators.
- **Deterministic AST Smell & Complexity Analysis:** Exact Cyclomatic Complexity, Cohesion (LCOM4), Module Instability ($I = \frac{C_e}{C_a + C_e}$), Dual-Write hazard detection, and missing timeout detection.
- **Anti-Cargo-Cult Rejection Matrices:** Quantified tipping points (e.g. `> 5,000 writes/sec`, `> 15 engineers`) that mathematically justify when complex patterns are warranted versus when to keep direct baselines.
- **Automated CI Architecture Fitness Rules:** Auto-generated ESLint boundary constraints (`@typescript-eslint/no-restricted-imports`) and automated TS-Arch/Vitest test suites to enforce architectural boundaries in CI.

---

## Core Capabilities

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       Pattern Intelligence MCP Engine                   │
├─────────────────────────┬──────────────────────────┬────────────────────┤
│   Decision & Strategy   │  Scaffolding & Smells    │ Governance & Graph │
├─────────────────────────┼──────────────────────────┼────────────────────┤
│ • Force Scoring Engine  │ • AST Code Analyzer      │ • Fitness Rules    │
│ • Rejection Matrices    │ • LCOM4 & Complexity     │ • ESLint Enforcer  │
│ • Quantitative Triggers │ • Dual-Write Detector    │ • Typed Edge Graph │
│ • Compound Topologies   │ • TypeScript Scaffolds   │ • ADR Generator    │
└─────────────────────────┴──────────────────────────┴────────────────────┘
```

### A. Multi-Pattern Compound Topologies
Solves real-world distributed challenges by intelligently assembling multi-pattern topologies:
- **Dual-Write Consistency:** Transactional Outbox + Idempotent Receiver + Change Data Capture (CDC Relay).
- **Dependency Resilience:** Circuit Breaker + Bulkhead + Bounded Timeout + Retry with Jitter + Fallback Router.
- **Third-Party Isolation:** Ports & Adapters (Hexagonal) + Anti-Corruption Layer (ACL) + Strategy Dispatch.
- **Distributed Workflows:** Saga Orchestrator + Compensating Transaction Handler + Outbox Step Dispatcher.
- **Safe Monolith Migration:** Strangler Fig + Branch by Abstraction + Dark Launching Shadow Taps + Canary Fallback.

### B. Deterministic AST Smell & Code Quality Analysis
Parses source code into local AST structures to compute:
- **Cyclomatic & Cognitive Complexity:** Branch, loop, and conditional operator counting.
- **Cohesion of Methods (LCOM4):** Method-variable connectivity graphs to pinpoint God Classes.
- **Package Coupling & Instability:** Afferent ($C_a$) and Efferent ($C_e$) coupling metrics.
- **Dual-Write AST Scanner:** Spots database updates followed by network/broker calls within uncommitted scopes.

### C. Architectural Fitness Function Generator (`generate_architecture_fitness_rules`)
Automates architectural governance by exporting:
- ESLint boundary configurations preventing core domain modules from importing infrastructure, ORMs, or vendor SDKs.
- Automated Vitest fitness test suites that fail CI builds if unauthorized cross-layer dependencies are introduced.

---

## MCP Tool Surface

| Tool | Purpose | Distinguishing Output |
|---|---|---|
| `prescribe_architecture` | Unified one-shot blueprint | Domain ports, infrastructure adapters, rollout seams, and rollback triggers. |
| `refactor_code_smell` | AST smell refactoring | AST metrics, before/after complexity delta, and refactored TypeScript code. |
| `generate_architecture_fitness_rules` | CI/CD architectural governance | ESLint layer boundary configs, Vitest TS-Arch suites, and CI bash commands. |
| `diagnose_code_quality` | Static code metrics | Cyclomatic Complexity, LCOM4 cohesion score, Afferent/Efferent coupling, and Instability. |
| `synthesize_pattern_refactoring` | Scaffolding generation | Full multi-file TypeScript implementations with contract verification test suites. |
| `analyze_design_case` | Open-ended force diagnosis | Transparent multi-term scores, rejected patterns, direct baselines, and compounds. |
| `compare_pattern_options` | 2-to-6 option evaluation | Trade-off comparison matrix, non-winner declarations, and force tipping points. |
| `detect_pattern_misuse` | Anti-cargo-cult detection | Rejection matrix, premature complexity warnings, and quantitative tipping points. |
| `stress_test_pattern_decision` | Sensitivity analysis | Decision flip conditions under shifting scale, throughput, or team capacity. |
| `plan_pattern_adoption` | Reversible execution plan | Step-by-step Strangler phases, characterization test nets, and rollback triggers. |
| `write_pattern_adr` | Durable decision records | Standard Architecture Decision Record with explicit uncertainty boundaries. |
| `get_pattern_evidence_plan` | Falsification planning | Testable hypotheses, measurement metrics, experiment designs, and exit criteria. |
| `query_pattern_graph` | Knowledge exploration | Typed graph neighbor traversal (`complements`, `prerequisites`, `conflicts`). |

Resources expose the catalog (`pattern://catalog`), ontology (`pattern://ontology`), individual pattern records (`pattern://pattern/{patternId}`), and layers (`pattern://layer/{layer}`).

---

## The 116-Pattern Knowledge Graph

| Track / Layer | Count | Examples |
|---|---:|---|
| **TypeScript-Native** | 8 | Discriminated Union, Result Type, Composition Root, Brand Types |
| **GoF Creational** | 5 | Factory Method, Builder, Singleton, Abstract Factory |
| **GoF Structural** | 7 | Adapter, Bridge, Composite, Decorator, Facade, Proxy |
| **GoF Behavioral** | 11 | Command, State, Strategy, Visitor, Observer, Pipeline |
| **Enterprise & Domain** | 17 | Domain Model, Aggregate, CQRS, Event Sourcing, Repository |
| **Messaging & Integration** | 18 | Router, Aggregator, Idempotent Receiver, Transactional Outbox, CDC |
| **Distributed & Resilience** | 18 | Timeout, Circuit Breaker, Bulkhead, Saga, Sharding, Cells |
| **Concurrency & Async** | 8 | Mutex, Actor, Optimistic Concurrency Control (OCC), Reactor |
| **Testing** | 8 | Characterization Test, Contract Test, Property-Based, Mutation |
| **Architecture** | 10 | Ports & Adapters (Hexagonal), Modular Monolith, Event-Driven |
| **Cloud-Native & AI Agent** | 6 | Model Router, Tool Circuit Breaker, Semantic Cache, Singleflight, Cache Stampede Lock, Token Bucket |

Each record contains the problem statement, system context, mechanism, simpler direct alternative, misuse risks, evidence plan, TypeScript-specific concerns, adoption costs, and typed graph relations.

---

## Quick Start

Requirements: Node.js 22 or newer.

```bash
npm install
npm run check
npm run build
node dist/cli.js
```

### MCP Client Configuration

Add to your MCP settings file (e.g. Claude Desktop, Pi, Cursor, Codex):

```json
{
  "mcpServers": {
    "pattern-intelligence": {
      "command": "node",
      "args": ["/absolute/path/to/pattern-intelligence-mcp/dist/cli.js"]
    }
  }
}
```

---

## Example: One-Shot Architectural Prescription

### Input Case
```json
{
  "case": {
    "problem": "Three third-party carrier APIs (FedEx, UPS, DHL) expose incompatible models and leak vendor SDK types across 19 domain files.",
    "failureModes": ["vendor downtime", "breaking SDK updates"],
    "goals": ["insulate domain model", "support dynamic carrier selection"],
    "evidence": ["vendor models imported across 19 core domain files"]
  }
}
```

### Result Produced by `prescribe_architecture`
1. **Verdict:** `ADOPT-PATTERN` (Ports and Adapters + Anti-Corruption Layer + Strategy).
2. **Rejection Matrix:** Disqualifies Microservices and CQRS as premature for in-process boundary insulation.
3. **Generated TypeScript Code:**
   - Domain Port contract (`CarrierPort`).
   - Anti-Corruption Layer vendor mapper functions.
   - Infrastructure adapter (`FedExAdapter`) with `AbortSignal` timeout handling.
   - Dynamic carrier strategy registry (`CarrierRegistry`).
4. **Automated CI Fitness Rule:** ESLint configuration disallowing `@typescript-eslint/no-restricted-imports` from importing vendor SDKs inside `src/domain/`.
5. **Reversible Adoption Seams:** File-by-file Strangler Fig migration steps and quantified rollback triggers.

---

## Development & Testing

```bash
npm run typecheck       # Strict TypeScript verification
npm run lint            # Biome check & linting
npm test                # Vitest test suite (100 unit tests)
npm run test:coverage   # Full coverage report (>95% coverage)
npm run build           # Compile to dist/
```

---

## Architectural Principles

1. **Deterministic Local Execution:** Zero dependencies on external AI APIs or vector databases. All reasoning is local, deterministic, and auditable.
2. **No-Pattern Baseline:** Adding abstraction layers must mathematically beat a simpler direct solution.
3. **Single Responsibility & Brevity:** Strict Uncle Bob Clean Code standards with concise, cohesive functions and clear bounded contexts.
4. **Falsifiable & Reversible:** Every architectural prescription includes testable metrics, exit criteria, and zero-friction rollback triggers.

---

## License

MIT License. See [LICENSE](LICENSE) for details.
