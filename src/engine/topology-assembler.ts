import type {
  CompoundPattern,
  CompoundTopology,
  PatternAssessment,
  TopologyComponent,
  TopologyDataFlow,
} from "../domain/decision.js";
import type { ScoringContext } from "./scorer.js";
import {
  DEPENDENCY_RESILIENCE_TOPOLOGY,
  DISTRIBUTED_WORKFLOW_TOPOLOGY,
  DUAL_WRITE_TOPOLOGY,
  SAFE_MIGRATION_TOPOLOGY,
  THIRD_PARTY_INSULATION_TOPOLOGY,
} from "./topology-catalog.js";

export function assembleCompoundTopology(
  patterns: readonly PatternAssessment[],
  context: ScoringContext,
): CompoundTopology | undefined {
  if (patterns.length === 0) return undefined;
  const primary = patterns[0];
  if (!primary) return undefined;
  const concepts = new Set(context.concepts.map((c) => c.id));
  const problemText = [
    context.designCase.problem,
    ...context.designCase.goals,
    ...context.designCase.failureModes,
  ].join(" ");
  return (
    findKnownTopology(primary.pattern.id, concepts, problemText) ??
    buildGenericTopology(primary, patterns.slice(1))
  );
}

export function buildCompoundPatterns(
  patterns: readonly PatternAssessment[],
  topology?: CompoundTopology,
): readonly CompoundPattern[] {
  if (topology) {
    return topology.components.map((c) => ({
      patternId: c.patternId,
      role: c.role,
      reason: `${c.name} [${c.layer}]: ${c.responsibility}`,
      layer: c.layer,
      component: c.name,
    }));
  }
  return patterns
    .filter((a) => a.role === "primary" || a.role === "supporting")
    .map((a) => ({
      patternId: a.pattern.id,
      role: a.role === "primary" ? "primary" : "supporting",
      reason:
        a.role === "primary" ? "Addresses the dominant force." : "Handles a supporting concern.",
      layer: a.role === "primary" ? "Domain Port" : "Infrastructure Adapter",
      component: `${a.pattern.name} Seam`,
    }));
}

function findKnownTopology(
  topId: string,
  concepts: ReadonlySet<string>,
  text: string,
): CompoundTopology | undefined {
  if (isDualWrite(topId, concepts, text)) return DUAL_WRITE_TOPOLOGY;
  if (isDependencyResilience(topId, concepts, text)) return DEPENDENCY_RESILIENCE_TOPOLOGY;
  if (isThirdPartyInsulation(topId, concepts, text)) return THIRD_PARTY_INSULATION_TOPOLOGY;
  if (isDistributedWorkflow(topId, concepts, text)) return DISTRIBUTED_WORKFLOW_TOPOLOGY;
  if (isSafeMigration(topId, concepts, text)) return SAFE_MIGRATION_TOPOLOGY;
  return undefined;
}

function isDualWrite(topId: string, concepts: ReadonlySet<string>, text: string): boolean {
  if (topId === "transactional-outbox") return true;
  if (concepts.has("dual-write")) return true;
  return /dual[- ]write|outbox|lost event|publish after commit/i.test(text);
}

function isDependencyResilience(
  topId: string,
  concepts: ReadonlySet<string>,
  text: string,
): boolean {
  const ids = new Set(["circuit-breaker", "bulkhead", "timeout", "retry-with-backoff-and-jitter"]);
  if (ids.has(topId)) return true;
  if (concepts.has("remote-failure") || concepts.has("agent-tool-fault-tolerance")) return true;
  return /remote timeout|provider outage|transient failure|slow dependency/i.test(text);
}

function isThirdPartyInsulation(
  topId: string,
  concepts: ReadonlySet<string>,
  text: string,
): boolean {
  const ids = new Set(["ports-and-adapters", "anti-corruption-layer", "adapter"]);
  if (ids.has(topId) && (concepts.has("incompatible-boundary") || /vendor|carrier/i.test(text))) {
    return true;
  }
  if (concepts.has("incompatible-boundary")) return true;
  return /incompatible carrier|third-party provider|vendor model|leak vendor/i.test(text);
}

function isDistributedWorkflow(
  topId: string,
  concepts: ReadonlySet<string>,
  text: string,
): boolean {
  if (topId === "saga") return true;
  if (concepts.has("distributed-transaction")) return true;
  return /distributed transaction|multi-service workflow|compensating action/i.test(text);
}

function isSafeMigration(topId: string, concepts: ReadonlySet<string>, text: string): boolean {
  if (topId === "strangler-fig") return true;
  if (concepts.has("legacy-migration")) return true;
  return /strangler|legacy migration|monolith extraction|incremental replacement/i.test(text);
}

function buildGenericTopology(
  primary: PatternAssessment,
  supporting: readonly PatternAssessment[],
): CompoundTopology {
  const selectedSupporting = supporting.filter((a) => a.role === "supporting");
  const components: TopologyComponent[] = [
    {
      name: `${primary.pattern.name} Port`,
      patternId: primary.pattern.id,
      role: "primary",
      layer: "Domain Port",
      responsibility: primary.pattern.problem,
    },
    ...selectedSupporting.map((s) => ({
      name: `${s.pattern.name} Adapter`,
      patternId: s.pattern.id,
      role: "supporting" as const,
      layer: "Infrastructure Adapter" as const,
      responsibility: s.pattern.mechanism,
    })),
  ];
  return {
    id: `${primary.pattern.id}-compound`,
    name: `${primary.pattern.name} Compound Topology`,
    description: `Compound topology coordinating ${primary.pattern.name} with supporting components.`,
    components,
    dataFlows: buildGenericDataFlows(primary, selectedSupporting),
  };
}

function buildGenericDataFlows(
  primary: PatternAssessment,
  supporting: readonly PatternAssessment[],
): readonly TopologyDataFlow[] {
  return [
    {
      from: "Client Layer",
      to: `${primary.pattern.name} Port`,
      description: "Invokes core domain capability.",
    },
    ...supporting.map((s) => ({
      from: `${primary.pattern.name} Port`,
      to: `${s.pattern.name} Adapter`,
      description: `Delegates supporting responsibility to ${s.pattern.name}.`,
    })),
  ];
}
