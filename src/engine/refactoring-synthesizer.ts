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

function getOptimisticConcurrencyScaffold(): RefactoringScaffold {
  return {
    patternName: "Optimistic Concurrency Control",
    architectureSummary:
      "Detects concurrent write collisions via entity versioning and conditional SQL updates with bounded exponential backoff retries.",
    files: [
      {
        path: "src/domain/errors/concurrency-conflict.error.ts",
        description: "Domain exception indicating an optimistic locking version collision",
        code: `export class ConcurrencyConflictError extends Error {\n  readonly entityName: string;\n  readonly entityId: string;\n  readonly expectedVersion: number;\n\n  constructor(entityName: string, entityId: string, expectedVersion: number) {\n    super(\`Concurrency conflict on \${entityName} with ID \${entityId}: expected version \${expectedVersion}.\`);\n    this.name = "ConcurrencyConflictError";\n    this.entityName = entityName;\n    this.entityId = entityId;\n    this.expectedVersion = expectedVersion;\n    Object.setPrototypeOf(this, new.target.prototype);\n  }\n}`,
      },
      {
        path: "src/domain/entities/inventory-item.entity.ts",
        description: "Domain entity with version column tracking mutation state",
        code: `export interface InventoryItem {\n  readonly id: string;\n  readonly sku: string;\n  readonly quantity: number;\n  readonly version: number;\n  readonly updatedAt: Date;\n}\n\nexport function createInventoryItem(id: string, sku: string, quantity: number): InventoryItem {\n  return {\n    id,\n    sku,\n    quantity,\n    version: 1,\n    updatedAt: new Date(),\n  };\n}\n\nexport function reserveInventory(item: InventoryItem, amount: number): InventoryItem {\n  if (item.quantity < amount) {\n    throw new Error(\`Insufficient stock for SKU \${item.sku}. Requested: \${amount}, Available: \${item.quantity}\`);\n  }\n  return {\n    ...item,\n    quantity: item.quantity - amount,\n    updatedAt: new Date(),\n  };\n}`,
      },
      {
        path: "src/infrastructure/db/inventory.repository.ts",
        description: "Repository executing conditional update with version check",
        code: `import { ConcurrencyConflictError } from "../../domain/errors/concurrency-conflict.error.js";\nimport type { InventoryItem } from "../../domain/entities/inventory-item.entity.js";\n\nexport interface DatabaseClient {\n  query<T>(sql: string, params: unknown[]): Promise<{ rows: T[]; rowCount: number }>;\n}\n\nexport class InventoryRepository {\n  constructor(private readonly db: DatabaseClient) {}\n\n  async findById(id: string): Promise<InventoryItem | null> {\n    const res = await this.db.query<InventoryItem>(\n      "SELECT id, sku, quantity, version, updated_at AS \\"updatedAt\\" FROM inventory_items WHERE id = $1",\n      [id],\n    );\n    return res.rows[0] ?? null;\n  }\n\n  async updateWithVersion(item: InventoryItem): Promise<InventoryItem> {\n    const nextVersion = item.version + 1;\n    const res = await this.db.query(\n      "UPDATE inventory_items SET quantity = $1, version = $2, updated_at = $3 WHERE id = $4 AND version = $5 RETURNING id, sku, quantity, version, updated_at",\n      [item.quantity, nextVersion, new Date(), item.id, item.version],\n    );\n\n    if (res.rowCount === 0) {\n      throw new ConcurrencyConflictError("InventoryItem", item.id, item.version);\n    }\n\n    return { ...item, version: nextVersion, updatedAt: new Date() };\n  }\n}`,
      },
      {
        path: "src/application/services/inventory-reservation.service.ts",
        description:
          "Application service executing reservation with exponential backoff retry loop",
        code: `import { ConcurrencyConflictError } from "../../domain/errors/concurrency-conflict.error.js";\nimport { reserveInventory, type InventoryItem } from "../../domain/entities/inventory-item.entity.js";\nimport type { InventoryRepository } from "../../infrastructure/db/inventory.repository.js";\n\nexport interface RetryOptions {\n  readonly maxRetries: number;\n  readonly initialDelayMs: number;\n  readonly backoffMultiplier: number;\n}\n\nconst DEFAULT_RETRY_OPTIONS: RetryOptions = {\n  maxRetries: 4,\n  initialDelayMs: 50,\n  backoffMultiplier: 2,\n};\n\nexport async function executeWithRetry<T>(\n  operation: () => Promise<T>,\n  options: RetryOptions = DEFAULT_RETRY_OPTIONS,\n): Promise<T> {\n  let delay = options.initialDelayMs;\n  for (let attempt = 0; attempt < options.maxRetries; attempt++) {\n    try {\n      return await operation();\n    } catch (error) {\n      if (!(error instanceof ConcurrencyConflictError) || attempt === options.maxRetries - 1) {\n        throw error;\n      }\n      await new Promise((resolve) => setTimeout(resolve, delay));\n      delay *= options.backoffMultiplier;\n    }\n  }\n  throw new Error("Retry loop exhausted without result");\n}\n\nexport class InventoryReservationService {\n  constructor(private readonly repository: InventoryRepository) {}\n\n  async reserve(itemId: string, quantity: number): Promise<InventoryItem> {\n    return executeWithRetry(async () => {\n      const current = await this.repository.findById(itemId);\n      if (!current) {\n        throw new Error(\`Inventory item \${itemId} not found\`);\n      }\n      const updated = reserveInventory(current, quantity);\n      return this.repository.updateWithVersion(updated);\n    });\n  }\n}`,
      },
    ],
    migrationSteps: [
      "1. Add version (INTEGER NOT NULL DEFAULT 1) column to target database tables.",
      "2. Update repository write operations to execute conditional UPDATE with WHERE id = $1 AND version = $2 and increment version.",
      "3. Map rowCount === 0 on conditional update to ConcurrencyConflictError domain exception.",
      "4. Wrap high-contention application service commands in exponential backoff retry loops.",
    ],
    verificationTests: [
      "Unit test: Verify update fails with ConcurrencyConflictError when database version does not match expected version.",
      "Integration test: Execute concurrent reservations against same record and verify retry loop successfully converges without lost updates.",
      "Unit test: Verify retry loop exhausts after max retries and propagates ConcurrencyConflictError when collision persists.",
    ],
  };
}

