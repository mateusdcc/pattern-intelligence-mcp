import * as z from "zod/v4";

import { designCaseSchema, scenarioMutationSchema } from "../domain/design-case.js";
import { costSchema, patternLayerSchema } from "../domain/pattern.js";

export const analyzeInputSchema = z.object({
  case: designCaseSchema,
  maxRecommendations: z.number().int().min(1).max(10).default(6),
});

export const compareInputSchema = z.object({
  case: designCaseSchema,
  patterns: z.array(z.string()).min(2).max(6),
});

export const misuseInputSchema = z.object({
  case: designCaseSchema,
  patternsInUse: z.array(z.string()).min(1).max(12),
});

export const stressTestInputSchema = z.object({
  case: designCaseSchema,
  scenarios: z.array(scenarioMutationSchema).min(1).max(12),
});

export const patternDecisionInputSchema = z.object({
  case: designCaseSchema,
  pattern: z.string().min(1),
});

export const adrInputSchema = z.object({
  title: z.string().min(3).max(120),
  case: designCaseSchema,
});

export const graphInputSchema = z.object({
  text: z.string().min(10).optional(),
  seedPatterns: z.array(z.string()).max(8).optional(),
  layers: z.array(patternLayerSchema).optional(),
  maxAdoptionCost: costSchema.default("high"),
  limit: z.number().int().min(1).max(30).default(12),
});

export const codeQualityInputSchema = z.object({
  code: z.string().min(5),
  fileName: z.string().optional().default("component.ts"),
});

export const synthesizeRefactoringInputSchema = z.object({
  pattern: z.string().min(2),
});

export const prescribeArchitectureInputSchema = z.object({
  case: designCaseSchema,
});

export const refactorSmellInputSchema = z.object({
  code: z.string().min(5),
  fileName: z.string().optional().default("component.ts"),
});
