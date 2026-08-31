import { buildFitnessArtifacts } from "./fitness-rules-artifacts.js";
import { formatFitnessRulesMarkdown } from "./fitness-rules-markdown.js";
import type { ArchitectureFitnessRules, FitnessFramework } from "./fitness-rules-types.js";

export function getResilienceRules(_framework?: FitnessFramework): ArchitectureFitnessRules {
  const eslintConfig = `{\n  "overrides": [\n    {\n      "files": ["src/domain/**/*.ts", "src/application/**/*.ts"],\n      "rules": {\n        "@typescript-eslint/no-restricted-imports": [\n          "error",\n          {\n            "paths": [\n              { "name": "axios", "message": "Raw HTTP clients forbidden in domain/app logic. Use resilient gateway adapters." },\n              { "name": "node-fetch", "message": "Raw HTTP clients forbidden in domain/app logic. Use resilient gateway adapters." },\n              { "name": "got", "message": "Raw HTTP clients forbidden in domain/app logic. Use resilient gateway adapters." }\n            ]\n          }\n        ]\n      }\n    }\n  ]\n}`;
  const testCode = `import { readFileSync, readdirSync } from "node:fs";\nimport { join } from "node:path";\nimport { describe, expect, it } from "vitest";\n\nfunction scanDir(dir: string): string[] {\n  try {\n    const entries = readdirSync(dir, { withFileTypes: true });\n    return entries.flatMap((e) =>\n      e.isDirectory() ? scanDir(join(dir, e.name)) : [join(dir, e.name)],\n    );\n  } catch {\n    return [];\n  }\n}\n\ndescribe("Architectural Fitness: Resilience and Remote Isolation", () => {\n  const businessFiles = scanDir("src/domain").concat(scanDir("src/application")).filter((f) => f.endsWith(".ts"));\n\n  it("domain and application logic do not perform bare HTTP calls", () => {\n    const forbidden = [/from\\s+['"](axios|got|node-fetch)['"]/, /\\bfetch\\(/];\n    const violations = businessFiles.filter((f) => {\n      const code = readFileSync(f, "utf8");\n      return forbidden.some((regex) => regex.test(code));\n    });\n    expect(violations, "Bare HTTP calls must be wrapped in resilience adapters").toEqual([]);\n  });\n});`;
  const ciScript = `# Enforce raw HTTP client ban in domain and application logic\nnpx eslint src/domain/ src/application/ --max-warnings=0\n# Run Vitest resilience fitness test\nnpx vitest run test/fitness/resilience.fitness.test.ts\n# Static verification\n! grep -rnE "from ['"](axios|got|node-fetch)['"]" src/domain/ src/application/`;

  const rules: ArchitectureFitnessRules = {
    patternName: "Circuit Breaker & Resilience Gateway",
    architectureStyle: "Distributed Resilience / Fault Isolation",
    description:
      "Isolates remote network dependencies behind circuit breakers, timeouts, and fallback policies.",
    boundaryRules: [
      {
        sourceLayer: "src/domain/**, src/application/**",
        forbiddenTargetLayers: ["axios", "got", "node-fetch", "raw HTTP APIs"],
        reason: "Network calls must be isolated inside infrastructure resilience adapters.",
      },
    ],
    eslintRules: {
      description: "Restricts bare HTTP and RPC clients in domain and application logic.",
      plugin: "@typescript-eslint/no-restricted-imports",
      config: eslintConfig,
    },
    fitnessTests: {
      framework: "vitest",
      filename: "test/fitness/resilience.fitness.test.ts",
      testCode,
    },
    ciCommands: {
      bashScript: ciScript,
      commands: [
        "npx eslint src/domain/ src/application/ --max-warnings=0",
        "npx vitest run test/fitness/resilience.fitness.test.ts",
        '! grep -rnE "from [\'\\"](axios|got|node-fetch)[\'\\"]" src/domain/ src/application/',
      ],
    },
    files: buildFitnessArtifacts(
      ".eslintrc.boundaries.json",
      eslintConfig,
      "test/fitness/resilience.fitness.test.ts",
      testCode,
      ciScript,
    ),
    markdownSummary: "",
  };

  return { ...rules, markdownSummary: formatFitnessRulesMarkdown(rules) };
}

export function getConcurrencyRules(_framework?: FitnessFramework): ArchitectureFitnessRules {
  const eslintConfig = `{\n  "rules": {\n    "@typescript-eslint/no-restricted-syntax": [\n      "error",\n      {\n        "selector": "TSInterfaceDeclaration[id.name=/.*Entity$/]:not(:has(TSPropertySignature[key.name='version']))",\n        "message": "High-contention domain entities must declare a readonly version: number attribute for OCC."\n      }\n    ]\n  }\n}`;
  const testCode = `import { readFileSync, readdirSync } from "node:fs";\nimport { join } from "node:path";\nimport { describe, expect, it } from "vitest";\n\nfunction scanDir(dir: string): string[] {\n  try {\n    const entries = readdirSync(dir, { withFileTypes: true });\n    return entries.flatMap((e) =>\n      e.isDirectory() ? scanDir(join(dir, e.name)) : [join(dir, e.name)],\n    );\n  } catch {\n    return [];\n  }\n}\n\ndescribe("Architectural Fitness: Optimistic Concurrency Control", () => {\n  const entityFiles = scanDir("src/domain/entities").filter((f) => f.endsWith(".ts"));\n\n  it("domain entities define version field for collision detection", () => {\n    const missingVersion = entityFiles.filter((f) => {\n      const code = readFileSync(f, "utf8");\n      return !/readonly\\s+version:\\s*number/.test(code);\n    });\n    expect(missingVersion, "Domain entities must track version numbers").toEqual([]);\n  });\n});`;
  const ciScript = `# Verify OCC versioning rules\nnpx eslint src/domain/entities/ --max-warnings=0\n# Run Vitest OCC fitness test\nnpx vitest run test/fitness/concurrency.fitness.test.ts`;

  const rules: ArchitectureFitnessRules = {
    patternName: "Optimistic Concurrency Control (OCC)",
    architectureStyle: "Optimistic Locking / Conflict Detection",
    description:
      "Enforces entity versioning and conditional database writes to detect and handle concurrent write collisions.",
    boundaryRules: [
      {
        sourceLayer: "src/domain/entities/**",
        forbiddenTargetLayers: ["entities without version number"],
        reason: "Mutable aggregate roots require version attributes for optimistic locking.",
      },
    ],
    eslintRules: {
      description: "Requires version tracking fields across all stateful domain entities.",
      plugin: "@typescript-eslint/no-restricted-imports",
      config: eslintConfig,
    },
    fitnessTests: {
      framework: "vitest",
      filename: "test/fitness/concurrency.fitness.test.ts",
      testCode,
    },
    ciCommands: {
      bashScript: ciScript,
      commands: [
        "npx eslint src/domain/entities/ --max-warnings=0",
        "npx vitest run test/fitness/concurrency.fitness.test.ts",
      ],
    },
    files: buildFitnessArtifacts(
      ".eslintrc.boundaries.json",
      eslintConfig,
      "test/fitness/concurrency.fitness.test.ts",
      testCode,
      ciScript,
    ),
    markdownSummary: "",
  };

  return { ...rules, markdownSummary: formatFitnessRulesMarkdown(rules) };
}
