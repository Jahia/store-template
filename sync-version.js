import fs from "node:fs";

const original = fs.readFileSync("package.json", "utf8");
const updated = original.replace(/"version": "[^"]+"/, `"version": ${JSON.stringify(process.argv[2])}`);

if (updated === original) {
  console.error(`sync-version.js: no "version" field matched in package.json (target: ${process.argv[2]})`);
  process.exit(1);
}

fs.writeFileSync("package.json", updated);
