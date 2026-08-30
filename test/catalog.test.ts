import { describe, expect, it } from "vitest";

import { loadCatalog } from "../src/knowledge/catalog-loader.js";
import { CONCEPT_RULES } from "../src/knowledge/ontology.js";
import { PatternStore } from "../src/knowledge/pattern-store.js";

describe("pattern catalog", () => {
  const catalog = loadCatalog();
  const store = new PatternStore(catalog);

  it("loads all 110 unique patterns", () => {
    expect(store.count()).toBe(110);
    expect(new Set(store.all().map((pattern) => pattern.id)).size).toBe(110);
  });

  it("resolves every internal relationship", () => {
    for (const pattern of store.all()) {
      for (const relatedId of pattern.related) {
        expect(store.get(relatedId), `${pattern.id} -> ${relatedId}`).toBeDefined();
      }
    }
  });

  it("keeps ontology weights within the catalog", () => {
    for (const rule of CONCEPT_RULES) {
      for (const patternId of Object.keys(rule.boosts)) {
        expect(store.get(patternId), `${rule.id} boosts ${patternId}`).toBeDefined();
      }
      for (const patternId of Object.keys(rule.penalties ?? {})) {
        expect(store.get(patternId), `${rule.id} penalizes ${patternId}`).toBeDefined();
      }
    }
  });

  it("supports layer and graph queries", () => {
    expect(store.byLayer("testing")).toHaveLength(8);
    expect(store.relatedTo("strategy").map((pattern) => pattern.id)).toContain(
      "higher-order-function",
    );
  });
});
