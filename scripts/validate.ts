// Validates everything under content/. Exits 1 if any error is found.
import { readContentFiles } from '../src/lib/content/load';
import { validateAll } from '../src/lib/validate/rules';

const root = process.argv[2] ?? 'content';
const files = readContentFiles(root);
const issues = validateAll(files);

const byFile = new Map<string, typeof issues>();
for (const i of issues) (byFile.get(i.file) ?? byFile.set(i.file, []).get(i.file)!).push(i);
for (const [file, list] of byFile) {
  console.log(file);
  for (const i of list) console.log(`  ${i.severity === 'error' ? 'ERROR' : 'warn '}  ${i.rule}${i.id ? ` [${i.id}]` : ''}  ${i.message}`);
}

const errors = issues.filter((i) => i.severity === 'error').length;
const warnings = issues.length - errors;
console.log(`${files.length} files checked: ${errors} errors, ${warnings} warnings`);
if (errors) process.exit(1);
