import { readFileSync } from "node:fs";

import { catalogSchema, type PatternCatalog } from "../domain/pattern.js";

const catalogUrl = new URL("../../knowledge/patterns.json", import.meta.url);

export function loadCatalog(): PatternCatalog {
  const parsed: unknown = JSON.parse(readFileSync(catalogUrl, "utf8"));
  const catalog = catalogSchema.parse(parsed);

  if (catalog.patternCount !== catalog.patterns.length) {
    throw new Error(
      `Catalog declares ${catalog.patternCount} patterns but contains ${catalog.patterns.length}.`,
    );
  }

  const ids = new Set(catalog.patterns.map((pattern) => pattern.id));
  if (ids.size !== catalog.patterns.length) {
    throw new Error("Pattern IDs must be unique.");
  }

  return catalog;
}
