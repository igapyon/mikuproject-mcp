import { existsSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type RuntimeConfig = {
  javaJarPath?: string;
  nodeCliPath?: string;
  diagnostics: Array<{
    level: "info" | "warning";
    code: string;
    message: string;
  }>;
};

export function resolveRuntimeConfig(cwd = process.cwd()): RuntimeConfig {
  const configuredJava = process.env.MIKUPROJECT_MCP_RUNTIME_JAVA;
  const configuredNode = process.env.MIKUPROJECT_MCP_RUNTIME_NODE;

  const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const bundledJava = resolveLatestBundledRuntime({
    roots: [cwd, packageRoot],
    subdir: "runtime/mikuproject-java",
    legacyFileName: "mikuproject.jar",
    versionedPattern: /^mikuproject-(\d+(?:\.\d+)*)\.jar$/
  });
  const bundledNode = resolveLatestBundledRuntime({
    roots: [cwd, packageRoot],
    subdir: "runtime/mikuproject-node",
    legacyFileName: "mikuproject.mjs",
    versionedPattern: /^mikuproject-(\d+(?:\.\d+)*)\.mjs$/
  });

  const javaJarPath = configuredJava || (configuredNode ? undefined : bundledJava);
  const nodeCliPath = configuredNode || bundledNode;

  const diagnostics: RuntimeConfig["diagnostics"] = [];

  if (configuredJava) {
    diagnostics.push({
      level: "info",
      code: "configured_java_runtime",
      message: "Using Java runtime path from MIKUPROJECT_MCP_RUNTIME_JAVA."
    });
  }

  if (configuredNode) {
    diagnostics.push({
      level: "info",
      code: "configured_node_runtime",
      message: "Using Node.js runtime path from MIKUPROJECT_MCP_RUNTIME_NODE."
    });
  }

  if (!javaJarPath && !nodeCliPath) {
    diagnostics.push({
      level: "warning",
      code: "runtime_artifact_not_found",
      message: "No mikuproject runtime artifact was found under runtime/ or environment configuration."
    });
  }

  if (!configuredJava && javaJarPath) {
    diagnostics.push({
      level: "info",
      code: "bundled_java_runtime",
      message: `Using bundled Java runtime artifact: ${javaJarPath}`
    });
  }

  if (!configuredNode && nodeCliPath) {
    diagnostics.push({
      level: "info",
      code: "bundled_node_runtime",
      message: `Using bundled Node.js runtime artifact: ${nodeCliPath}`
    });
  }

  return {
    javaJarPath,
    nodeCliPath,
    diagnostics
  };
}

type BundledRuntimeSearch = {
  roots: string[];
  subdir: string;
  legacyFileName: string;
  versionedPattern: RegExp;
};

type RuntimeCandidate = {
  path: string;
  version?: number[];
  rootIndex: number;
  legacy: boolean;
};

function resolveLatestBundledRuntime(search: BundledRuntimeSearch): string | undefined {
  for (const [rootIndex, root] of search.roots.entries()) {
    const dir = resolve(root, search.subdir);
    const candidates: RuntimeCandidate[] = [];
    const legacyPath = resolve(dir, search.legacyFileName);
    if (existsSync(legacyPath)) {
      candidates.push({
        path: legacyPath,
        rootIndex,
        legacy: true
      });
    }

    for (const entry of readDirectoryNames(dir)) {
      const match = entry.match(search.versionedPattern);
      if (!match) {
        continue;
      }
      candidates.push({
        path: resolve(dir, entry),
        version: parseVersion(match[1]),
        rootIndex,
        legacy: false
      });
    }

    if (candidates.length > 0) {
      candidates.sort(compareRuntimeCandidates);
      return candidates[0]?.path;
    }
  }

  return undefined;
}

function readDirectoryNames(dir: string): string[] {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}

function parseVersion(version: string): number[] {
  return version.split(".").map((part) => Number.parseInt(part, 10));
}

function compareRuntimeCandidates(a: RuntimeCandidate, b: RuntimeCandidate): number {
  if (a.version && b.version) {
    const comparedVersion = compareVersionsDesc(a.version, b.version);
    if (comparedVersion !== 0) {
      return comparedVersion;
    }
  } else if (a.version) {
    return -1;
  } else if (b.version) {
    return 1;
  }

  if (a.rootIndex !== b.rootIndex) {
    return a.rootIndex - b.rootIndex;
  }

  if (a.legacy !== b.legacy) {
    return a.legacy ? 1 : -1;
  }

  return a.path.localeCompare(b.path);
}

function compareVersionsDesc(a: number[], b: number[]): number {
  const maxLength = Math.max(a.length, b.length);
  for (let index = 0; index < maxLength; index += 1) {
    const left = a[index] ?? 0;
    const right = b[index] ?? 0;
    if (left !== right) {
      return right - left;
    }
  }
  return 0;
}
