import { buildFitnessArtifacts } from "./fitness-rules-artifacts.js";
import { formatFitnessRulesMarkdown } from "./fitness-rules-markdown.js";
import type { ArchitectureFitnessRules, FitnessFramework } from "./fitness-rules-types.js";

export function getPortsAndAdaptersRules(_framework?: FitnessFramework): ArchitectureFitnessRules {
  const eslintConfig = `{\n  "rules": {\n    "@typescript-eslint/no-restricted-imports": [\n      "error",\n      {\n        "patterns": [\n          {\n            "group": ["**/infrastructure/**", "**/adapters/**", "axios", "express", "pg", "@aws-sdk/*"],\n            "message": "Domain core must not import infrastructure or vendor SDKs. Use domain ports."\n          }\n        ]\n      }\n    ]\n  },\n  "overrides": [\n    {\n      "files": ["src/domain/**/*.ts"],\n      "rules": {\n        "@typescript-eslint/no-restricted-imports": [\n          "error",\n          {\n            "patterns": [\n              {\n                "group": ["**/infrastructure/**", "**/application/**", "**/adapters/**", "../*"],\n                "message": "Domain entities and ports must have zero outer dependencies."\n              }\n            ]\n          }\n        ]\n      }\n    }\n  ]\n}`;
  const testCode = `import { readFileSync, readdirSync } from "node:fs";\nimport { join } from "node:path";\nimport { describe, expect, it } from "vitest";\n\nfunction scanDir(dir: string): string[] {\n  try {\n    const entries = readdirSync(dir, { withFileTypes: true });\n    return entries.flatMap((e) =>\n      e.isDirectory() ? scanDir(join(dir, e.name)) : [join(dir, e.name)],\n    );\n  } catch {\n    return [];\n  }\n}\n\ndescribe("Architectural Fitness: Ports & Adapters Isolation", () => {\n  const domainFiles = scanDir("src/domain").filter((f) => f.endsWith(".ts"));\n\n  it("domain layer has zero imports from infrastructure or external SDKs", () => {\n    const forbidden = [/from\\s+['"].*infrastructure.*['"]/, /from\\s+['"](axios|express|pg|@aws-sdk)['"]/];\n    const violations = domainFiles.filter((f) => {\n      const code = readFileSync(f, "utf8");\n      return forbidden.some((regex) => regex.test(code));\n    });\n    expect(violations, "Domain files must not import infrastructure or SDKs").toEqual([]);\n  });\n\n  it("domain ports are abstract interfaces or pure functions", () => {\n    const portFiles = domainFiles.filter((f) => f.includes("/ports/"));\n    for (const file of portFiles) {\n      const code = readFileSync(file, "utf8");\n      expect(code).not.toMatch(/new\\s+[A-Z]\\\\w+Client/);\n    }\n  });\n});`;
  const ciScript = `# Enforce ESLint boundary rules\nnpx eslint src/domain/ --max-warnings=0\n# Run Vitest architectural fitness test\nnpx vitest run test/fitness/ports-adapters.fitness.test.ts\n# Static grep verification guard\n! grep -rnE "from ['\\"].*(infrastructure|adapters)" src/domain/`;

  const rules: ArchitectureFitnessRules = {
    patternName: "Ports & Adapters (Hexagonal Architecture)",
    architectureStyle: "Hexagonal / Clean Architecture",
    description:
      "Isolates the domain core behind port interfaces and prevents infrastructure leakage and vendor SDK contamination.",
    boundaryRules: [
      {
        sourceLayer: "src/domain/**",
        forbiddenTargetLayers: [
          "src/infrastructure/**",
          "src/application/**",
          "external vendor SDKs (axios, express, pg, @aws-sdk)",
        ],
        reason:
          "Domain core must remain pure business logic without technical or framework dependencies.",
      },
      {
        sourceLayer: "src/application/**",
        forbiddenTargetLayers: ["src/infrastructure/**"],
        reason: "Application services depend only on domain ports, never concrete adapters.",
      },
    ],
    eslintRules: {
      description:
        "Restricts infrastructure, application, and vendor imports within the domain directory.",
      plugin: "@typescript-eslint/no-restricted-imports",
      config: eslintConfig,
    },
    fitnessTests: {
      framework: "vitest",
      filename: "test/fitness/ports-adapters.fitness.test.ts",
      testCode,
    },
    ciCommands: {
      bashScript: ciScript,
      commands: [
        "npx eslint src/domain/ --max-warnings=0",
        "npx vitest run test/fitness/ports-adapters.fitness.test.ts",
        '! grep -rnE "from [\'\\"].*(infrastructure|adapters)" src/domain/',
      ],
    },
    files: buildFitnessArtifacts(
      ".eslintrc.boundaries.json",
      eslintConfig,
      "test/fitness/ports-adapters.fitness.test.ts",
      testCode,
      ciScript,
    ),
    markdownSummary: "",
  };

  return { ...rules, markdownSummary: formatFitnessRulesMarkdown(rules) };
}

export function getCleanArchitectureRules(framework?: FitnessFramework): ArchitectureFitnessRules {
  return getPortsAndAdaptersRules(framework);
}
