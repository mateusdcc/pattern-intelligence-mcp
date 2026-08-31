export interface ParsedCall {
  readonly callee: string;
  readonly argumentsText: string;
  readonly line: number;
  readonly position: number;
}

export interface ParsedFunction {
  readonly name: string;
  readonly isAsync: boolean;
  readonly parameters: readonly string[];
  readonly bodyText: string;
  readonly calls: readonly ParsedCall[];
  readonly fieldAccesses: readonly string[];
  readonly methodCalls: readonly string[];
  readonly startLine: number;
}

export interface ParsedClass {
  readonly name: string;
  readonly fields: readonly string[];
  readonly methods: readonly ParsedFunction[];
}

export interface ParsedImport {
  readonly moduleSpecifier: string;
  readonly specifiers: readonly string[];
  readonly isTypeOnly: boolean;
}

export interface ParsedExport {
  readonly name: string;
  readonly kind: "function" | "class" | "interface" | "type" | "const" | "variable";
}

export interface ParsedModule {
  readonly imports: readonly ParsedImport[];
  readonly exports: readonly ParsedExport[];
  readonly classes: readonly ParsedClass[];
  readonly functions: readonly ParsedFunction[];
  readonly allCalls: readonly ParsedCall[];
  readonly rawLines: number;
}
