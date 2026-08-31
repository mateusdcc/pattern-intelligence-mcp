import type {
  CompoundTopology,
  DecisionAnalysis,
  RejectionMatrixEntry,
  TopologyComponent,
  TopologyDataFlow,
} from "../domain/decision.js";
import type { DesignCaseInput } from "../domain/design-case.js";
import { type RefactoringScaffold, synthesizeRefactoring } from "./refactoring-synthesizer.js";
import {
  buildRejectionMatrixEntry,
  formatRejectionMatrixMarkdown,
  formatTippingPointsMarkdown,
} from "./tipping-points.js";

export interface ArchitecturePrescription {
  readonly verdict: "adopt-pattern" | "prefer-direct-solution" | "gather-evidence";
  readonly primaryPattern: string;
  readonly rationale: string;
  readonly simplerAlternative: string;
  readonly rejectedPatterns: readonly string[];
  readonly rejectionMatrix?: readonly RejectionMatrixEntry[] | undefined;
  readonly scaffold: RefactoringScaffold;
  readonly migrationSeams: readonly string[];
  readonly rollbackTrigger: string;
  readonly tippingPoints?: readonly string[] | undefined;
  readonly markdownSummary: string;
  readonly topology?: CompoundTopology | undefined;
}

function formatComponentLines(components: readonly TopologyComponent[]): readonly string[] {
  return components.map(
    (c) => `- **${c.layer}** (\`${c.name}\` - *${c.patternId}*): ${c.responsibility}`,
  );
}

function formatDataFlowLines(dataFlows: readonly TopologyDataFlow[]): readonly string[] {
  return dataFlows.map((df, i) => `${i + 1}. \`${df.from}\` -> \`${df.to}\`: ${df.description}`);
}

function formatTopologyMarkdown(topology: CompoundTopology): readonly string[] {
  return [
    `#### Architectural Topology: ${topology.name}`,
    topology.description,
    "",
    "##### Component Boundaries & Layers",
    ...formatComponentLines(topology.components),
    "",
    "##### Data Flow & Interactions",
    ...formatDataFlowLines(topology.dataFlows),
    "",
  ];
}

function formatPrescriptionMarkdown(
  verdict: string,
  primaryPattern: string,
  rationale: string,
  simplerAlt: string,
  rejectedText: string,
  matrix: readonly RejectionMatrixEntry[],
  scaffold: RefactoringScaffold,
  rollback: string,
  topology?: CompoundTopology,
): string {
  const filesText = scaffold.files.map((f) => `- \`${f.path}\`: ${f.description}`).join("\n");
  const stepsText = scaffold.migrationSteps.join("\n");
  const topologySection = topology ? formatTopologyMarkdown(topology) : [];
  const matrixSection = formatRejectionMatrixMarkdown(matrix);
  const tippingSection = formatTippingPointsMarkdown(matrix);

  return [
    `### Architecture Prescription: [${verdict.toUpperCase()}] ${primaryPattern}`,
    "",
    `* **Verdict**: ${verdict}`,
    `* **Key Rationale**: ${rationale}`,
    `* **Simpler Baseline**: ${simplerAlt}`,
    `* **Rejected / Contraindicated**: ${rejectedText}`,
    "",
    ...topologySection,
    ...matrixSection,
    ...tippingSection,
    "#### Proposed Code Structure",
    filesText,
    "",
    "#### Reversible Rollout Seams",
    stepsText,
    "",
    `* **Rollback Trigger**: ${rollback}`,
  ].join("\n");
}

function buildPrescriptionMatrix(
  analysis: DecisionAnalysis,
  isDirect: boolean,
): readonly RejectionMatrixEntry[] {
  const source =
    analysis.rejectedPatterns.length > 0
      ? analysis.rejectedPatterns
      : isDirect
        ? analysis.patterns
        : [];
  return source.map((r) =>
    buildRejectionMatrixEntry(
      r.pattern,
      r.score,
      r.scoreBreakdown.contradictionPenalty,
      r.liabilities.length > 0 ? r.liabilities : r.why,
      analysis.normalizedCase.team?.size,
    ),
  );
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
  const matrix = buildPrescriptionMatrix(analysis, isDirect);
  const rejectedNames =
    matrix.length > 0
      ? matrix.map((e) => `${e.pattern} (${e.qualification.toUpperCase()})`)
      : analysis.rejectedPatterns.map((r) => r.pattern.name);
  const rejectedText = rejectedNames.length > 0 ? rejectedNames.join(", ") : "None";
  const scaffold = synthesizeRefactoring(primaryPattern);
  const rollback =
    primary?.evidencePlan?.rejectWhen?.[0] ??
    "Revert to prior direct implementation if metrics fail.";
  const tippingPoints = matrix.map((e) => `Revisit ${e.pattern} when: ${e.tippingPoint}`);
  const markdownSummary = formatPrescriptionMarkdown(
    verdict,
    primaryPattern,
    rationale,
    simplerAlt,
    rejectedText,
    matrix,
    scaffold,
    rollback,
    analysis.topology,
  );

  return {
    verdict,
    primaryPattern,
    rationale,
    simplerAlternative: simplerAlt,
    rejectedPatterns: matrix.map((e) => e.pattern),
    rejectionMatrix: matrix,
    scaffold,
    migrationSeams: scaffold.migrationSteps,
    rollbackTrigger: rollback,
    tippingPoints,
    markdownSummary,
    topology: analysis.topology,
  };
}
