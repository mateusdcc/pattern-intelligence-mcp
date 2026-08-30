import type { Pattern, PatternCatalog, PatternLayer } from "../domain/pattern.js";

export class PatternStore {
  readonly #byId: ReadonlyMap<string, Pattern>;

  public constructor(private readonly catalog: PatternCatalog) {
    this.#byId = new Map(catalog.patterns.map((pattern) => [pattern.id, pattern]));
  }

  public count(): number {
    return this.catalog.patterns.length;
  }

  public all(): readonly Pattern[] {
    return this.catalog.patterns;
  }

  public get(id: string): Pattern | undefined {
    return this.#byId.get(id);
  }

  public require(id: string): Pattern {
    const pattern = this.get(id);
    if (!pattern) {
      throw new Error(`Unknown pattern: ${id}`);
    }
    return pattern;
  }

  public byLayer(layer: PatternLayer): readonly Pattern[] {
    return this.catalog.patterns.filter((pattern) => pattern.layer === layer);
  }

  public relatedTo(id: string): readonly Pattern[] {
    return this.require(id).related.map((relatedId) => this.require(relatedId));
  }

  public findByNameOrId(value: string): Pattern | undefined {
    const normalized = value.trim().toLowerCase();
    return this.catalog.patterns.find(
      (pattern) => pattern.id === normalized || pattern.name.toLowerCase() === normalized,
    );
  }
}
