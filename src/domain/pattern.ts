import * as z from "zod/v4";

export const patternLayerSchema = z.enum([
  "language",
  "object-creation",
  "object-structure",
  "object-behavior",
  "application-domain",
  "integration-messaging",
  "distributed-systems",
  "concurrency",
  "testing",
  "architecture",
]);

export const costSchema = z.enum(["low", "medium", "high"]);

export const patternSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  track: z.string().min(1),
  trackTitle: z.string().min(1),
  layer: patternLayerSchema,
  problem: z.string().min(1),
  exampleContext: z.string().min(1),
  mechanism: z.string().min(1),
  simplerAlternative: z.string().min(1),
  misuse: z.string().min(1),
  evidence: z.string().min(1),
  typescript: z.string().min(1),
  related: z.array(z.string()),
  relatedConcepts: z.array(z.string()),
  adoptionCost: costSchema,
  operationalCost: costSchema,
  level: z.enum(["core", "advanced"]),
  signals: z.array(z.string()),
});

export const catalogSchema = z.object({
  schemaVersion: z.literal(1),
  patternCount: z.number().int().positive(),
  tracks: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      layer: patternLayerSchema,
    }),
  ),
  patterns: z.array(patternSchema),
});

export type Pattern = z.infer<typeof patternSchema>;
export type PatternCatalog = z.infer<typeof catalogSchema>;
export type PatternLayer = z.infer<typeof patternLayerSchema>;
export type Cost = z.infer<typeof costSchema>;
