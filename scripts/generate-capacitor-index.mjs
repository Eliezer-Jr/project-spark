import fs from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const clientDir = path.join(rootDir, "dist", "client");
const assetsDir = path.join(clientDir, "assets");
const outputFile = path.join(clientDir, "index.html");

async function fileExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function getBootstrapEntry() {
  const files = await fs.readdir(assetsDir);
  const candidates = files.filter((file) => /^index-.*\.js$/.test(file));

  for (const file of candidates) {
    const content = await fs.readFile(path.join(assetsDir, file), "utf8");
    if (content.includes("hydrateRoot(document") || content.includes("startTransition")) {
      return file;
    }
  }

  throw new Error("Could not find the Capacitor bootstrap entry in dist/client/assets.");
}

async function getMainStylesheet() {
  const files = await fs.readdir(assetsDir);
  return files.find((file) => /^styles-.*\.css$/.test(file)) ?? null;
}

if (!(await fileExists(assetsDir))) {
  throw new Error("dist/client/assets does not exist. Run the web build before generating the Capacitor entry.");
}

const bootstrapEntry = await getBootstrapEntry();
const stylesheet = await getMainStylesheet();

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>ArtisanCRM</title>
    <meta
      name="description"
      content="CRM platform for local artisans to manage customers, appointments, services and feedback"
    />
    ${stylesheet ? `<link rel="stylesheet" href="./assets/${stylesheet}" />` : ""}
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="./assets/${bootstrapEntry}"></script>
  </body>
</html>
`;

await fs.writeFile(outputFile, html);
console.log(`Generated Capacitor entry at ${path.relative(rootDir, outputFile)}`);
