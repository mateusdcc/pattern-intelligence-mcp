# Contributing

Contributions should make decisions more accurate, explainable, or easier to falsify. A larger pattern
count alone is not an improvement.

## Setup

```bash
npm install
npm run check
npm run build
```

Node.js 22 or newer is required. The project uses strict TypeScript, Zod 4, Biome, and Vitest.

## Change policy

- Keep commits atomic and use imperative Conventional Commit messages.
- Add a regression case before changing an ontology rule or score.
- Preserve deterministic ordering in tools and ranking tie-breakers.
- Put protocol concerns in `src/mcp`, orchestration in `src/application`, decisions in `src/engine`,
  catalog access in `src/knowledge`, and stable contracts in `src/domain`.
- Do not introduce an external service when a deterministic local implementation meets a measured need.

## Adding a pattern

A pattern record must include a specific problem, real context, mechanism, simpler alternative, misuse,
evidence, TypeScript implications, cost, and relations. Add tests for every internal relation and at
least one positive and one negative decision case. A pattern that cannot be distinguished from an
existing record belongs as a related concept, not a new entry.

## Pull requests

Describe the observed gap, evidence, decision-boundary change, regression coverage, and compatibility
impact. Generated praise or generic “best practice” claims are not evidence.
