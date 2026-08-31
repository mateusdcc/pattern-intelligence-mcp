export interface RefactoringScaffold {
  readonly patternName: string;
  readonly architectureSummary: string;
  readonly files: readonly {
    readonly path: string;
    readonly description: string;
    readonly code: string;
  }[];
  readonly migrationSteps: readonly string[];
  readonly verificationTests: readonly string[];
}

function getAdapterScaffold(): RefactoringScaffold {
  return {
    patternName: "Adapter & Anti-Corruption Layer",
    architectureSummary: "Insulates core domain using domain ports and vendor-specific mappers.",
    files: [
      {
        path: "src/domain/ports/carrier.port.ts",
        description: "Domain-owned port contract",
        code: `export interface CarrierPort {\n  getRates(request: RateRequest): Promise<ShippingRate[]>;\n  createShipment(request: ShipmentRequest): Promise<ShipmentResult>;\n}`,
      },
      {
        path: "src/infrastructure/carriers/vendor.adapter.ts",
        description: "Vendor-specific adapter translating to domain types",
        code: `import type { CarrierPort } from "../../domain/ports/carrier.port.js";\n\nexport class VendorAdapter implements CarrierPort {\n  constructor(private readonly client: VendorClient) {}\n  async getRates(req: RateRequest): Promise<ShippingRate[]> {\n    const res = await this.client.fetchRates(req);\n    return res.rates.map(r => ({ id: r.code, price: r.amount, currency: r.cur }));\n  }\n  async createShipment(req: ShipmentRequest): Promise<ShipmentResult> {\n    return this.client.book(req);\n  }\n}`,
      },
    ],
    migrationSteps: [
      "1. Define domain port interface in src/domain/ports/.",
      "2. Wrap vendor SDK inside an infrastructure adapter.",
      "3. Replace direct vendor imports across domain files with the port interface.",
      "4. Add ESLint import boundary rules to prevent future vendor leakage.",
    ],
    verificationTests: [
      "Contract test verifying Adapter adheres to CarrierPort behavior.",
      "Mapping unit tests verifying vendor error codes translate to domain errors.",
    ],
  };
}

function getOutboxScaffold(): RefactoringScaffold {
  return {
    patternName: "Transactional Outbox",
    architectureSummary:
      "Atomically records business events in the database before asynchronous dispatch.",
    files: [
      {
        path: "src/infrastructure/db/outbox.table.ts",
        description: "Outbox table schema and atomic insertion",
        code: `export interface OutboxEvent {\n  id: string;\n  eventType: string;\n  payload: string;\n  status: 'PENDING' | 'PUBLISHED';\n  createdAt: Date;\n}`,
      },
      {
        path: "src/application/services/user-registration.ts",
        description: "Atomic DB write with outbox insertion in single transaction",
        code: `export async function registerUser(db: TransactionClient, user: UserInput): Promise<User> {\n  const created = await db.users.insert(user);\n  await db.outbox.insert({\n    id: crypto.randomUUID(),\n    eventType: 'USER_REGISTERED',\n    payload: JSON.stringify(created),\n    status: 'PENDING',\n    createdAt: new Date(),\n  });\n  return created;\n}`,
      },
    ],
    migrationSteps: [
      "1. Add outbox_events table with unique event ID and pending status.",
      "2. Modify write use-cases to append to outbox in the same DB transaction.",
      "3. Run an asynchronous outbox publisher worker with at-least-once delivery.",
      "4. Remove direct broker publishing from synchronous request handlers.",
    ],
    verificationTests: [
      "Integration test: DB commit failure rolls back both record and outbox event.",
      "Idempotency test: Outbox publisher safely retries failed deliveries.",
    ],
  };
}

function getStrategyScaffold(): RefactoringScaffold {
  return {
    patternName: "Strategy Pattern",
    architectureSummary: "Isolates interchangeable algorithms behind a shared execution interface.",
    files: [
      {
        path: "src/domain/pricing/pricing.strategy.ts",
        description: "Pricing strategy contract",
        code: `export interface PricingStrategy {\n  readonly name: string;\n  calculatePrice(order: Order): number;\n}`,
      },
      {
        path: "src/domain/pricing/pricing.context.ts",
        description: "Pricing calculation engine",
        code: `export class PricingEngine {\n  constructor(private readonly strategies: Map<string, PricingStrategy>) {}\n  calculate(tier: string, order: Order): number {\n    const strategy = this.strategies.get(tier) ?? this.strategies.get('DEFAULT')!;\n    return strategy.calculatePrice(order);\n  }\n}`,
      },
    ],
    migrationSteps: [
      "1. Extract conditional branches into individual Strategy implementations.",
      "2. Register strategies in a registry or factory.",
      "3. Replace conditional switch statements with strategy lookups.",
    ],
    verificationTests: [
      "Unit test each strategy independently with edge-case order inputs.",
      "Verify default strategy fallback on unknown discount tiers.",
    ],
  };
}

function getCircuitBreakerScaffold(): RefactoringScaffold {
  return {
    patternName: "Circuit Breaker & Timeout",
    architectureSummary: "Wraps remote calls with bounded timeout and fast-fail state machine.",
    files: [
      {
        path: "src/infrastructure/resilience/circuit-breaker.ts",
        description: "Circuit breaker wrapper with timeout",
        code: `export class CircuitBreaker {\n  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';\n  private failures = 0;\n  constructor(private readonly threshold = 5, private readonly timeoutMs = 2000) {}\n  async execute<T>(fn: (signal: AbortSignal) => Promise<T>): Promise<T> {\n    if (this.state === 'OPEN') throw new Error('Circuit is OPEN: failing fast');\n    const controller = new AbortController();\n    const timer = setTimeout(() => controller.abort(), this.timeoutMs);\n    try {\n      const result = await fn(controller.signal);\n      this.failures = 0;\n      return result;\n    } catch (err) {\n      if (++this.failures >= this.threshold) this.state = 'OPEN';\n      throw err;\n    } finally { clearTimeout(timer); }\n  }\n}`,
      },
    ],
    migrationSteps: [
      "1. Wrap all external HTTP/gRPC clients with explicit timeouts.",
      "2. Add circuit breaker around volatile dependencies.",
      "3. Provide degraded fallback responses when the breaker is open.",
    ],
    verificationTests: [
      "Test circuit trips to OPEN after threshold consecutive timeouts.",
      "Test fallback response returned immediately when breaker is OPEN.",
    ],
  };
}

export function synthesizeRefactoring(patternName: string): RefactoringScaffold {
  const norm = patternName.toLowerCase();
  if (norm.includes("outbox") || norm.includes("dual")) return getOutboxScaffold();
  if (norm.includes("circuit") || norm.includes("timeout") || norm.includes("resilience"))
    return getCircuitBreakerScaffold();
  if (norm.includes("strategy") || norm.includes("policy") || norm.includes("discount"))
    return getStrategyScaffold();
  return getAdapterScaffold();
}
