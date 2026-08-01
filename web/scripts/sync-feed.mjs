import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(scriptDirectory, "..");
const destinationDirectory = resolve(webRoot, "public");

await mkdir(destinationDirectory, { recursive: true });
for (const filename of ["feed.json", "journey.json"]) {
  const source = resolve(webRoot, "..", "data", filename);
  const destination = resolve(destinationDirectory, filename);
  await copyFile(source, destination);
  console.log(`Copied ${source} to ${destination}`);
}
