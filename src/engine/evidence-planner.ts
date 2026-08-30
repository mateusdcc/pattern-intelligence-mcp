import type { EvidencePlan } from "../domain/decision.js";
import type { DesignCase } from "../domain/design-case.js";
import type { Pattern } from "../domain/pattern.js";
import { splitEvidence } from "./text.js";

export function planEvidence(pattern: Pattern, designCase: DesignCase): EvidencePlan {
  const measures = splitEvidence(pattern.evidence);
  const experiments = [
    `Implement the smallest reversible slice of ${pattern.name} behind an existing boundary.`,
    `Compare ${measures.slice(0, 2).join(" and ") || "the stated outcome"} before and after.`,
    "Exercise the design under the failure and load modes named in the case.",
  ];

  if (designCase.evidence.length === 0) {
    experiments.unshift("Capture a baseline before changing the design.");
  }

  return {
    hypothesis: `${pattern.name} improves ${pattern.problem} in this context without costs exceeding its benefit.`,
    measure: measures,
    experiment: experiments,
    rejectWhen: [
      `The case does not exhibit the forces described by: ${pattern.problem}.`,
      `The simpler option remains sufficient: ${pattern.simplerAlternative}.`,
      "The measured gain is smaller than implementation and operational cost.",
    ],
    removeWhen: [
      "The variation or scale that justified the pattern disappears.",
      "The pattern becomes a pass-through abstraction with only one stable implementation.",
      "Operational incidents attributable to the pattern exceed the failures it prevents.",
    ],
  };
}
