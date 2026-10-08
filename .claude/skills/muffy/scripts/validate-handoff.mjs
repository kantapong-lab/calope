#!/usr/bin/env node
// Usage: node validate-handoff.mjs <file.json> [handoff|escalation|prompt-envelope]
// Exit 0 = valid, 1 = invalid (errors printed one per line), 2 = unreadable.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { validate } from './schema.mjs';

const [file, kind = 'handoff'] = process.argv.slice(2);
if (!file) {
  console.error('usage: validate-handoff.mjs <file.json> [handoff|escalation|prompt-envelope]');
  process.exit(2);
}
try {
  const here = dirname(fileURLToPath(import.meta.url));
  const schema = JSON.parse(readFileSync(join(here, '..', 'schemas', `${kind}.schema.json`), 'utf8'));
  const data = JSON.parse(readFileSync(file, 'utf8'));
  const errs = validate(schema, data);
  if (errs.length) {
    console.error(errs.join('\n'));
    process.exit(1);
  }
  console.log(`OK ${file}`);
} catch (e) {
  console.error(`cannot validate: ${e.message}`);
  process.exit(2);
}
