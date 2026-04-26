import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));

export const repositoryRoot = resolve(currentDir, "../../../..");
export const contractRoot = resolve(repositoryRoot, "contract");

export function contractPath(...segments: string[]): string {
  return resolve(contractRoot, ...segments);
}
