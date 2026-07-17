import fs from "node:fs";

const updated = fs
  .readFileSync("package.json", "utf8")
  .replace(/"version": ".+"/, `"version": ${JSON.stringify(process.argv[2])}`);
fs.writeFileSync("package.json", updated);
