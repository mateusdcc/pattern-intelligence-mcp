# Minimalist Clean Architecture & Engineering Harness

## Core Principles
- Single Responsibility Principle (SRP): keep functions under 10 lines, high cohesion (LCOM4 = 1).
- Dependency Inversion: core domain models and ports must not import third-party vendor SDKs or infrastructure details.
- Avoid Premature Complexity: simple CRUD or direct solutions are preferred unless scale, concurrency, or domain forces explicitly warrant abstractions.
- Reversible Migrations: all architectural changes must include incremental seams, exit criteria, and rollback triggers.
- Evidence & Verification: accompany all recommendations with falsifiable metrics (e.g. p99 latencies, error rates) and verification tests.