function getSagaScaffold(): RefactoringScaffold {
  return {
    patternName: "Distributed Saga Orchestration",
    architectureSummary:
      "Coordinates multi-step distributed workflows across autonomous services with state machine transitions and backward compensation on failure.",
    files: [
      {
        path: "src/domain/saga/saga-step.ts",
        description: "Step state machine definitions and step contracts",
        code: `export type StepState =\n  | "PENDING"\n  | "EXECUTING"\n  | "COMPLETED"\n  | "COMPENSATING"\n  | "COMPENSATED"\n  | "FAILED";\n\nexport interface SagaExecutionContext<TPayload = Record<string, unknown>> {\n  readonly sagaId: string;\n  readonly payload: TPayload;\n  readonly stepResults: Map<string, unknown>;\n  readonly errors: Error[];\n}\n\nexport interface SagaStep<TContext extends SagaExecutionContext = SagaExecutionContext> {\n  readonly name: string;\n  state: StepState;\n  execute(context: TContext): Promise<void>;\n  compensate(context: TContext): Promise<void>;\n}`,
      },
      {
        path: "src/application/saga/saga-coordinator.ts",
        description: "SagaExecutionCoordinator managing forward steps and compensating rollback",
        code: `import type { SagaExecutionContext, SagaStep } from "../../domain/saga/saga-step.js";\n\nexport interface SagaExecutionResult {\n  readonly sagaId: string;\n  readonly success: boolean;\n  readonly executedSteps: readonly string[];\n  readonly compensatedSteps: readonly string[];\n  readonly error?: Error | undefined;\n}\n\nexport class SagaExecutionCoordinator<TContext extends SagaExecutionContext> {\n  private readonly steps: SagaStep<TContext>[] = [];\n\n  registerStep(step: SagaStep<TContext>): this {\n    this.steps.push(step);\n    return this;\n  }\n\n  async execute(context: TContext): Promise<SagaExecutionResult> {\n    const executed: SagaStep<TContext>[] = [];\n    const executedNames: string[] = [];\n    const compensatedNames: string[] = [];\n\n    for (const step of this.steps) {\n      step.state = "EXECUTING";\n      try {\n        await step.execute(context);\n        step.state = "COMPLETED";\n        executed.push(step);\n        executedNames.push(step.name);\n      } catch (err) {\n        step.state = "FAILED";\n        const executionError = err instanceof Error ? err : new Error(String(err));\n        context.errors.push(executionError);\n\n        await this.rollback(executed, context, compensatedNames);\n\n        return {\n          sagaId: context.sagaId,\n          success: false,\n          executedSteps: executedNames,\n          compensatedSteps: compensatedNames,\n          error: executionError,\n        };\n      }\n    }\n\n    return {\n      sagaId: context.sagaId,\n      success: true,\n      executedSteps: executedNames,\n      compensatedSteps: compensatedNames,\n    };\n  }\n\n  private async rollback(\n    completedSteps: SagaStep<TContext>[],\n    context: TContext,\n    compensatedNames: string[],\n  ): Promise<void> {\n    for (let i = completedSteps.length - 1; i >= 0; i--) {\n      const step = completedSteps[i]!;\n      step.state = "COMPENSATING";\n      try {\n        await step.compensate(context);\n        step.state = "COMPENSATED";\n        compensatedNames.push(step.name);\n      } catch (compensationError) {\n        step.state = "FAILED";\n        const compErr = compensationError instanceof Error ? compensationError : new Error(String(compensationError));\n        context.errors.push(compErr);\n      }\n    }\n  }\n}`,
      },
      {
        path: "src/application/saga/order-fulfillment.saga.ts",
        description: "Order fulfillment workflow with forward operations and compensation steps",
        code: `import type { SagaExecutionContext, SagaStep } from "../../domain/saga/saga-step.js";\nimport { SagaExecutionCoordinator } from "./saga-coordinator.js";\n\nexport interface OrderSagaPayload {\n  readonly orderId: string;\n  readonly customerId: string;\n  readonly amount: number;\n}\n\nexport type OrderSagaContext = SagaExecutionContext<OrderSagaPayload>;\n\nexport class PaymentStep implements SagaStep<OrderSagaContext> {\n  readonly name = "PaymentStep";\n  state: SagaStep["state"] = "PENDING";\n\n  constructor(private readonly paymentService: { charge(id: string, amt: number): Promise<string>; refund(txId: string): Promise<void> }) {}\n\n  async execute(ctx: OrderSagaContext): Promise<void> {\n    const txId = await this.paymentService.charge(ctx.payload.orderId, ctx.payload.amount);\n    ctx.stepResults.set("paymentTransactionId", txId);\n  }\n\n  async compensate(ctx: OrderSagaContext): Promise<void> {\n    const txId = ctx.stepResults.get("paymentTransactionId") as string | undefined;\n    if (txId) {\n      await this.paymentService.refund(txId);\n      ctx.stepResults.delete("paymentTransactionId");\n    }\n  }\n}\n\nexport class InventoryReservationStep implements SagaStep<OrderSagaContext> {\n  readonly name = "InventoryReservationStep";\n  state: SagaStep["state"] = "PENDING";\n\n  constructor(private readonly inventoryService: { reserve(orderId: string): Promise<void>; release(orderId: string): Promise<void> }) {}\n\n  async execute(ctx: OrderSagaContext): Promise<void> {\n    await this.inventoryService.reserve(ctx.payload.orderId);\n  }\n\n  async compensate(ctx: OrderSagaContext): Promise<void> {\n    await this.inventoryService.release(ctx.payload.orderId);\n  }\n}\n\nexport function buildOrderFulfillmentSaga(\n  paymentService: ConstructorParameters<typeof PaymentStep>[0],\n  inventoryService: ConstructorParameters<typeof InventoryReservationStep>[0],\n): SagaExecutionCoordinator<OrderSagaContext> {\n  return new SagaExecutionCoordinator<OrderSagaContext>()\n    .registerStep(new PaymentStep(paymentService))\n    .registerStep(new InventoryReservationStep(inventoryService));\n}`,
      },
    ],
    migrationSteps: [
      "1. Define discrete transactional steps and corresponding compensation operations for the distributed business workflow.",
      "2. Implement SagaExecutionCoordinator with state machine tracking (PENDING -> EXECUTING -> COMPLETED / COMPENSATING -> COMPENSATED / FAILED).",
      "3. Ensure all step and compensation handlers are idempotent and accept branded correlation IDs.",
      "4. Introduce persistent saga log storage to allow recovery and manual reconciliation of stalled compensations.",
    ],
    verificationTests: [
      "Unit test: Forward execution completes all steps successfully when no errors occur.",
      "Unit test: Mid-saga failure triggers backward compensation of previously completed steps in reverse order.",
      "Unit test: Step state machine correctly reflects transitions through COMPENSATING to COMPENSATED upon rollback.",
    ],
  };
}

