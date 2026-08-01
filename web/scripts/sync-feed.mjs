import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(scriptDirectory, "..");
const source = resolve(webRoot, "..", "data", "feed.json");
const destinationDirectory = resolve(webRoot, "public");
const destination = resolve(destinationDirectory, "feed.json");

await mkdir(destinationDirectory, { recursive: true });
await copyFile(source, destination);
console.log(`Copied ${source} to ${destination}`);
