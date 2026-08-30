import * as z from "zod/v4";

export const scaleSchema = z.object({
  throughput: z.enum(["low", "moderate", "high", "extreme"]).optional(),
  dataVolume: z.enum(["small", "moderate", "large", "massive"]).optional(),
  geographicDistribution: z.enum(["single-region", "multi-region", "global"]).optional(),
  tenancy: z.enum(["single", "multi-tenant", "highly-isolated"]).optional(),
});

export const teamSchema = z.object({
  size: z.number().int().min(1).max(10_000).optional(),
  experience: z.enum(["learning", "mixed", "experienced"]).optional(),
  operationsCapacity: z.enum(["limited", "moderate", "dedicated"]).optional(),
});

export const designCaseSchema = z.object({
  problem: z.string().min(10).describe("The concrete design problem or decision."),
  context: z.string().optional().describe("Relevant product and runtime context."),
  currentArchitecture: z.string().optional(),
  symptoms: z.array(z.string()).default([]),
  goals: z.array(z.string()).default([]),
  constraints: z.array(z.string()).default([]),
  failureModes: z.array(z.string()).default([]),
  changeAxes: z.array(z.string()).default([]),
  antiGoals: z.array(z.string()).default([]),
  candidatePatterns: z.array(z.string()).default([]),
  evidence: z.array(z.string()).default([]),
  scale: scaleSchema.optional(),
  team: teamSchema.optional(),
  consistency: z
    .enum(["strong", "bounded-staleness", "eventual", "not-applicable", "unknown"])
    .default("unknown"),
  delivery: z
    .enum([
      "in-process",
      "request-response",
      "at-most-once",
      "at-least-once",
      "exactly-once-claimed",
      "unknown",
    ])
    .default("unknown"),
  statefulness: z.enum(["stateless", "stateful", "mixed", "unknown"]).default("unknown"),
  complexityBudget: z.enum(["minimal", "moderate", "substantial"]).default("moderate"),
  riskTolerance: z.enum(["low", "medium", "high"]).default("medium"),
});

export const designCasePatchSchema = designCaseSchema
  .partial()
  .omit({ problem: true })
  .extend({
    problem: z.string().min(10).optional(),
  });

export const scenarioMutationSchema = z.object({
  name: z.string().min(3),
  patch: designCasePatchSchema,
});

export type DesignCase = z.infer<typeof designCaseSchema>;
export type DesignCaseInput = z.input<typeof designCaseSchema>;
export type DesignCasePatch = z.infer<typeof designCasePatchSchema>;
