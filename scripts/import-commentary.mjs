// One-time bulk import of commentary .cdb files into Supabase's `commentary`
// table (see supabase/migrations/0011_commentary.sql). Run with:
//   node scripts/import-commentary.mjs
// Requires 0011 to have been run first (and 0012 after this finishes).

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import initSqlJs from 'sql.js';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.join(__dirname, 'bible-source-data');

// Minimal .env loader — this script runs standalone via `node`, outside the
// Expo CLI process that normally injects EXPO_PUBLIC_* into process.env.
const envPath = path.join(__dirname, '..', '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
  }
}

const COMMENTARY_SOURCES = [
  { file: path.join(SRC_DIR, '만나주석.cdb'), name: '만나주석' },
  { file: path.join(SRC_DIR, '매튜헨리.cdb'), name: '매튜헨리' },
];

const BATCH_SIZE = 500;

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY missing from .env');
}
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const SQL = await initSqlJs();

  for (const { file, name } of COMMENTARY_SOURCES) {
    if (!existsSync(file)) {
      console.log(`Skipping ${name}: ${file} not found`);
      continue;
    }

    const srcDb = new SQL.Database(readFileSync(file));
    const rows = srcDb.exec('SELECT book, chapter, verse, btext FROM Bible');
    const values = rows[0]?.values ?? [];
    srcDb.close();

    console.log(`${name}: importing ${values.length} rows...`);
    for (let i = 0; i < values.length; i += BATCH_SIZE) {
      const batch = values.slice(i, i + BATCH_SIZE).map(([book, chapter, verse, btext]) => ({
        book_id: book,
        chapter,
        verse,
        source: name,
        html: btext,
      }));
      const { error } = await supabase.from('commentary').insert(batch);
      if (error) throw new Error(`${name} batch ${i}: ${error.message}`);
      process.stdout.write(`\r  ${Math.min(i + BATCH_SIZE, values.length)}/${values.length}`);
    }
    console.log(`\n${name}: done`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
