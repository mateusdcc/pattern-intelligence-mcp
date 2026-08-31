import type { ArchitectureFitnessRules } from "./fitness-rules-types.js";

function formatBoundaryRulesMarkdown(rules: ArchitectureFitnessRules): readonly string[] {
  return [
    "#### Architectural Layer Boundaries",
    ...rules.boundaryRules.map(
      (b) =>
        `- **${b.sourceLayer}** -> Forbidden: \`${b.forbiddenTargetLayers.join(", ")}\` - ${b.reason}`,
    ),
    "",
  ];
}

function formatEslintMarkdown(rules: ArchitectureFitnessRules): readonly string[] {
  return [
    "#### ESLint Boundary Rules Configuration",
    rules.eslintRules.description,
    "```json",
    rules.eslintRules.config,
    "```",
    "",
  ];
}

function formatFitnessTestMarkdown(rules: ArchitectureFitnessRules): readonly string[] {
  return [
    `#### Automated Fitness Test Suite (\`${rules.fitnessTests.filename}\`)`,
    "```typescript",
    rules.fitnessTests.testCode,
    "```",
    "",
  ];
}

function formatCiCommandsMarkdown(rules: ArchitectureFitnessRules): readonly string[] {
  return ["#### CI Governance Check Commands", "```bash", rules.ciCommands.bashScript, "```"];
}

export function formatFitnessRulesMarkdown(rules: ArchitectureFitnessRules): string {
  return [
    `### Architectural Fitness Rules: ${rules.patternName}`,
    `* **Architecture Style**: ${rules.architectureStyle}`,
    `* **Description**: ${rules.description}`,
    "",
    ...formatBoundaryRulesMarkdown(rules),
    ...formatEslintMarkdown(rules),
    ...formatFitnessTestMarkdown(rules),
    ...formatCiCommandsMarkdown(rules),
  ].join("\n");
}
