import type { Pattern, PatternCatalog, PatternLayer } from "../domain/pattern.js";
import {
  findComplementaryPatterns,
  findConflictingPatterns,
  findMitigatingPatterns,
  findPrerequisites,
  type PatternRelationshipType,
} from "./ontology.js";

const PATTERN_ALIASES: Readonly<Record<string, string>> = {
  "2pc": "saga",
  "two-phase-commit": "saga",
  "two-phase commit": "saga",
  "two phase commit": "saga",
  microservices: "modular-monolith",
  microservice: "modular-monolith",
  eda: "event-driven-architecture",
  fcis: "functional-core-imperative-shell",
  di: "dependency-injection",
  dto: "data-transfer-object",
  acl: "anti-corruption-layer",
  mvc: "model-view-controller",
  occ: "optimistic-concurrency-control",
};

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

  public complements(id: string): readonly Pattern[] {
    return findComplementaryPatterns(this.catalog.patterns, id).map((targetId) =>
      this.require(targetId),
    );
  }

  public prerequisiteFor(id: string): readonly Pattern[] {
    return (this.require(id).prerequisiteFor ?? []).map((targetId) => this.require(targetId));
  }

  public prerequisitesOf(id: string): readonly Pattern[] {
    return findPrerequisites(this.catalog.patterns, id).map((targetId) => this.require(targetId));
  }

  public prerequisites(id: string): readonly Pattern[] {
    return this.prerequisitesOf(id);
  }

  public mitigatesLiabilityOf(id: string): readonly Pattern[] {
    return (this.require(id).mitigatesLiabilityOf ?? []).map((targetId) => this.require(targetId));
  }

  public liabilitiesMitigatedBy(id: string): readonly Pattern[] {
    return findMitigatingPatterns(this.catalog.patterns, id).map((targetId) =>
      this.require(targetId),
    );
  }

  public conflictsWith(id: string): readonly Pattern[] {
    return findConflictingPatterns(this.catalog.patterns, id).map((targetId) =>
      this.require(targetId),
    );
  }

  public neighbors(id: string, relationshipType?: PatternRelationshipType): readonly Pattern[] {
    if (!relationshipType) return this.relatedTo(id);
    if (relationshipType === "complements") return this.complements(id);
    if (relationshipType === "prerequisiteFor") return this.prerequisiteFor(id);
    if (relationshipType === "mitigatesLiabilityOf") return this.mitigatesLiabilityOf(id);
    return this.conflictsWith(id);
  }

  public relatedByType(id: string, type: PatternRelationshipType): readonly Pattern[] {
    return this.neighbors(id, type);
  }

  public findByNameOrId(value: string): Pattern | undefined {
    const normalized = value.trim().toLowerCase();
    const resolvedId = PATTERN_ALIASES[normalized] ?? normalized;
    return this.catalog.patterns.find(
      (pattern) =>
        pattern.id === resolvedId ||
        pattern.name.toLowerCase() === normalized ||
        pattern.name.toLowerCase() === resolvedId,
    );
  }
}
