import type { CompoundTopology } from "../domain/decision.js";

export const DUAL_WRITE_TOPOLOGY: CompoundTopology = {
  id: "dual-write-cdc",
  name: "Dual-Write CDC Outbox Topology",
  description:
    "Eliminates dual-write inconsistencies between database commits and message publication using transactional outbox table staging, change data capture relay, and idempotent message consumption.",
  components: [
    {
      name: "Domain Outbox Port",
      patternId: "transactional-outbox",
      role: "primary",
      layer: "Domain Port",
      responsibility: "Declares domain persistence port with staged event emission semantics.",
    },
    {
      name: "Transactional Outbox Writer",
      patternId: "transactional-outbox",
      role: "primary",
      layer: "Infrastructure Adapter",
      responsibility:
        "Persists domain aggregate mutation and serialized outbox record in a single atomic database transaction.",
    },
    {
      name: "CDC Outbox Relay Worker",
      patternId: "transactional-outbox",
      role: "supporting",
      layer: "Outbox Relay Worker",
      responsibility:
        "Change data capture worker tailing transaction log or polling outbox table to stream events to broker.",
    },
    {
      name: "Idempotent Message Consumer",
      patternId: "idempotent-receiver",
      role: "supporting",
      layer: "Idempotent Consumer",
      responsibility:
        "Deduplicates inbound message deliveries and ensures at-most-once processing semantics.",
    },
  ],
  dataFlows: [
    {
      from: "Domain Outbox Port",
      to: "Transactional Outbox Writer",
      description:
        "Atomically writes entity update and staged event record in local database transaction.",
    },
    {
      from: "Transactional Outbox Writer",
      to: "CDC Outbox Relay Worker",
      description: "CDC stream or outbox polling worker extracts committed outbox records.",
    },
    {
      from: "CDC Outbox Relay Worker",
      to: "Message Broker",
      description: "Publishes events to messaging broker with correlation and idempotency keys.",
    },
    {
      from: "Message Broker",
      to: "Idempotent Message Consumer",
      description:
        "Consumer validates idempotency key against deduplication store before applying business logic.",
    },
  ],
};

export const DEPENDENCY_RESILIENCE_TOPOLOGY: CompoundTopology = {
  id: "dependency-resilience",
  name: "Fault-Tolerant Dependency Resilience Topology",
  description:
    "Safeguards availability against downstream timeouts and outages via bulkhead concurrency pooling, error rate circuit breaking, exponential backoff retries with randomized jitter, and fallback routing.",
  components: [
    {
      name: "Resilient Fallback Router",
      patternId: "circuit-breaker",
      role: "supporting",
      layer: "Fallback Router",
      responsibility:
        "Diverts requests to cached responses or degraded-mode fallbacks when calls fail or circuit trips.",
    },
    {
      name: "Bulkhead Isolation Pool",
      patternId: "bulkhead",
      role: "supporting",
      layer: "Resilience Interceptor",
      responsibility:
        "Restricts concurrent execution slots per downstream dependency to contain failure blast radius.",
    },
    {
      name: "Circuit Breaker Guard",
      patternId: "circuit-breaker",
      role: "primary",
      layer: "Resilience Interceptor",
      responsibility:
        "Tracks invocation failure rates and fast-fails downstream requests when error threshold is reached.",
    },
    {
      name: "Timeout and Jittered Retry Adapter",
      patternId: "timeout",
      role: "supporting",
      layer: "Infrastructure Adapter",
      responsibility:
        "Enforces bounded execution timeouts and retries transient failures with exponential backoff and jitter.",
    },
  ],
  dataFlows: [
    {
      from: "Client Request",
      to: "Bulkhead Isolation Pool",
      description: "Acquires execution lease within dependency-specific bounded concurrency pool.",
    },
    {
      from: "Bulkhead Isolation Pool",
      to: "Circuit Breaker Guard",
      description: "Verifies circuit health state before permitting outbound request.",
    },
    {
      from: "Circuit Breaker Guard",
      to: "Timeout and Jittered Retry Adapter",
      description:
        "Dispatches network call guarded by strict timeout deadline and jittered retries.",
    },
    {
      from: "Circuit Breaker Guard",
      to: "Resilient Fallback Router",
      description:
        "Executes fallback policy when circuit is open or timeouts and retries are exhausted.",
    },
  ],
};

