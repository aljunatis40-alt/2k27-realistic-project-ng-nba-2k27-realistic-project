import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const dist = path.resolve("dist");
const indexPath = path.join(dist, "index.html");

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(fullPath));
    else if (entry.isFile()) files.push(fullPath);
  }
  return files;
}

try {
  const indexInfo = await stat(indexPath);
  if (!indexInfo.isFile() || indexInfo.size === 0) throw new Error("dist/index.html is missing or empty.");
  const files = await walk(dist);
  if (files.length < 2) throw new Error("Production bundle contains no generated JS/CSS assets.");
  const html = await readFile(indexPath, "utf8");
  const references = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map(match => match[1]);
  for (const reference of references) {
    if (/^(https?:)?\/\//.test(reference)) continue;
    const resolved = path.resolve(dist, reference.replace(/^\//, ""));
    if (!resolved.startsWith(dist + path.sep)) throw new Error(`Asset path escapes dist: ${reference}`);
    const info = await stat(resolved).catch(() => null);
    if (!info?.isFile() || info.size === 0) throw new Error(`Missing or empty referenced asset: ${reference}`);
  }
  for (const file of files) {
    const info = await stat(file);
    if (info.size === 0) throw new Error(`Empty build output: ${path.relative(dist, file)}`);
  }
  console.log(`Asset bundle validation passed: ${files.length} files, ${references.length} referenced JS/CSS assets.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
