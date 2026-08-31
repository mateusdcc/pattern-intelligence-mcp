import { buildFitnessArtifacts } from "./fitness-rules-artifacts.js";
import { formatFitnessRulesMarkdown } from "./fitness-rules-markdown.js";
import type { ArchitectureFitnessRules, FitnessFramework } from "./fitness-rules-types.js";

export function getOutboxRules(_framework?: FitnessFramework): ArchitectureFitnessRules {
  const eslintConfig = `{\n  "overrides": [\n    {\n      "files": ["src/application/services/**/*.ts", "src/domain/**/*.ts"],\n      "rules": {\n        "@typescript-eslint/no-restricted-imports": [\n          "error",\n          {\n            "paths": [\n              { "name": "kafkajs", "message": "Direct message broker publishing forbidden in use cases. Use Outbox." },\n              { "name": "amqplib", "message": "Direct message broker publishing forbidden in use cases. Use Outbox." },\n              { "name": "@aws-sdk/client-sns", "message": "Direct SNS publishing forbidden in use cases. Use Outbox." },\n              { "name": "@aws-sdk/client-sqs", "message": "Direct SQS publishing forbidden in use cases. Use Outbox." }\n            ]\n          }\n        ]\n      }\n    }\n  ]\n}`;
  const testCode = `import { readFileSync, readdirSync } from "node:fs";\nimport { join } from "node:path";\nimport { describe, expect, it } from "vitest";\n\nfunction scanDir(dir: string): string[] {\n  try {\n    const entries = readdirSync(dir, { withFileTypes: true });\n    return entries.flatMap((e) =>\n      e.isDirectory() ? scanDir(join(dir, e.name)) : [join(dir, e.name)],\n    );\n  } catch {\n    return [];\n  }\n}\n\ndescribe("Architectural Fitness: Transactional Outbox Dual-Write Prevention", () => {\n  const serviceFiles = scanDir("src/application/services").filter((f) => f.endsWith(".ts"));\n\n  it("application write use cases do not import message broker clients directly", () => {\n    const brokerRegex = /from\\s+['"](kafkajs|amqplib|@aws-sdk\\/client-sns|@aws-sdk\\/client-sqs)['"]/;\n    const violations = serviceFiles.filter((f) => brokerRegex.test(readFileSync(f, "utf8")));\n    expect(violations, "Direct broker imports in use cases cause dual-write risk").toEqual([]);\n  });\n});`;
  const ciScript = `# Enforce broker import restrictions\nnpx eslint src/application/services/ --max-warnings=0\n# Run Vitest outbox fitness test\nnpx vitest run test/fitness/outbox.fitness.test.ts\n# Guard against direct broker imports in services\n! grep -rnE "from ['"](kafkajs|amqplib|@aws-sdk/client-sns|@aws-sdk/client-sqs)['"]" src/application/services src/domain`;

  const rules: ArchitectureFitnessRules = {
    patternName: "Transactional Outbox & Dual-Write Prevention",
    architectureStyle: "Reliable Event-Driven / Outbox Pattern",
    description:
      "Prevents dual-write data anomalies by banning direct messaging broker SDK calls inside transactional business services.",
    boundaryRules: [
      {
        sourceLayer: "src/application/services/**, src/domain/**",
        forbiddenTargetLayers: [
          "kafkajs",
          "amqplib",
          "@aws-sdk/client-sns",
          "@aws-sdk/client-sqs",
          "ioredis",
        ],
        reason:
          "Business write use-cases must append to the outbox table within the DB transaction rather than calling brokers directly.",
      },
    ],
    eslintRules: {
      description:
        "Restricts direct message publisher SDK imports inside core application and domain files.",
      plugin: "@typescript-eslint/no-restricted-imports",
      config: eslintConfig,
    },
    fitnessTests: {
      framework: "vitest",
      filename: "test/fitness/outbox.fitness.test.ts",
      testCode,
    },
    ciCommands: {
      bashScript: ciScript,
      commands: [
        "npx eslint src/application/services/ --max-warnings=0",
        "npx vitest run test/fitness/outbox.fitness.test.ts",
        '! grep -rnE "from [\'\\"](kafkajs|amqplib|@aws-sdk/client-sns|@aws-sdk/client-sqs)[\'\\"]" src/application/services src/domain',
      ],
    },
    files: buildFitnessArtifacts(
      ".eslintrc.boundaries.json",
      eslintConfig,
      "test/fitness/outbox.fitness.test.ts",
      testCode,
      ciScript,
    ),
    markdownSummary: "",
  };

  return { ...rules, markdownSummary: formatFitnessRulesMarkdown(rules) };
}

