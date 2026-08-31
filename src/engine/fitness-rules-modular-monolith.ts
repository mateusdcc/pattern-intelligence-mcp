import { buildFitnessArtifacts } from "./fitness-rules-artifacts.js";
import { formatFitnessRulesMarkdown } from "./fitness-rules-markdown.js";
import type { ArchitectureFitnessRules, FitnessFramework } from "./fitness-rules-types.js";

export function getModularMonolithRules(_framework?: FitnessFramework): ArchitectureFitnessRules {
  const eslintConfig = `{\n  "rules": {\n    "import/no-restricted-paths": [\n      "error",\n      {\n        "zones": [\n          {\n            "target": "./src/modules/*",\n            "from": "./src/modules/*",\n            "except": ["./public-api.ts"],\n            "message": "Private module internals cannot be imported directly. Import only via public-api.ts or domain events."\n          }\n        ]\n      }\n    ]\n  }\n}`;
  const testCode = `import { readFileSync, readdirSync } from "node:fs";\nimport { join } from "node:path";\nimport { describe, expect, it } from "vitest";\n\nfunction getModuleFiles(dir = "src/modules"): string[] {\n  try {\n    const entries = readdirSync(dir, { withFileTypes: true });\n    return entries.flatMap((e) =>\n      e.isDirectory() ? getModuleFiles(join(dir, e.name)) : [join(dir, e.name)],\n    );\n  } catch {\n    return [];\n  }\n}\n\ndescribe("Architectural Fitness: Modular Monolith Boundaries", () => {\n  const moduleFiles = getModuleFiles().filter((f) => f.endsWith(".ts"));\n\n  it("cross-module imports only reference public-api or contracts", () => {\n    const violations: string[] = [];\n    for (const file of moduleFiles) {\n      const code = readFileSync(file, "utf8");\n      const match = code.match(/from\\s+['"]\\.\\./[a-zA-Z0-9_-]+/(?!public-api|contracts|events)[^'"]+['"]/g);\n      if (match) violations.push(\`\${file}: \${match.join(", ")}\`);\n    }\n    expect(violations, "Cross-module private internal imports forbidden").toEqual([]);\n  });\n});`;
  const ciScript = `# Enforce ESLint module boundaries\nnpx eslint src/modules/ --max-warnings=0\n# Run Vitest modular monolith fitness test\nnpx vitest run test/fitness/modular-monolith.fitness.test.ts\n# Verify cross-module imports target only public-api\n! grep -rnE "from ['"]\\.\\./[a-zA-Z0-9_-]+/(?!public-api)" src/modules/`;

  const rules: ArchitectureFitnessRules = {
    patternName: "Modular Monolith & Bounded Contexts",
    architectureStyle: "Modular Monolith / Clean Boundaries",
    description:
      "Guarantees module encapsulation by restricting cross-module coupling to explicit public-api facades and domain events.",
    boundaryRules: [
      {
        sourceLayer: "src/modules/<module-a>/**",
        forbiddenTargetLayers: ["src/modules/<module-b>/(?!public-api).*"],
        reason: "Internal implementation details of modules are strictly private and unexposed.",
      },
    ],
    eslintRules: {
      description:
        "Enforces import boundaries preventing unauthorized access to module internal files.",
      plugin: "eslint-plugin-boundaries",
      config: eslintConfig,
    },
    fitnessTests: {
      framework: "vitest",
      filename: "test/fitness/modular-monolith.fitness.test.ts",
      testCode,
    },
    ciCommands: {
      bashScript: ciScript,
      commands: [
        "npx eslint src/modules/ --max-warnings=0",
        "npx vitest run test/fitness/modular-monolith.fitness.test.ts",
        '! grep -rnE "from [\'\\"]\\.\\./[a-zA-Z0-9_-]+/(?!public-api)" src/modules/',
      ],
    },
    files: buildFitnessArtifacts(
      ".eslintrc.boundaries.json",
      eslintConfig,
      "test/fitness/modular-monolith.fitness.test.ts",
      testCode,
      ciScript,
    ),
    markdownSummary: "",
  };

  return { ...rules, markdownSummary: formatFitnessRulesMarkdown(rules) };
}
