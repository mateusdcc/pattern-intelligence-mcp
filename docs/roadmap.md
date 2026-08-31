# Roadmap

The repository is a strong local decision-support foundation, not a finished claim of architectural
oracle accuracy.

## 0.2 - Calibration (Completed)

- [x] Publish a versioned, anonymized decision benchmark with negative cases.
- [x] Add typed graph edges: complements, prerequisites, alternatives, and conflicts.
- [x] Multi-harness comparative benchmark suite (Clean Code, Ponytail, Caveman Mode).
- [ ] Add regression cases from real code reviews and post-incident decisions.

## 0.3 - Code evidence (Completed)

- [x] Deterministic AST structure and token extractor for TypeScript source code.
- [x] Compute Cyclomatic Complexity, Cohesion (LCOM4), Coupling ($C_a, C_e$), and Instability ($I$).
- [x] AST-based smell detectors: Dual-Write hazards, Missing Timeouts, God Classes.
- [x] Automated Architectural Fitness Rules generator (ESLint boundaries and Vitest/TS-Arch suites).

## 0.4 - Extensibility

- Versioned knowledge packs with schema migrations.
- Organization-specific force rules without forking the engine.
- Optional candidate-retrieval adapters, including local embeddings, behind an explicit interface.

## 1.0 criteria

- Independently reviewed pattern definitions and benchmark labels.
- Stable MCP contracts and migration policy.
- Measured abstention and misrecommendation rates on unseen cases.
- Security threat model for remote transports and third-party knowledge packs.
- Reproducible releases with provenance and signed artifacts.

HTTP transport is intentionally absent from the first release. Stdio solves local agent integration
without adding authentication, origin validation, deployment, or session concerns. A remote transport
should ship only with those concerns handled as one feature.
