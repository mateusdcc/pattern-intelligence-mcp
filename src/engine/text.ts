const TOKEN_PATTERN = /[a-z][a-z0-9-]{1,}/g;

const STOP_WORDS = new Set([
  "about",
  "after",
  "also",
  "and",
  "are",
  "because",
  "before",
  "but",
  "can",
  "could",
  "each",
  "for",
  "from",
  "have",
  "into",
  "its",
  "more",
  "must",
  "need",
  "not",
  "our",
  "should",
  "some",
  "than",
  "that",
  "the",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "this",
  "through",
  "use",
  "using",
  "want",
  "when",
  "where",
  "which",
  "while",
  "with",
  "without",
  "would",
]);

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replaceAll(/[_/]/g, " ")
    .replaceAll(/[^a-z0-9+.#-]+/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

export function tokenize(text: string): ReadonlySet<string> {
  const matches = normalizeText(text).match(TOKEN_PATTERN) ?? [];
  return new Set(matches.filter((token) => !STOP_WORDS.has(token)));
}

export function includesPhrase(text: string, phrase: string): boolean {
  return normalizeText(text).includes(normalizeText(phrase));
}

export function splitEvidence(text: string): readonly string[] {
  return text
    .split(/,|\band\b/)
    .map((part) => part.trim())
    .filter((part) => part.length > 2);
}