function getModularMonolithScaffold(): RefactoringScaffold {
  return {
    patternName: "Modular Monolith & In-Memory Domain Bus",
    architectureSummary:
      "Enforces strict bounded context encapsulation within a single deployable using public module APIs and a decoupled in-memory asynchronous domain event bus.",
    files: [
      {
        path: "src/shared/infrastructure/event-bus/domain-event-bus.ts",
        description:
          "In-memory asynchronous DomainEventBus with typed subscriptions and decoupled handlers",
        code: `export interface DomainEvent<TName extends string = string, TPayload = unknown> {\n  readonly eventId: string;\n  readonly eventName: TName;\n  readonly occurredOn: Date;\n  readonly payload: TPayload;\n}\n\nexport type DomainEventHandler<TEvent extends DomainEvent = DomainEvent> = (\n  event: TEvent,\n) => Promise<void> | void;\n\nexport class DomainEventBus {\n  private readonly handlers = new Map<string, Set<DomainEventHandler>>();\n\n  subscribe<TEvent extends DomainEvent>(\n    eventName: TEvent["eventName"],\n    handler: DomainEventHandler<TEvent>,\n  ): () => void {\n    const set = this.handlers.get(eventName) ?? new Set();\n    set.add(handler as DomainEventHandler);\n    this.handlers.set(eventName, set);\n    return () => {\n      set.delete(handler as DomainEventHandler);\n    };\n  }\n\n  async publish<TEvent extends DomainEvent>(event: TEvent): Promise<void> {\n    const set = this.handlers.get(event.eventName);\n    if (!set || set.size === 0) return;\n\n    const executions = Array.from(set).map(async (handler) => {\n      try {\n        await handler(event);\n      } catch (error) {\n        console.error(\`Error in event handler for \${event.eventName}:\`, error);\n      }\n    });\n\n    await Promise.all(executions);\n  }\n\n  clear(): void {\n    this.handlers.clear();\n  }\n}`,
      },
      {
        path: "src/modules/orders/public-api.ts",
        description:
          "Module bounded context definition with public API exports protecting internal implementation",
        code: `import type { DomainEvent } from "../../shared/infrastructure/event-bus/domain-event-bus.js";\n\nexport interface OrderPlacedPayload {\n  readonly orderId: string;\n  readonly customerId: string;\n  readonly totalAmount: number;\n}\n\nexport interface OrderPlacedEvent extends DomainEvent<"orders.order_placed", OrderPlacedPayload> {\n  readonly eventName: "orders.order_placed";\n}\n\nexport interface OrdersModuleApi {\n  placeOrder(customerId: string, items: readonly { sku: string; quantity: number }[]): Promise<string>;\n  getOrderStatus(orderId: string): Promise<"PENDING" | "CONFIRMED" | "CANCELLED">;\n}\n\nexport class OrdersModulePublicService implements OrdersModuleApi {\n  constructor(private readonly internalService: { create(cId: string, items: readonly { sku: string; quantity: number }[]): Promise<string>; get(id: string): Promise<"PENDING" | "CONFIRMED" | "CANCELLED"> }) {}\n\n  async placeOrder(customerId: string, items: readonly { sku: string; quantity: number }[]): Promise<string> {\n    return this.internalService.create(customerId, items);\n  }\n\n  async getOrderStatus(orderId: string): Promise<"PENDING" | "CONFIRMED" | "CANCELLED"> {\n    return this.internalService.get(orderId);\n  }\n}`,
      },
      {
        path: "src/modules/notifications/order-notification.listener.ts",
        description:
          "Decoupled cross-module event listener reacting to domain events without internal dependencies",
        code: `import type { DomainEventBus } from "../../shared/infrastructure/event-bus/domain-event-bus.js";\nimport type { OrderPlacedEvent } from "../orders/public-api.js";\n\nexport interface EmailSender {\n  send(to: string, subject: string, body: string): Promise<void>;\n}\n\nexport class OrderNotificationListener {\n  constructor(\n    private readonly eventBus: DomainEventBus,\n    private readonly emailSender: EmailSender,\n  ) {}\n\n  register(): () => void {\n    return this.eventBus.subscribe<OrderPlacedEvent>("orders.order_placed", async (event) => {\n      await this.emailSender.send(\n        event.payload.customerId,\n        "Order Confirmed",\n        \`Your order \${event.payload.orderId} for $\${event.payload.totalAmount} has been received.\`,\n      );\n    });\n  }\n}`,
      },
      {
        path: "eslint-boundaries.config.js",
        description:
          "ESLint / import boundary enforcement configuration preventing forbidden cross-module imports",
        code: `// ESLint / Biome boundary rule enforcement configuration\n// Place in .eslintrc.js or eslint.config.js with eslint-plugin-import or eslint-plugin-boundaries\nmodule.exports = {\n  rules: {\n    "import/no-restricted-paths": [\n      "error",\n      {\n        zones: [\n          {\n            target: "./src/modules/notifications",\n            from: "./src/modules/orders",\n            except: ["./public-api.ts"],\n            message: "Direct internal imports from orders module forbidden. Import only via src/modules/orders/public-api.ts or domain events.",\n          },\n          {\n            target: "./src/modules/orders",\n            from: "./src/modules/notifications",\n            except: ["./public-api.ts"],\n            message: "Direct internal imports from notifications module forbidden. Use public-api.ts.",\n          },\n        ],\n      },\n    ],\n  },\n};`,
      },
    ],
    migrationSteps: [
      "1. Organize codebase into bounded context directories (src/modules/<module-name>/) with private internals and a single public-api.ts.",
      "2. Introduce an asynchronous in-memory DomainEventBus for cross-module side-effects without direct synchronous dependencies.",
      "3. Replace direct cross-module database joins or repository calls with domain events or public API facade methods.",
      "4. Configure ESLint / Biome import boundary rules to prevent cross-module leaks of non-public internals.",
    ],
    verificationTests: [
      "Unit test: DomainEventBus delivers events asynchronously to multiple decoupled module subscribers.",
      "Integration test: Public API facade correctly delegates to internal service without exposing internal domain entities.",
      "Static analysis test: Boundary linter rejects direct imports from non-public-api files across modules.",
    ],
  };
}