export const THIRD_PARTY_INSULATION_TOPOLOGY: CompoundTopology = {
  id: "third-party-insulation",
  name: "Third-Party Insulation Topology",
  description:
    "Shields core domain models from external vendor churn and API discrepancies using hexagonal domain ports, runtime strategy selection, and anti-corruption translation.",
  components: [
    {
      name: "Domain Boundary Port",
      patternId: "ports-and-adapters",
      role: "primary",
      layer: "Domain Port",
      responsibility: "Defines clean, technology-agnostic interface capturing domain requirements.",
    },
    {
      name: "Provider Strategy Router",
      patternId: "strategy",
      role: "supporting",
      layer: "Infrastructure Adapter",
      responsibility:
        "Selects and dynamically dispatches requests to appropriate vendor strategy implementation.",
    },
    {
      name: "Vendor Protocol Adapter",
      patternId: "adapter",
      role: "supporting",
      layer: "Infrastructure Adapter",
      responsibility:
        "Handles vendor-specific network communication, payload serialization, and authentication.",
    },
    {
      name: "Anti-Corruption Layer Translator",
      patternId: "anti-corruption-layer",
      role: "supporting",
      layer: "Infrastructure Adapter",
      responsibility:
        "Translates external vendor data transfer objects into clean internal domain aggregates and value objects.",
    },
  ],
  dataFlows: [
    {
      from: "Domain Core",
      to: "Domain Boundary Port",
      description: "Domain service invokes abstract port without knowledge of external providers.",
    },
    {
      from: "Domain Boundary Port",
      to: "Provider Strategy Router",
      description: "Routes operation to designated third-party provider strategy.",
    },
    {
      from: "Provider Strategy Router",
      to: "Vendor Protocol Adapter",
      description: "Executes outbound API request according to vendor specifications.",
    },
    {
      from: "Vendor Protocol Adapter",
      to: "Anti-Corruption Layer Translator",
      description: "Passes vendor response payload for bi-directional domain translation.",
    },
    {
      from: "Anti-Corruption Layer Translator",
      to: "Domain Core",
      description: "Returns validated domain value objects and domain events to caller.",
    },
  ],
};

export const DISTRIBUTED_WORKFLOW_TOPOLOGY: CompoundTopology = {
  id: "distributed-workflow",
  name: "Compensating Distributed Workflow Topology",
  description:
    "Coordinates multi-service transactions with eventual consistency using saga state machine orchestration, transactional outbox step dispatch, idempotent reply ingestion, and compensating undo handlers.",
  components: [
    {
      name: "Workflow Initiator Port",
      patternId: "saga",
      role: "primary",
      layer: "Domain Port",
      responsibility:
        "Defines boundary contract for triggering and tracking distributed workflow execution.",
    },
    {
      name: "Saga Orchestration Coordinator",
      patternId: "saga",
      role: "primary",
      layer: "Workflow Coordinator",
      responsibility:
        "Coordinates workflow progression, tracks step completion states, and triggers compensations on failure.",
    },
    {
      name: "Saga Step Outbox Dispatcher",
      patternId: "transactional-outbox",
      role: "supporting",
      layer: "Outbox Relay Worker",
      responsibility:
        "Reliably records and emits asynchronous step execution commands via transactional outbox.",
    },
    {
      name: "Idempotent Step Reply Consumer",
      patternId: "idempotent-receiver",
      role: "supporting",
      layer: "Idempotent Consumer",
      responsibility:
        "Receives participant step completion messages and prevents duplicate state transitions.",
    },
    {
      name: "Compensating Transaction Handler",
      patternId: "saga",
      role: "supporting",
      layer: "Compensation Handler",
      responsibility:
        "Executes compensating backward recovery operations when a workflow step encounters unrecoverable failure.",
    },
  ],
  dataFlows: [
    {
      from: "Domain Service",
      to: "Workflow Initiator Port",
      description: "Initiates distributed multi-service business process.",
    },
    {
      from: "Workflow Initiator Port",
      to: "Saga Orchestration Coordinator",
      description: "Instantiates saga instance and executes initial forward workflow step.",
    },
    {
      from: "Saga Orchestration Coordinator",
      to: "Saga Step Outbox Dispatcher",
      description: "Stores step dispatch command in transactional outbox for reliable delivery.",
    },
    {
      from: "Saga Step Outbox Dispatcher",
      to: "Participant Services",
      description: "Delivers asynchronous step command to downstream microservice.",
    },
    {
      from: "Participant Services",
      to: "Idempotent Step Reply Consumer",
      description: "Publishes step execution result back to orchestrator channel.",
    },
    {
      from: "Idempotent Step Reply Consumer",
      to: "Saga Orchestration Coordinator",
      description: "Advances saga state machine upon validating response idempotency.",
    },
    {
      from: "Saga Orchestration Coordinator",
      to: "Compensating Transaction Handler",
      description: "Triggers reverse compensating steps if any participant reports failure.",
    },
  ],
};