export function getCqrsRules(_framework?: FitnessFramework): ArchitectureFitnessRules {
  const eslintConfig = `{\n  "overrides": [\n    {\n      "files": ["src/application/queries/**/*.ts", "src/queries/**/*.ts"],\n      "rules": {\n        "@typescript-eslint/no-restricted-imports": [\n          "error",\n          {\n            "patterns": [\n              { "group": ["**/commands/**", "**/command-handlers/**", "**/*repository.write*"], "message": "Query handlers must be strictly read-only and cannot invoke commands or write repositories." }\n            ]\n          }\n        ]\n      }\n    }\n  ]\n}`;
  const testCode = `import { readFileSync, readdirSync } from "node:fs";\nimport { join } from "node:path";\nimport { describe, expect, it } from "vitest";\n\nfunction scanDir(dir: string): string[] {\n  try {\n    const entries = readdirSync(dir, { withFileTypes: true });\n    return entries.flatMap((e) =>\n      e.isDirectory() ? scanDir(join(dir, e.name)) : [join(dir, e.name)],\n    );\n  } catch {\n    return [];\n  }\n}\n\ndescribe("Architectural Fitness: CQRS Segregation", () => {\n  const queryFiles = scanDir("src/application/queries").filter((f) => f.endsWith(".ts"));\n\n  it("query handlers do not import command handlers or write repositories", () => {\n    const forbidden = [/from\\s+['"].*commands.*['"]/, /from\\s+['"].*write-repository.*['"]/];\n    const violations = queryFiles.filter((f) => {\n      const code = readFileSync(f, "utf8");\n      return forbidden.some((regex) => regex.test(code));\n    });\n    expect(violations, "Query side must remain read-only").toEqual([]);\n  });\n});`;
  const ciScript = `# Enforce CQRS separation in queries\nnpx eslint src/application/queries/ --max-warnings=0\n# Run Vitest CQRS fitness test\nnpx vitest run test/fitness/cqrs.fitness.test.ts\n# Ensure query handlers do not reference commands\n! grep -rnE "from ['\\"].*commands.*['\\"]" src/application/queries/`;

  const rules: ArchitectureFitnessRules = {
    patternName: "Command Query Responsibility Segregation (CQRS)",
    architectureStyle: "CQRS / Segregated Read-Write Models",
    description:
      "Strictly separates mutating command workflows from read-only query projections to preserve model isolation.",
    boundaryRules: [
      {
        sourceLayer: "src/application/queries/**",
        forbiddenTargetLayers: ["src/application/commands/**", "write repositories"],
        reason:
          "Queries must be idempotent and side-effect free, without dependencies on write mutations.",
      },
    ],
    eslintRules: {
      description: "Restricts command and write repository imports inside query handlers.",
      plugin: "@typescript-eslint/no-restricted-imports",
      config: eslintConfig,
    },
    fitnessTests: {
      framework: "vitest",
      filename: "test/fitness/cqrs.fitness.test.ts",
      testCode,
    },
    ciCommands: {
      bashScript: ciScript,
      commands: [
        "npx eslint src/application/queries/ --max-warnings=0",
        "npx vitest run test/fitness/cqrs.fitness.test.ts",
        '! grep -rnE "from [\'\\"]\\.\\./commands.*[\'\\"]" src/application/queries/',
      ],
    },
    files: buildFitnessArtifacts(
      ".eslintrc.boundaries.json",
      eslintConfig,
      "test/fitness/cqrs.fitness.test.ts",
      testCode,
      ciScript,
    ),
    markdownSummary: "",
  };

  return { ...rules, markdownSummary: formatFitnessRulesMarkdown(rules) };
}