function getStranglerFigScaffold(): RefactoringScaffold {
  return {
    patternName: "Strangler Fig & Branch by Abstraction",
    architectureSummary:
      "Gradually migrates traffic from legacy services to modern implementations via dynamic feature routing, dark launch shadow execution, and sub-millisecond fallback.",
    files: [
      {
        path: "src/domain/ports/pricing-service.port.ts",
        description: "Shared port abstraction for legacy and modern pricing services",
        code: `export interface PriceCalculationRequest {\n  readonly customerId: string;\n  readonly cartItems: readonly { sku: string; price: number; quantity: number }[];\n  readonly discountCode?: string | undefined;\n}\n\nexport interface PriceCalculationResponse {\n  readonly subtotal: number;\n  readonly discountAmount: number;\n  readonly total: number;\n  readonly source: "legacy" | "modern";\n}\n\nexport interface PricingServicePort {\n  calculate(request: PriceCalculationRequest): Promise<PriceCalculationResponse>;\n}`,
      },
      {
        path: "src/infrastructure/strangler/strangler-proxy.ts",
        description:
          "Dynamic routing proxy evaluating feature flags, circuit breaker health, shadow execution, and fallback",
        code: `import type {\n  PriceCalculationRequest,\n  PriceCalculationResponse,\n  PricingServicePort,\n} from "../../domain/ports/pricing-service.port.js";\n\nexport interface FeatureFlags {\n  isEnabled(flag: string, context?: Record<string, unknown>): Promise<boolean> | boolean;\n}\n\nexport interface CircuitHealthIndicator {\n  isHealthy(serviceName: string): boolean;\n  recordSuccess(serviceName: string): void;\n  recordFailure(serviceName: string, error: unknown): void;\n}\n\nexport interface ShadowExecutionTap<TReq, TRes> {\n  onShadowResult(request: TReq, legacyResult: TRes, modernResult: TRes | null, error?: Error): void;\n}\n\nexport class StranglerPricingProxy implements PricingServicePort {\n  constructor(\n    private readonly legacyService: PricingServicePort,\n    private readonly modernService: PricingServicePort,\n    private readonly featureFlags: FeatureFlags,\n    private readonly healthIndicator: CircuitHealthIndicator,\n    private readonly shadowTap?: ShadowExecutionTap<PriceCalculationRequest, PriceCalculationResponse>,\n    private readonly modernTimeoutMs = 150,\n  ) {}\n\n  async calculate(request: PriceCalculationRequest): Promise<PriceCalculationResponse> {\n    const isModernEnabled = await this.featureFlags.isEnabled("modern_pricing_engine", {\n      customerId: request.customerId,\n    });\n    const isModernHealthy = this.healthIndicator.isHealthy("modern_pricing_service");\n\n    if (isModernEnabled && isModernHealthy) {\n      try {\n        const modernResult = await this.executeWithTimeout(\n          () => this.modernService.calculate(request),\n          this.modernTimeoutMs,\n        );\n        this.healthIndicator.recordSuccess("modern_pricing_service");\n        return modernResult;\n      } catch (err) {\n        this.healthIndicator.recordFailure("modern_pricing_service", err);\n        return this.legacyService.calculate(request);\n      }\n    }\n\n    const legacyResult = await this.legacyService.calculate(request);\n\n    if (this.shadowTap && isModernHealthy) {\n      void this.executeShadow(request, legacyResult);\n    }\n\n    return legacyResult;\n  }\n\n  private async executeWithTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {\n    let timer: NodeJS.Timeout | undefined;\n    const timeoutPromise = new Promise<never>((_, reject) => {\n      timer = setTimeout(() => reject(new Error(\`Timeout after \${timeoutMs}ms\`)), timeoutMs);\n    });\n    try {\n      return await Promise.race([fn(), timeoutPromise]);\n    } finally {\n      if (timer) clearTimeout(timer);\n    }\n  }\n\n  private async executeShadow(\n    request: PriceCalculationRequest,\n    legacyResult: PriceCalculationResponse,\n  ): Promise<void> {\n    try {\n      const modernResult = await this.modernService.calculate(request);\n      this.shadowTap?.onShadowResult(request, legacyResult, modernResult);\n    } catch (err) {\n      const shadowError = err instanceof Error ? err : new Error(String(err));\n      this.shadowTap?.onShadowResult(request, legacyResult, null, shadowError);\n    }\n  }\n}`,
      },
      {
        path: "src/infrastructure/strangler/shadow-parity-reporter.ts",
        description:
          "Shadow execution tap recording discrepancies between legacy and modern implementations",
        code: `import type { PriceCalculationRequest, PriceCalculationResponse } from "../../domain/ports/pricing-service.port.js";\nimport type { ShadowExecutionTap } from "./strangler-proxy.js";\n\nexport interface ParityMismatch {\n  readonly timestamp: Date;\n  readonly request: PriceCalculationRequest;\n  readonly legacyTotal: number;\n  readonly modernTotal?: number | undefined;\n  readonly error?: string | undefined;\n}\n\nexport class ShadowParityReporter implements ShadowExecutionTap<PriceCalculationRequest, PriceCalculationResponse> {\n  private readonly mismatches: ParityMismatch[] = [];\n\n  onShadowResult(\n    request: PriceCalculationRequest,\n    legacyResult: PriceCalculationResponse,\n    modernResult: PriceCalculationResponse | null,\n    error?: Error,\n  ): void {\n    if (error || !modernResult || legacyResult.total !== modernResult.total) {\n      this.mismatches.push({\n        timestamp: new Date(),\n        request,\n        legacyTotal: legacyResult.total,\n        modernTotal: modernResult?.total,\n        error: error?.message,\n      });\n    }\n  }\n\n  getMismatches(): readonly ParityMismatch[] {\n    return [...this.mismatches];\n  }\n}`,
      },
    ],
    migrationSteps: [
      "1. Define a shared abstraction interface (PricingServicePort) covering both legacy and new capabilities.",
      "2. Implement Strangler routing proxy with feature flag evaluation and circuit breaker health checks.",
      "3. Enable dark launching / shadow execution tap to compare legacy and modern outputs in production without side effects.",
      "4. Incrementally route live traffic to modern implementation with instant fallback to legacy on timeout or error.",
      "5. Decommission legacy service and remove routing proxy once 100% traffic parity is verified.",
    ],
    verificationTests: [
      "Unit test: Proxy routes to modern service when feature flag is enabled and modern service is healthy.",
      "Unit test: Proxy transparently falls back to legacy service when modern service times out or throws an error.",
      "Unit test: Shadow execution tap records discrepancies between legacy and modern calculation results without affecting response.",
    ],
  };
}

export function synthesizeRefactoring(patternName: string): RefactoringScaffold {
  const norm = patternName.toLowerCase();
  if (norm.includes("outbox") || norm.includes("dual")) return getOutboxScaffold();
  if (norm.includes("concurrency") || norm.includes("optimistic") || norm.includes("occ"))
    return getOptimisticConcurrencyScaffold();
  if (norm.includes("saga") || norm.includes("orchestrat")) return getSagaScaffold();
  if (
    norm.includes("modular") ||
    norm.includes("monolith") ||
    norm.includes("domain-bus") ||
    norm.includes("event-bus")
  )
    return getModularMonolithScaffold();
  if (
    norm.includes("strangler") ||
    norm.includes("branch by abstraction") ||
    norm.includes("shadow")
  )
    return getStranglerFigScaffold();
  if (norm.includes("circuit") || norm.includes("timeout") || norm.includes("resilience"))
    return getCircuitBreakerScaffold();
  if (norm.includes("strategy") || norm.includes("policy") || norm.includes("discount"))
    return getStrategyScaffold();
  return getAdapterScaffold();
}
