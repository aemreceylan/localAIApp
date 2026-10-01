import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');

function getAllFiles(dir, exts = ['.js', '.d.ts']) {
  let files = [];
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(getAllFiles(fullPath, exts));
    } else if (exts.some(ext => entry.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }
  return files;
}

export function resolveAliases() {
  const files = getAllFiles(distDir);
  let modifiedCount = 0;
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const fileDir = path.dirname(file);

    const updated = content.replace(/(['"])(@\/[^'"]+)(['"])/g, (_match, q1, aliasPath, q2) => {
      const targetSubPath = aliasPath.slice(2);
      const targetFullPath = path.join(distDir, targetSubPath);
      let rel = path.relative(fileDir, targetFullPath).replaceAll('\\', '/');
      if (!rel.startsWith('.')) {
        rel = './' + rel;
      }
      return `${q1}${rel}${q2}`;
    });

    if (updated !== content) {
      fs.writeFileSync(file, updated, 'utf-8');
      modifiedCount++;
    }
  }
  console.log(`[resolve-aliases] Başarılı: ${modifiedCount} dosyada @/ alias yolları relative path'e dönüştürüldü.`);
}

if (process.argv[1] === __filename) {
  resolveAliases();
}
