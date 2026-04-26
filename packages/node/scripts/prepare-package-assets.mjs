import { cpSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDir, "..");
const repositoryRoot = resolve(packageRoot, "../..");

copyFile("README.md");
copyFile("LICENSE");
copyDirectory("contract");
copyDirectory("runtime");

function copyFile(name) {
  cpSync(resolve(repositoryRoot, name), resolve(packageRoot, name));
}

function copyDirectory(name) {
  const destination = resolve(packageRoot, name);
  rmSync(destination, { recursive: true, force: true });
  mkdirSync(destination, { recursive: true });
  cpSync(resolve(repositoryRoot, name), destination, { recursive: true });
}
