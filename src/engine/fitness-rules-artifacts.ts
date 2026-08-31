import type { FitnessRuleArtifact } from "./fitness-rules-types.js";

export function buildFitnessArtifacts(
  configName: string,
  configContent: string,
  testFile: string,
  testCode: string,
  ciScript: string,
): readonly FitnessRuleArtifact[] {
  return [
    {
      filename: configName,
      language: "json",
      description: "ESLint import boundary rules configuration",
      content: configContent,
    },
    {
      filename: testFile,
      language: "typescript",
      description: "Automated Vitest / TS-Arch fitness test suite",
      content: testCode,
    },
    {
      filename: "scripts/ci-fitness-check.sh",
      language: "bash",
      description: "CI boundary enforcement script",
      content: ciScript,
    },
  ];
}
