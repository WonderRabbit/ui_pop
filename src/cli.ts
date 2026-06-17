import { pathToFileURL } from "node:url";
import { runCliAsync } from "./cli-core.js";

export async function main(args: readonly string[]): Promise<void> {
  const result = await runCliAsync(args);

  if (result.stdout.length > 0) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr.length > 0) {
    process.stderr.write(result.stderr);
  }

  process.exitCode = result.exitCode;
}

const entryPath = process.argv[1];

if (entryPath !== undefined && import.meta.url === pathToFileURL(entryPath).href) {
  void main(process.argv.slice(2));
}
