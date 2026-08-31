import type { CodeQualityReport, MetricComparison } from "../domain/code-quality.js";
import { analyzeCodeQuality } from "./code-quality-analyzer.js";
import { projectCleanMetrics } from "./metrics-calculator.js";
import { type RefactoringScaffold, synthesizeRefactoring } from "./refactoring-synthesizer.js";

export interface SmellRefactorResult {
  readonly report: CodeQualityReport;
  readonly recommendedPattern: string;
  readonly scaffold: RefactoringScaffold;
  readonly metricsComparison: MetricComparison;
  readonly markdownSummary: string;
}

function chooseTargetPattern(report: CodeQualityReport): string {
  const topSmell = report.smells[0];
  if (!topSmell) return "Direct Solution";
  return topSmell.suggestedPatterns[0] ?? "Adapter";
}

function formatMetricsTable(comparison: MetricComparison): string {
  const { before, projectedAfter } = comparison;
  return [
    "| Metric | Before Refactoring | Projected Target | Status |",
    "| :--- | :--- | :--- | :--- |",
    `| Maintainability Index | ${before.maintainabilityIndex}/100 | ${projectedAfter.maintainabilityIndex}/100 | Improved |`,
    `| Cyclomatic Complexity | ${before.cyclomaticComplexity} | ${projectedAfter.cyclomaticComplexity} | Reduced |`,
    `| LCOM4 (Lack of Cohesion) | ${before.lcom4Score} | ${projectedAfter.lcom4Score} | Cohesive |`,
    `| Efferent Coupling (Ce) | ${before.efferentCoupling} | ${projectedAfter.efferentCoupling} | Controlled |`,
    `| Instability Index (I) | ${before.instabilityIndex} | ${projectedAfter.instabilityIndex} | Stable |`,
  ].join("\n");
}

function formatSmellsSection(report: CodeQualityReport): string {
  if (report.smells.length === 0) return "- No critical architectural smells detected.";
  return report.smells
    .map(
      (s) =>
        `- **[${s.severity.toUpperCase()}] ${s.title}**: ${s.description}\n  * *Evidence*: ${s.evidence}`,
    )
    .join("\n");
}

function formatMigrationSteps(scaffold: RefactoringScaffold): string {
  return scaffold.migrationSteps.map((step, idx) => `${idx + 1}. ${step}`).join("\n");
}

function formatFilesSection(scaffold: RefactoringScaffold): string {
  return scaffold.files
    .map((f) => `\`\`\`typescript\n// ${f.path}\n${f.code}\n\`\`\``)
    .join("\n\n");
}

function formatSmellRefactorMarkdown(
  report: CodeQualityReport,
  pattern: string,
  scaffold: RefactoringScaffold,
  comparison: MetricComparison,
): string {
  return [
    `### Code Smell Refactoring Blueprint: ${pattern}`,
    "",
    "#### Deterministic Metrics Comparison",
    formatMetricsTable(comparison),
    "",
    "#### Detected Architectural Smells",
    formatSmellsSection(report),
    "",
    "#### Migration Steps",
    formatMigrationSteps(scaffold),
    "",
    "#### Refactored Clean Code Solution",
    formatFilesSection(scaffold),
  ].join("\n");
}

export function refactorCodeSmell(code: string, fileName = "component.ts"): SmellRefactorResult {
  const report = analyzeCodeQuality(code, fileName);
  const recommendedPattern = chooseTargetPattern(report);
  const scaffold = synthesizeRefactoring(recommendedPattern);
  const metricsComparison = projectCleanMetrics(report.metrics);
  const markdownSummary = formatSmellRefactorMarkdown(
    report,
    recommendedPattern,
    scaffold,
    metricsComparison,
  );

  return {
    report,
    recommendedPattern,
    scaffold,
    metricsComparison,
    markdownSummary,
  };
}
