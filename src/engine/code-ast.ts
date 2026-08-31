import type {
  ParsedCall,
  ParsedClass,
  ParsedExport,
  ParsedFunction,
  ParsedImport,
  ParsedModule,
} from "../domain/code-ast-types.js";

export type { ParsedCall, ParsedClass, ParsedExport, ParsedFunction, ParsedImport, ParsedModule };

const KEYWORDS = new Set(["if", "for", "while", "switch", "catch", "function", "return", "throw"]);

export function stripComments(code: string): string {
  const re =
    /\/\*[\s\S]*?\*\/|\/\/[^\r\n]*|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:\\[\s\S]|[^`\\])*`)/g;
  return code.replace(re, (m, str) => (str ? m : m.replace(/[^\r\n]/g, " ")));
}

function findMatching(text: string, startIdx: number, open: string, close: string): number {
  let depth = 0;
  for (let i = startIdx; i < text.length; i++) {
    if (text[i] === open) depth++;
    else if (text[i] === close && --depth === 0) return i;
  }
  return -1;
}

export function findMatchingBrace(text: string, startIdx: number): number {
  return findMatching(text, startIdx, "{", "}");
}

export function findMatchingParen(text: string, startIdx: number): number {
  return findMatching(text, startIdx, "(", ")");
}

