import { buildFitnessArtifacts } from "./fitness-rules-artifacts.js";
import { formatFitnessRulesMarkdown } from "./fitness-rules-markdown.js";
import type { ArchitectureFitnessRules, FitnessFramework } from "./fitness-rules-types.js";

export function getSagaRules(_framework?: FitnessFramework): ArchitectureFitnessRules {
  const eslintConfig = `{\n  "rules": {\n    "@typescript-eslint/no-restricted-imports": [\n      "error",\n      {\n        "patterns": [\n          { "group": ["**/db/transactions/**"], "message": "Cross-service sagas must not use distributed 2PC or ambient transactions. Use compensation." }\n        ]\n      }\n    ]\n  }\n}`;
  const testCode = `import { readFileSync, readdirSync } from "node:fs";\nimport { join } from "node:path";\nimport { describe, expect, it } from "vitest";\n\nfunction scanDir(dir: string): string[] {\n  try {\n    const entries = readdirSync(dir, { withFileTypes: true });\n    return entries.flatMap((e) =>\n      e.isDirectory() ? scanDir(join(dir, e.name)) : [join(dir, e.name)],\n    );\n  } catch {\n    return [];\n  }\n}\n\ndescribe("Architectural Fitness: Saga Compensation Completeness", () => {\n  const sagaFiles = scanDir("src/application/saga").filter((f) => f.endsWith(".ts"));\n\n  it("every saga step defines compensation logic", () => {\n    const missingCompensation = sagaFiles.filter((f) => {\n      const code = readFileSync(f, "utf8");\n      return code.includes("implements SagaStep") && !code.includes("compensate(");\n    });\n    expect(missingCompensation, "All saga steps must implement compensate()").toEqual([]);\n  });\n});`;
  const ciScript = `# Run Vitest saga fitness test\nnpx vitest run test/fitness/saga.fitness.test.ts`;

  const rules: ArchitectureFitnessRules = {
    patternName: "Distributed Saga Orchestration",
    architectureStyle: "Saga / Eventual Consistency Coordination",
    description:
      "Enforces state machine tracking and compensating rollback steps across distributed workflows.",
    boundaryRules: [
      {
        sourceLayer: "src/application/saga/**",
        forbiddenTargetLayers: ["2PC distributed transactions"],
        reason:
          "Sagas must maintain forward execution and backward compensation rather than blocking locking transactions.",
      },
    ],
    eslintRules: {
      description:
        "Restricts distributed transactions and requires explicit compensation methods in saga steps.",
      plugin: "@typescript-eslint/no-restricted-imports",
      config: eslintConfig,
    },
    fitnessTests: {
      framework: "vitest",
      filename: "test/fitness/saga.fitness.test.ts",
      testCode,
    },
    ciCommands: {
      bashScript: ciScript,
      commands: ["npx vitest run test/fitness/saga.fitness.test.ts"],
    },
    files: buildFitnessArtifacts(
      ".eslintrc.boundaries.json",
      eslintConfig,
      "test/fitness/saga.fitness.test.ts",
      testCode,
      ciScript,
    ),
    markdownSummary: "",
  };

  return { ...rules, markdownSummary: formatFitnessRulesMarkdown(rules) };
}

export function getStranglerRules(_framework?: FitnessFramework): ArchitectureFitnessRules {
  const eslintConfig = `{\n  "overrides": [\n    {\n      "files": ["src/domain/**/*.ts", "src/application/**/*.ts"],\n      "rules": {\n        "@typescript-eslint/no-restricted-imports": [\n          "error",\n          {\n            "patterns": [\n              { "group": ["**/infrastructure/legacy/**", "**/legacy-client/**"], "message": "Direct legacy client imports forbidden. Use strangler proxy adapter." }\n            ]\n          }\n        ]\n      }\n    }\n  ]\n}`;
  const testCode = `import { readFileSync, readdirSync } from "node:fs";\nimport { join } from "node:path";\nimport { describe, expect, it } from "vitest";\n\nfunction scanDir(dir: string): string[] {\n  try {\n    const entries = readdirSync(dir, { withFileTypes: true });\n    return entries.flatMap((e) =>\n      e.isDirectory() ? scanDir(join(dir, e.name)) : [join(dir, e.name)],\n    );\n  } catch {\n    return [];\n  }\n}\n\ndescribe("Architectural Fitness: Strangler Fig Legacy Isolation", () => {\n  const modernFiles = scanDir("src/domain").concat(scanDir("src/application")).filter((f) => f.endsWith(".ts"));\n\n  it("modern code does not import legacy clients directly", () => {\n    const forbidden = [/from\\s+['"].*legacy.*['"]/];\n    const violations = modernFiles.filter((f) => {\n      const code = readFileSync(f, "utf8");\n      return forbidden.some((regex) => regex.test(code));\n    });\n    expect(violations, "Legacy system calls must go through Strangler facade").toEqual([]);\n  });\n});`;
  const ciScript = `# Verify legacy isolation\nnpx eslint src/domain/ src/application/ --max-warnings=0\n# Run Vitest strangler fitness test\nnpx vitest run test/fitness/strangler.fitness.test.ts\n# Static verification\n! grep -rnE "from ['\\"].*legacy.*['\\"]" src/domain/ src/application/`;

  const rules: ArchitectureFitnessRules = {
    patternName: "Strangler Fig & Branch by Abstraction",
    architectureStyle: "Incremental Migration / Legacy Quarantine",
    description:
      "Quarantines legacy systems behind routing proxy facades with dark launching, shadow taps, and fallback.",
    boundaryRules: [
      {
        sourceLayer: "src/domain/**, src/application/**",
        forbiddenTargetLayers: ["src/infrastructure/legacy/**"],
        reason: "Legacy system adapters must be encapsulated behind the strangler proxy facade.",
      },
    ],
    eslintRules: {
      description:
        "Restricts direct imports of legacy system adapters across modern domain and application services.",
      plugin: "@typescript-eslint/no-restricted-imports",
      config: eslintConfig,
    },
    fitnessTests: {
      framework: "vitest",
      filename: "test/fitness/strangler.fitness.test.ts",
      testCode,
    },
    ciCommands: {
      bashScript: ciScript,
      commands: [
        "npx eslint src/domain/ src/application/ --max-warnings=0",
        "npx vitest run test/fitness/strangler.fitness.test.ts",
        '! grep -rnE "from [\'\\"].*legacy.*[\'\\"]" src/domain/ src/application/',
      ],
    },
    files: buildFitnessArtifacts(
      ".eslintrc.boundaries.json",
      eslintConfig,
      "test/fitness/strangler.fitness.test.ts",
      testCode,
      ciScript,
    ),
    markdownSummary: "",
  };

  return { ...rules, markdownSummary: formatFitnessRulesMarkdown(rules) };
}
