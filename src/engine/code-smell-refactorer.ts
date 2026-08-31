import type { CodeQualityReport } from "../domain/code-quality.js";
import { analyzeCodeQuality } from "./code-quality-analyzer.js";
import { type RefactoringScaffold, synthesizeRefactoring } from "./refactoring-synthesizer.js";

export interface SmellRefactorResult {
  readonly report: CodeQualityReport;
  readonly recommendedPattern: string;
  readonly scaffold: RefactoringScaffold;
  readonly markdownSummary: string;
}

function chooseTargetPattern(report: CodeQualityReport): string {
  const topSmell = report.smells[0];
  if (!topSmell) return "Direct Solution";
  return topSmell.suggestedPatterns[0] ?? "Adapter";
}

function formatSmellRefactorMarkdown(
  report: CodeQualityReport,
  pattern: string,
  scaffold: RefactoringScaffold,
): string {
  const smellsText = report.smells
    .map((s) => `- **[${s.severity.toUpperCase()}] ${s.title}**: ${s.description}`)
    .join("\n");
  const filesText = scaffold.files
    .map((f) => `\`\`\`typescript\n// ${f.path}\n${f.code}\n\`\`\``)
    .join("\n\n");

  return [
    `### Code Smell Refactoring: ${pattern}`,
    "",
    `* **Maintainability Index**: ${report.metrics.maintainabilityIndex}/100`,
    `* **Cyclomatic Complexity**: ${report.metrics.cyclomaticComplexity}`,
    `* **Smells Detected**: ${report.smells.length}`,
    "",
    "#### Detected Smells",
    smellsText || "- No critical architectural smells detected.",
    "",
    "#### Refactored Clean Code Solution",
    filesText,
  ].join("\n");
}

export function refactorCodeSmell(code: string, fileName = "component.ts"): SmellRefactorResult {
  const report = analyzeCodeQuality(code, fileName);
  const recommendedPattern = chooseTargetPattern(report);
  const scaffold = synthesizeRefactoring(recommendedPattern);
  const markdownSummary = formatSmellRefactorMarkdown(report, recommendedPattern, scaffold);

  return {
    report,
    recommendedPattern,
    scaffold,
    markdownSummary,
  };
}
