export type DiagnosticLevel = "info" | "warning" | "error";

export type Diagnostic = {
  level: DiagnosticLevel;
  message: string;
  code?: string;
};

export type ArtifactRef = {
  role: string;
  uri: string;
  path?: string;
};

export type CommonResult = {
  ok: boolean;
  operation: string;
  diagnostics: Diagnostic[];
  artifacts?: ArtifactRef[];
  [key: string]: unknown;
};

export function asTextResult(result: CommonResult) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(result, null, 2)
      }
    ]
  };
}
