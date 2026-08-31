# Clean Code Architecture & Refactoring Harness (85k+ ★ ryanmcdermott/clean-code-javascript)

Adopted from `ryanmcdermott/clean-code-javascript` and Uncle Bob Clean Architecture principles:

## 1. Single Responsibility Principle (SRP) & Cohesion
- Functions should do one thing and do it well (< 10 lines, LCOM4 = 1).
- Isolate business domain models and ports from third-party vendor SDKs, databases, and message brokers.

## 2. Open/Closed Principle (OCP) & Polymorphic Dispatch
- Open for extension, closed for modification. Replace nested conditionals and type-switching cascades with Strategy, Ports & Adapters, or Pipelines.
- High-level business policies must depend on domain port abstractions (Dependency Inversion Principle).

## 3. Anti-Overengineering (YAGNI & KISS)
- Strictly avoid premature complex distributed architectures (Event Sourcing, CQRS, Sagas, Microservices) when a direct, modular monolithic solution or single transaction suffices.

## 4. Resilience, Concurrency & At-Least-Once Delivery
- External network invocations require bounded timeouts and circuit breakers.
- Concurrency requires Optimistic Concurrency Control (OCC) or explicit versioning to prevent lost updates.
- Prevent dual-write data loss using Transactional Outbox.

## 5. Decision Protocol & Tool Integration
- When evaluating architectural decisions or refactoring:
  1. Call `analyze_design_case` to compute deterministic force alignment, complexity penalties, and verify whether a direct solution or pattern is justified.
  2. If a pattern is recommended, call `synthesize_pattern_refactoring` to obtain the exact domain port contracts, infrastructure adapters, and contract verification test scaffolds.
  3. Include explicit rollback triggers, exit criteria, and measurement metrics.
