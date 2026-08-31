import type { DetectedSmell } from "../domain/code-quality.js";
import type { ParsedCall, ParsedFunction, ParsedImport } from "./code-ast.js";

const DB_MUTATION_RE =
  /\b(db|database|repo|repository|sql|prisma|orm|collection|table|store|tx)\b.*\b(insert|save|update|delete|create|persist|commit|upsert|execute|put|write|exec)\b/i;

export function isDbMutationCall(callee: string): boolean {
  const c = callee.toLowerCase();
  if (c.includes("outbox")) return false;
  return DB_MUTATION_RE.test(c) || c.startsWith("db.") || c.startsWith("this.db.");
}

const BROKER_RE =
  /\b(kafka|rabbit|rabbitmq|sqs|sns|bus|eventbus|messagebus|queue|producer|broker|pubsub|publisher)\b.*\b(publish|emit|send|sendmessage|push|dispatch|produce|broadcast)\b/i;

export function isBrokerPublishCall(callee: string): boolean {
  const c = callee.toLowerCase();
  return BROKER_RE.test(c) || c.startsWith("kafka.") || c.startsWith("this.kafka.");
}

export function detectDualWriteInFunction(fn: ParsedFunction): DetectedSmell | null {
  let dbCall: ParsedCall | null = null;
  for (const call of fn.calls) {
    if (!dbCall && isDbMutationCall(call.callee)) {
      dbCall = call;
    } else if (dbCall && isBrokerPublishCall(call.callee)) {
      return {
        kind: "dual-write-hazard",
        severity: "critical",
        title: "Dual-Write Consistency Hazard",
        description:
          "Direct DB transaction followed by message broker publish risks data loss or inconsistency on failure.",
        evidence: `In '${fn.name}': DB mutation '${dbCall.callee}' followed by broker call '${call.callee}' without transactional boundary.`,
        suggestedPatterns: ["Transactional Outbox", "Change Data Capture", "Idempotent Receiver"],
        simplerAlternative:
          "Sync RPC or single datastore transaction if async eventing is unneeded.",
      };
    }
  }
  return null;
}

export function detectDualWriteSmells(
  functions: readonly ParsedFunction[],
  allCalls: readonly ParsedCall[],
): readonly DetectedSmell[] {
  for (const fn of functions) {
    const smell = detectDualWriteInFunction(fn);
    if (smell) return [smell];
  }
  const topFn: ParsedFunction = {
    name: "main",
    isAsync: false,
    parameters: [],
    bodyText: "",
    calls: allCalls,
    fieldAccesses: [],
    methodCalls: [],
    startLine: 1,
  };
  const fallback = detectDualWriteInFunction(topFn);
  return fallback ? [fallback] : [];
}

const NETWORK_RE =
  /^(fetch(\.|$)|axios(\.|$)|http(\.|$)|https(\.|$)|(this\.)?(client|httpclient|apiclient|grpcclient)\.)/i;

export function isNetworkCall(callee: string): boolean {
  return NETWORK_RE.test(callee);
}

export function hasTimeoutOrSignal(argsText: string): boolean {
  return /\b(signal|abortsignal|abortcontroller|timeout|deadline|timeoutms)\b/i.test(argsText);
}

export function detectMissingTimeoutSmells(
  allCalls: readonly ParsedCall[],
): readonly DetectedSmell[] {
  for (const call of allCalls) {
    if (isNetworkCall(call.callee) && !hasTimeoutOrSignal(call.argumentsText)) {
      return [
        {
          kind: "missing-timeout",
          severity: "high",
          title: "Unbounded Remote Call (Missing Timeout)",
          description: "External network calls lack explicit timeouts or cancellation tokens.",
          evidence: `Remote invocation '${call.callee}' detected without timeout or AbortController.`,
          suggestedPatterns: ["Timeout", "Circuit Breaker", "Bulkhead"],
          simplerAlternative: "Pass AbortSignal.timeout(ms) directly into fetch or client options.",
        },
      ];
    }
  }
  return [];
}

export function detectGodClassSmell(
  lines: number,
  complexity: number,
  lcom4: number,
  efferentCoupling: number,
): DetectedSmell | null {
  const isGod =
    lines >= 200 ||
    complexity >= 20 ||
    (lcom4 >= 3 && efferentCoupling >= 3) ||
    (lines >= 100 && complexity >= 15 && lcom4 >= 2);
  if (!isGod) return null;
  return {
    kind: "god-class",
    severity: "high",
    title: "God Class / Monolithic Responsibility",
    description:
      "Component aggregates multiple disparate domains or orchestration tasks with low cohesion.",
    evidence: `File has ${lines} lines, cyclomatic complexity ${complexity}, LCOM4 lack of cohesion ${lcom4}, and efferent coupling ${efferentCoupling}.`,
    suggestedPatterns: ["Facade", "Strategy", "Pipeline", "Command"],
    simplerAlternative:
      "Extract cohesive helper functions and separate domain classes before adding orchestration.",
  };
}

export function detectLeakyAbstractionSmell(
  code: string,
  imports: readonly ParsedImport[],
): DetectedSmell | null {
  const hasVendorImport = imports.some((i) =>
    /\b(fedex|ups|dhl|stripe|paypal|aws|twilio)/i.test(i.moduleSpecifier),
  );
  const hasVendorType =
    /\b(fedex|ups|dhl|stripe|paypal|aws|twilio)\w*(request|response|payload|model)/i.test(code);
  if (!hasVendorImport && !hasVendorType) return null;
  return {
    kind: "leaky-abstraction",
    severity: "medium",
    title: "Leaky Vendor Types in Core Domain",
    description: "Third-party vendor data contracts bleed into internal business logic.",
    evidence: "Vendor-specific payload models referenced in application or domain code.",
    suggestedPatterns: ["Adapter", "Anti-Corruption Layer"],
    simplerAlternative: "Map vendor payload to an internal domain interface at the boundary.",
  };
}

export function detectConcurrencySmell(code: string): DetectedSmell | null {
  const hasMutation = /\b(update|save|write|counter|increment|balance|balance\s*=)\b/i.test(code);
  const hasVersionOrLock = /\b(version|lock|etag|mutex|atomic|serializable)\b/i.test(code);
  if (!hasMutation || hasVersionOrLock) return null;
  return {
    kind: "missing-concurrency-control",
    severity: "medium",
    title: "Missing Concurrency Control / Lost Update Risk",
    description: "Mutable shared state modified without optimistic versioning or locking.",
    evidence: "State update detected without version check or lock guard.",
    suggestedPatterns: ["Optimistic Concurrency Control", "Mutex"],
    simplerAlternative:
      "Use atomic DB increments (e.g. UPDATE ... SET balance = balance + 1) or version checks.",
  };
}

export function detectTightCouplingSmell(
  instabilityIndex: number,
  efferentCoupling: number,
): DetectedSmell | null {
  if (instabilityIndex < 0.75 || efferentCoupling < 5) return null;
  return {
    kind: "tight-coupling",
    severity: "high",
    title: "Tight Coupling / High Instability Hazard",
    description: "Module depends heavily on concrete external dependencies with high instability.",
    evidence: `Instability index is ${instabilityIndex} with ${efferentCoupling} external dependencies.`,
    suggestedPatterns: ["Hexagonal Architecture (Ports and Adapters)", "Facade"],
    simplerAlternative: "Introduce boundary interfaces and inject abstractions.",
  };
}
