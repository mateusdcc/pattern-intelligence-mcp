# Scoring model

The score is a ranking aid from 0 to 100. It is not a probability that a pattern is correct.

For a pattern \(p\) and design case \(c\):

\[
S(p,c) = N + L + F + C + P - A - X
\]

| Term | Meaning | Current maximum |
|---|---|---:|
| \(N\) | Exact pattern-name mention | 18 |
| \(L\) | IDF-weighted vocabulary overlap | 28 |
| \(F\) | Explicit force-ontology fit | 34 |
| \(C\) | Structured delivery, scale, consistency, and state context | contextual |
| \(P\) | User-supplied candidate prior | 6 |
| \(A\) | Adoption and operational complexity | subtractive |
| \(X\) | Contradictions and anti-goals | up to 35 subtractive |

The final value is clamped to 0-100. Every term is returned in `scoreBreakdown`.

## Why exact names have weight

An explicit candidate is useful evidence that the caller wants that option assessed, but it cannot
override contradictions or cost. The dedicated comparison and misuse tools should be used when the
caller already has pattern names; open-ended analysis should describe forces instead.

## Complexity discipline

Adoption cost and operational cost are separate. A class-level pattern can be conceptually expensive
but operationally free; a distributed pattern can impose both deployment and on-call burden. Penalties
increase when the case says the complexity budget is minimal, the team is very small, or operations
capacity is limited.

This is why simple CRUD can rank Transaction Script or Active Record while explicitly rejecting CQRS
and Event Sourcing.

## Confidence

Decision confidence uses:

- the leading score;
- separation from the second candidate;
- whether explicit forces were detected;
- whether measurements or incidents were supplied.

Missing throughput, delivery, consistency, operations capacity, or evidence becomes a question. Low
confidence does not become high because an answer is phrased confidently.

## Calibration protocol

When changing weights:

1. Add a failing benchmark that represents a real distinction.
2. Explain the force or contradiction the current model missed.
3. Change the smallest relevant rule or weight.
4. Run every cross-layer benchmark to detect collateral ranking changes.
5. Document behavior changes in the changelog.

Do not tune against a single attractive demo.
