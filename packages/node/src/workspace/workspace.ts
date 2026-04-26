import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { repositoryRoot } from "../contract/contractPaths.js";

export type WorkspaceConfig = {
  root: string;
};

export function resolveWorkspaceConfig(): WorkspaceConfig {
  return {
    root: resolve(process.env.MIKUPROJECT_MCP_WORKSPACE || resolve(repositoryRoot, "workplace"))
  };
}

export function ensureWorkspace(config: WorkspaceConfig): void {
  mkdirSync(config.root, { recursive: true });
}

export function isInsideWorkspace(path: string, config: WorkspaceConfig): boolean {
  const resolvedPath = resolve(path);
  const resolvedRoot = resolve(config.root);
  return resolvedPath === resolvedRoot || resolvedPath.startsWith(`${resolvedRoot}/`);
}

export function ensureParentDirectory(path: string): void {
  mkdirSync(dirname(resolve(path)), { recursive: true });
}
