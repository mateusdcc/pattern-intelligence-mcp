# Roadmap

The repository is a strong local decision-support foundation, not a finished claim of architectural
oracle accuracy.

## 0.2 — Calibration

- Publish a versioned, anonymized decision benchmark with negative cases.
- Add typed graph edges: complements, prerequisites, alternatives, and conflicts.
- Report ranking metrics such as Recall@k, mean reciprocal rank, false-positive cost, and abstention rate.
- Add regression cases from real code reviews and post-incident decisions.

## 0.3 — Code evidence

- Accept compact architecture facts from AST and dependency-analysis tools.
- Detect change coupling, cycles, fan-out, unstable boundaries, and test seams.
- Keep scanning separate from recommendation policy so users can audit the facts.

## 0.4 — Extensibility

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