export const SAFE_MIGRATION_TOPOLOGY: CompoundTopology = {
  id: "safe-migration",
  name: "Safe Migration Strangler Topology",
  description:
    "Enables zero-downtime legacy subsystem replacement using perimeter strangler interception, branch by abstraction interfaces, shadow reconciliation comparison, and canary fallback routing.",
  components: [
    {
      name: "Strangler Gateway Proxy",
      patternId: "strangler-fig",
      role: "primary",
      layer: "Migration Interceptor",
      responsibility:
        "Intercepts perimeter traffic and routes requests dynamically between legacy and modern implementations.",
    },
    {
      name: "Branch by Abstraction Port",
      patternId: "ports-and-adapters",
      role: "supporting",
      layer: "Domain Port",
      responsibility:
        "Abstract code-level seam decoupling callers from concrete legacy or modern implementation details.",
    },
    {
      name: "Legacy Subsystem Adapter",
      patternId: "adapter",
      role: "supporting",
      layer: "Infrastructure Adapter",
      responsibility: "Encapsulates legacy code, data schemas, and legacy system invocations.",
    },
    {
      name: "Modern Target Adapter",
      patternId: "adapter",
      role: "supporting",
      layer: "Infrastructure Adapter",
      responsibility: "Implements modernized microservice or refactored domain logic.",
    },
    {
      name: "Shadow Reconciliation Verifier",
      patternId: "contract-test",
      role: "supporting",
      layer: "Shadow Comparator",
      responsibility:
        "Asynchronously mirrors live production traffic to verify modern response equivalence against legacy baseline.",
    },
    {
      name: "Canary Fallback Router",
      patternId: "dynamic-router",
      role: "supporting",
      layer: "Fallback Router",
      responsibility:
        "Directs configurable traffic percentage to modern target with immediate fallback to legacy on errors.",
    },
  ],
  dataFlows: [
    {
      from: "Client Traffic",
      to: "Strangler Gateway Proxy",
      description: "Intercepts inbound API calls targeting legacy subsystem.",
    },
    {
      from: "Strangler Gateway Proxy",
      to: "Branch by Abstraction Port",
      description: "Routes invocation through abstract boundary seam.",
    },
    {
      from: "Branch by Abstraction Port",
      to: "Canary Fallback Router",
      description: "Applies routing percentage and system health checks.",
    },
    {
      from: "Canary Fallback Router",
      to: "Modern Target Adapter",
      description: "Dispatches canary percentage of requests to modernized implementation.",
    },
    {
      from: "Canary Fallback Router",
      to: "Shadow Reconciliation Verifier",
      description: "Duplicates requests for asynchronous shadow verification.",
    },
    {
      from: "Shadow Reconciliation Verifier",
      to: "Legacy Subsystem Adapter",
      description: "Executes legacy path in shadow mode to compare response parity.",
    },
    {
      from: "Canary Fallback Router",
      to: "Legacy Subsystem Adapter",
      description: "Reverts immediately to legacy path if modern system returns an error.",
    },
  ],
};
