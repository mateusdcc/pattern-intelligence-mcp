import type { DesignCase } from "../domain/design-case.js";

export function caseText(designCase: DesignCase): string {
  return [
    designCase.problem,
    designCase.context,
    designCase.currentArchitecture,
    ...designCase.symptoms,
    ...designCase.goals,
    ...designCase.constraints,
    ...designCase.failureModes,
    ...designCase.changeAxes,
    ...designCase.antiGoals,
    ...designCase.evidence,
  ]
    .filter((value): value is string => Boolean(value))
    .join(". ");
}