export function parseCallsFromText(body: string, offsetLine = 1): readonly ParsedCall[] {
  const callRegex = /(?:await\s+)?([A-Za-z0-9_$.]+)\s*\(/g;
  const calls: ParsedCall[] = [];
  for (const m of body.matchAll(callRegex)) {
    const callee = m[1];
    if (!callee || KEYWORDS.has(callee)) continue;
    const parenStart = (m.index ?? 0) + m[0].length - 1;
    const parenEnd = findMatchingParen(body, parenStart);
    if (parenEnd === -1) continue;
    const args = body.slice(parenStart + 1, parenEnd).trim();
    const line = offsetLine + body.slice(0, m.index ?? 0).split("\n").length - 1;
    calls.push({ callee, argumentsText: args, line, position: m.index ?? 0 });
  }
  return calls;
}

export function extractThisFieldAccesses(body: string): readonly string[] {
  const fields = new Set<string>();
  for (const m of body.matchAll(/this\.([A-Za-z0-9_$]+)(?!\s*\()/g)) {
    if (m[1]) fields.add(m[1]);
  }
  return [...fields];
}

export function extractThisMethodCalls(body: string): readonly string[] {
  const methods = new Set<string>();
  for (const m of body.matchAll(/this\.([A-Za-z0-9_$]+)\s*\(/g)) {
    if (m[1]) methods.add(m[1]);
  }
  return [...methods];
}

export function extractClassFields(classBody: string): readonly string[] {
  let stripped = classBody;
  const methodRegex =
    /(?:(public|private|protected|static|async)\s+)*([A-Za-z0-9_$]+)\s*\([^)]*\)[^{;]*\{/g;
  for (const m of classBody.matchAll(methodRegex)) {
    if (m[2] && KEYWORDS.has(m[2])) continue;
    const start = (m.index ?? 0) + m[0].length - 1;
    const end = findMatchingBrace(classBody, start);
    if (end !== -1) stripped = `${stripped.slice(0, start)}{}${stripped.slice(end + 1)}`;
  }
  const fields = new Set<string>();
  for (const m of stripped.matchAll(
    /(?:private|protected|public|readonly)?\s*([A-Za-z0-9_$]+)\s*(?::\s*[^;=]+)?(?:\s*=[^;]+)?;/g,
  )) {
    if (m[1] && !KEYWORDS.has(m[1])) fields.add(m[1]);
  }
  return [...fields];
}

export function createParsedFunction(
  name: string,
  params: string,
  body: string,
  startLine: number,
): ParsedFunction {
  return {
    name,
    isAsync: body.includes("await "),
    parameters: params
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean),
    bodyText: body,
    calls: parseCallsFromText(body, startLine),
    fieldAccesses: extractThisFieldAccesses(body),
    methodCalls: extractThisMethodCalls(body),
    startLine,
  };
}

export function parseClassMethods(classBody: string, baseLine = 1): readonly ParsedFunction[] {
  const methodRegex =
    /(?:(public|private|protected|static|async)\s+)*([A-Za-z0-9_$]+)\s*\(([^)]*)\)[^{;]*\{/g;
  const methods: ParsedFunction[] = [];
  for (const m of classBody.matchAll(methodRegex)) {
    const name = m[2];
    if (!name || KEYWORDS.has(name)) continue;
    const start = (m.index ?? 0) + m[0].length - 1;
    const end = findMatchingBrace(classBody, start);
    if (end === -1) continue;
    const line = baseLine + classBody.slice(0, m.index ?? 0).split("\n").length - 1;
    methods.push(createParsedFunction(name, m[3] ?? "", classBody.slice(start + 1, end), line));
  }
  return methods;
}

export function parseClasses(code: string): readonly ParsedClass[] {
  const classes: ParsedClass[] = [];
  for (const m of code.matchAll(/(?:export\s+)?class\s+([A-Za-z0-9_$]+)[^{]*\{/g)) {
    const name = m[1];
    if (!name) continue;
    const start = (m.index ?? 0) + m[0].length - 1;
    const end = findMatchingBrace(code, start);
    if (end === -1) continue;
    const body = code.slice(start + 1, end);
    const line = code.slice(0, m.index ?? 0).split("\n").length;
    classes.push({
      name,
      fields: extractClassFields(body),
      methods: parseClassMethods(body, line),
    });
  }
  return classes;
}

export function parseTopLevelFunctions(code: string): readonly ParsedFunction[] {
  const functions: ParsedFunction[] = [];
  for (const m of code.matchAll(
    /(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(([^)]*)\)[^{]*\{/g,
  )) {
    const name = m[1];
    if (!name) continue;
    const start = (m.index ?? 0) + m[0].length - 1;
    const end = findMatchingBrace(code, start);
    if (end === -1) continue;
    const line = code.slice(0, m.index ?? 0).split("\n").length;
    functions.push(createParsedFunction(name, m[2] ?? "", code.slice(start + 1, end), line));
  }
  return functions;
}

export function parseImports(code: string): readonly ParsedImport[] {
  const importRegex =
    /import\s+(type\s+)?(?:(\{[^}]+\})|(\*\s+as\s+\w+)|(\w+))?\s*(?:from\s*)?['"]([^'"]+)['"]/g;
  const imports: ParsedImport[] = [];
  for (const m of code.matchAll(importRegex)) {
    const specifiers = (m[2] ?? m[3] ?? m[4] ?? "")
      .replace(/[{}\s]/g, "")
      .split(",")
      .filter(Boolean);
    if (m[5]) imports.push({ moduleSpecifier: m[5], specifiers, isTypeOnly: Boolean(m[1]) });
  }
  return imports;
}

export function parseExports(code: string): readonly ParsedExport[] {
  const exports: ParsedExport[] = [];
  for (const m of code.matchAll(
    /export\s+(?:async\s+)?(function|class|interface|type|const|let|var)\s+([A-Za-z0-9_$]+)/g,
  )) {
    if (m[2]) exports.push({ name: m[2], kind: (m[1] ?? "variable") as ParsedExport["kind"] });
  }
  return exports;
}

export function parseSourceModule(sourceCode: string): ParsedModule {
  const cleanCode = stripComments(sourceCode);
  const classes = parseClasses(cleanCode);
  const topFunctions = parseTopLevelFunctions(cleanCode);
  const functions = [...topFunctions, ...classes.flatMap((c) => c.methods)];
  return {
    imports: parseImports(cleanCode),
    exports: parseExports(cleanCode),
    classes,
    functions,
    allCalls: parseCallsFromText(cleanCode),
    rawLines: sourceCode.split("\n").length,
  };
}
