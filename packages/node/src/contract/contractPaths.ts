import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(currentDir, "../..");

export const repositoryRoot = resolve(currentDir, "../../../..");
export const contractRoot = existsSync(resolve(packageRoot, "contract"))
  ? resolve(packageRoot, "contract")
  : resolve(repositoryRoot, "contract");

export function contractPath(...segments: string[]): string {
  return resolve(contractRoot, ...segments);
}
