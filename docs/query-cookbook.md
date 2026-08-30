# Query cookbook

Good inputs describe forces and evidence. Weak inputs ask for fashionable names.

## Open design problem

Use `analyze_design_case` with:

- a concrete failure or change problem;
- current architecture only where it constrains the choice;
- measurable goals;
- scale, delivery, consistency, and team capacity when relevant;
- incidents, profiles, change frequency, or load measurements.

Avoid “What is the best pattern for payments?” Payments contain many unrelated decisions.

## Compare alternatives

Use `compare_pattern_options` only when options solve the same decision. Comparing Strategy with Saga
is usually a layer error. Comparing Strategy with a Higher-Order Function is meaningful when behavior
varies and the question is whether it needs identity and lifecycle.

## Challenge existing code

Use `detect_pattern_misuse` with the observed liabilities. Useful examples:

- Singleton plus global mutable state and cross-test leakage;
- Event Sourcing in a small CRUD service with no temporal requirement;
- Retry around a non-idempotent charge;
- Repository wrapping a single stable data call without a domain boundary.

## Counterfactual design

Use `stress_test_pattern_decision` to mutate assumptions explicitly:

- low throughput to extreme throughput;
- request-response to at-least-once delivery;
- strong to eventual consistency;
- dedicated platform team to limited operations capacity;
- speculative pain to measured incidents.

The point is not to force a flip. A stable answer is evidence that the decision is insensitive to that
assumption; a flip identifies an architectural threshold worth recording.

## Pattern graph discovery

Use `query_pattern_graph` with problem text, seed patterns, or both. Filter by layer and maximum adoption
cost to prevent unbounded catalog dumping. Follow with `analyze_design_case`; graph proximity alone is
not a recommendation.
