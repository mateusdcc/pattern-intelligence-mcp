import type { DecisionAnalysis } from "../domain/decision.js";
import type { DesignCaseInput } from "../domain/design-case.js";
import { type RefactoringScaffold, synthesizeRefactoring } from "./refactoring-synthesizer.js";

export interface ArchitecturePrescription {
  readonly verdict: "adopt-pattern" | "prefer-direct-solution" | "gather-evidence";
  readonly primaryPattern: string;
  readonly rationale: string;
  readonly simplerAlternative: string;
  readonly rejectedPatterns: readonly string[];
  readonly scaffold: RefactoringScaffold;
  readonly migrationSeams: readonly string[];
  readonly rollbackTrigger: string;
  readonly markdownSummary: string;
}

function formatPrescriptionMarkdown(
  verdict: string,
  primaryPattern: string,
  rationale: string,
  simplerAlt: string,
  rejected: readonly string[],
  scaffold: RefactoringScaffold,
  rollback: string,
): string {
  const rejectedText = rejected.length > 0 ? rejected.join(", ") : "None";
  const filesText = scaffold.files.map((f) => `- \`${f.path}\`: ${f.description}`).join("\n");
  const stepsText = scaffold.migrationSteps.join("\n");

  return [
    `### Architecture Prescription: [${verdict.toUpperCase()}] ${primaryPattern}`,
    "",
    `* **Verdict**: ${verdict}`,
    `* **Key Rationale**: ${rationale}`,
    `* **Simpler Baseline**: ${simplerAlt}`,
    `* **Rejected / Contraindicated**: ${rejectedText}`,
    "",
    "#### Proposed Code Structure",
    filesText,
    "",
    "#### Reversible Rollout Seams",
    stepsText,
    "",
    `* **Rollback Trigger**: ${rollback}`,
  ].join("\n");
}

export function prescribeArchitecture(
  analysis: DecisionAnalysis,
  _input: DesignCaseInput,
): ArchitecturePrescription {
  const primary = analysis.patterns[0];
  const primaryPattern = primary?.pattern?.name ?? "Direct Solution";
  const isDirect = analysis.recommendation === "prefer-direct-solution" || !primary;

  const verdict = isDirect ? "prefer-direct-solution" : "adopt-pattern";
  const simplerAlt =
    primary?.simplerAlternative ?? "Simple direct implementation without extra layers.";
  const rationale = analysis.summary;
  const rejected = analysis.rejectedPatterns.map((r) => r.pattern.name);

  const scaffold = synthesizeRefactoring(primaryPattern);
  const rollback =
    primary?.evidencePlan?.rejectWhen?.[0] ??
    "Revert to prior direct implementation if metrics fail.";

  const markdownSummary = formatPrescriptionMarkdown(
    verdict,
    primaryPattern,
    rationale,
    simplerAlt,
    rejected,
    scaffold,
    rollback,
  );

  return {
    verdict,
    primaryPattern,
    rationale,
    simplerAlternative: simplerAlt,
    rejectedPatterns: rejected,
    scaffold,
    migrationSeams: scaffold.migrationSteps,
    rollbackTrigger: rollback,
    markdownSummary,
  };
}
