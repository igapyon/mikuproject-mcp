import { AsyncLocalStorage } from "node:async_hooks";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { repositoryRoot } from "../contract/contractPaths.js";

export type WorkspaceConfig = {
  root: string;
};

const workspaceRootStorage = new AsyncLocalStorage<string>();
const inlineOperationArtifactsStorage = new AsyncLocalStorage<boolean>();

export function resolveWorkspaceConfig(): WorkspaceConfig {
  return {
    root: resolve(workspaceRootStorage.getStore() || process.env.MIKUPROJECT_MCP_WORKSPACE || resolve(repositoryRoot, "workplace"))
  };
}

export function withWorkspaceRoot<T>(root: string, callback: () => T): T {
  return workspaceRootStorage.run(resolve(root), callback);
}

export function withInlineOperationArtifacts<T>(callback: () => T): T {
  return inlineOperationArtifactsStorage.run(true, callback);
}

export function shouldInlineOperationArtifacts(): boolean {
  return inlineOperationArtifactsStorage.getStore() === true;
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
