import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.join(__dirname, "src");

// Map of old import path patterns to new alias or relative replacements
const REPLACEMENTS = [
  // Core Utils
  {
    from: /['"](?:@\/lib\/|(?:\.\.\/)+lib\/|\.\/lib\/)logger['"]/g,
    to: "'@core/utils/logger'",
  },
  {
    from: /['"](?:@\/lib\/|(?:\.\.\/)+lib\/|\.\/lib\/)jwt['"]/g,
    to: "'@core/utils/jwt'",
  },
  {
    from: /['"](?:@\/lib\/|(?:\.\.\/)+lib\/|\.\/lib\/)password['"]/g,
    to: "'@core/utils/password'",
  },
  {
    from: /['"](?:@\/lib\/|(?:\.\.\/)+lib\/|\.\/lib\/)response['"]/g,
    to: "'@core/utils/response'",
  },
  {
    from: /['"](?:@\/lib\/|(?:\.\.\/)+lib\/|\.\/lib\/)response-formatter['"]/g,
    to: "'@core/utils/response-formatter'",
  },
  {
    from: /['"](?:@\/lib\/|(?:\.\.\/)+lib\/|\.\/lib\/)scoped-query\.helper['"]/g,
    to: "'@core/utils/scoped-query.helper'",
  },

  // Core Database & Systems
  {
    from: /['"](?:@\/lib\/|(?:\.\.\/)+lib\/|\.\/lib\/)db['"]/g,
    to: "'@core/database/db'",
  },
  {
    from: /['"](?:@\/lib\/|(?:\.\.\/)+lib\/|\.\/lib\/)prisma['"]/g,
    to: "'@core/database/prisma'",
  },
  {
    from: /['"](?:@\/lib\/|(?:\.\.\/)+lib\/|\.\/lib\/)async-context['"]/g,
    to: "'@core/async-context'",
  },
  {
    from: /['"](?:@\/lib\/|(?:\.\.\/)+lib\/|\.\/lib\/)errors['"]/g,
    to: "'@core/errors/errors'",
  },
  {
    from: /['"](?:@\/lib\/|(?:\.\.\/)+lib\/|\.\/lib\/)events['"]/g,
    to: "'@core/events/events'",
  },
  {
    from: /['"](?:@\/lib\/|(?:\.\.\/)+lib\/|\.\/lib\/)domain-events['"]/g,
    to: "'@core/events/domain-events'",
  },

  // Core Middleware
  {
    from: /['"](?:@\/lib\/|(?:\.\.\/)+lib\/|\.\/lib\/)auth['"]/g,
    to: "'@core/middleware/auth'",
  },
  {
    from: /['"](?:@\/lib\/|(?:\.\.\/)+lib\/|\.\/lib\/)audit['"]/g,
    to: "'@core/middleware/audit'",
  },
  {
    from: /['"](?:@\/lib\/|(?:\.\.\/)+lib\/|\.\/lib\/)rbac\.service['"]/g,
    to: "'@core/middleware/rbac.service'",
  },
  {
    from: /['"](?:@\/lib\/|(?:\.\.\/)+lib\/|\.\/lib\/)request-helpers['"]/g,
    to: "'@core/middleware/request-helpers'",
  },
  {
    from: /['"](?:@\/lib\/|(?:\.\.\/)+lib\/|\.\/lib\/)rbac-config['"]/g,
    to: "'@config/rbac-config'",
  },

  // Shared Services
  {
    from: /['"](?:@\/lib\/|(?:\.\.\/)+lib\/|\.\/lib\/)pdf-generator['"]/g,
    to: "'@shared/pdf-generator'",
  },
  {
    from: /['"](?:@\/lib\/|(?:\.\.\/)+lib\/|\.\/lib\/)code-generator\.service['"]/g,
    to: "'@shared/code-generator.service'",
  },
  {
    from: /['"](?:@\/lib\/|(?:\.\.\/)+lib\/|\.\/lib\/)document\.service['"]/g,
    to: "'@shared/document.service'",
  },
  {
    from: /['"](?:@\/lib\/|(?:\.\.\/)+lib\/|\.\/lib\/)sales-calculator['"]/g,
    to: "'@shared/sales-calculator'",
  },
  {
    from: /['"](?:@\/lib\/|(?:\.\.\/)+lib\/|\.\/lib\/)inventory-sync['"]/g,
    to: "'@shared/inventory-sync'",
  },
  {
    from: /['"](?:@\/lib\/|(?:\.\.\/)+lib\/|\.\/lib\/)sequencer['"]/g,
    to: "'@shared/sequencer'",
  },
  {
    from: /['"](?:@\/lib\/|(?:\.\.\/)+lib\/|\.\/lib\/)services\/valuation\.service['"]/g,
    to: "'@shared/valuation.service'",
  },
];

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else if (file.endsWith(".ts") || file.endsWith(".js")) {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

function processFiles() {
  console.log("🔄 Scanning and updating import paths in src/...");
  const files = getAllFiles(SRC_DIR);
  let updatedCount = 0;

  files.forEach((filePath) => {
    let content = fs.readFileSync(filePath, "utf8");
    let hasChanged = false;

    REPLACEMENTS.forEach(({ from, to }) => {
      if (from.test(content)) {
        content = content.replace(from, to);
        hasChanged = true;
      }
    });

    if (hasChanged) {
      fs.writeFileSync(filePath, content, "utf8");
      console.log(`✅ Updated: ${path.relative(__dirname, filePath)}`);
      updatedCount++;
    }
  });

  console.log(
    `\n🎉 Complete! Successfully updated imports in ${updatedCount} files.`,
  );
}

processFiles();
