import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const sourceRoot = path.resolve("src");
const sourceFiles = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(fullPath);
    else if (entry.isFile() && /\.(ts|js)$/.test(entry.name)) sourceFiles.push(fullPath);
  }
}

await walk(sourceRoot);
const problems = [];
for (const file of sourceFiles) {
  const source = await readFile(file, "utf8");
  if (/\bsetInterval\s*\(/.test(source) && !/\bclearInterval\s*\(/.test(source)) {
    problems.push(`${path.relative(sourceRoot, file)}: setInterval found without clearInterval in the same module.`);
  }
  if (/\bsetTimeout\s*\(/.test(source) && !/\bclearTimeout\s*\(/.test(source)) {
    problems.push(`${path.relative(sourceRoot, file)}: setTimeout found without clearTimeout in the same module.`);
  }
}
if (problems.length) {
  console.error("Static lifecycle audit failed:");
  for (const problem of problems) console.error(`- ${problem}`);
  process.exitCode = 1;
} else {
  console.log(`Static lifecycle audit passed for ${sourceFiles.length} source files.`);
}
console.log("Note: this is a static heuristic, not a runtime heap or GPU memory profiler.");
