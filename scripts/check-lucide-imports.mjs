import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, "..");
const appRoot = path.join(projectRoot, "src", "app");

const allowedOutsideUi = new Set([
  // TK-007: existing usages to be migrated incrementally.
  path.join(appRoot, "pages", "BookCollectionView.tsx"),
  path.join(appRoot, "pages", "BookSingleView.tsx"),
  path.join(appRoot, "pages", "RecordSingleView.tsx"),
  path.join(appRoot, "components", "TimerSection.tsx"),
  path.join(appRoot, "components", "ListCard.tsx"),
  path.join(appRoot, "components", "ListEmptyView.tsx"),
  path.join(appRoot, "components", "TagMultiSelectInput.tsx"),
  path.join(appRoot, "components", "book-list", "BookListSearchField.tsx"),
  path.join(appRoot, "components", "PrimaryButton.stories.tsx"),
]);

const uiDir = path.join(appRoot, "components", "ui");

const fileExts = new Set([".ts", ".tsx", ".js", ".jsx"]);
const lucideImportPattern =
  /(from\s+["']lucide-react["'])|(require\(\s*["']lucide-react["']\s*\))/;

async function listFilesRecursive(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      results.push(...(await listFilesRecursive(fullPath)));
      continue;
    }

    if (!entry.isFile()) continue;

    if (fileExts.has(path.extname(entry.name))) {
      results.push(fullPath);
    }
  }

  return results;
}

function isUnderDir(filePath, dirPath) {
  const relative = path.relative(dirPath, filePath);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}

async function main() {
  let files;
  try {
    files = await listFilesRecursive(appRoot);
  } catch (error) {
    console.error("Failed to scan src/app:", error);
    process.exit(2);
  }

  const violations = [];

  for (const filePath of files) {
    // Allow lucide-react in components/ui (TK-007 policy A).
    if (isUnderDir(filePath, uiDir)) continue;

    const content = await fs.readFile(filePath, "utf8");
    if (!lucideImportPattern.test(content)) continue;

    // Allow only the known existing non-ui usages; block new ones.
    if (!allowedOutsideUi.has(filePath)) {
      violations.push(filePath);
    }
  }

  if (violations.length > 0) {
    console.error(
      "Disallowed lucide-react usage detected (outside src/app/components/ui/**):",
    );
    for (const v of violations.sort()) {
      console.error(`- ${path.relative(projectRoot, v)}`);
    }
    console.error(
      "\nPolicy: Use SVG icon components in src/app/components/icons/**.",
    );
    console.error(
      "If this is an existing usage that should be migrated later, add it to the allowlist in scripts/check-lucide-imports.mjs and to TK-007.",
    );
    process.exit(1);
  }

  console.log("OK: lucide-react usage is within allowed boundaries.");
}

await main();
