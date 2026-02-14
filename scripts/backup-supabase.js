/**
 * Backup Supabase data to JSON files (no pg_dump required).
 * Run from project root: node scripts/backup-supabase.js
 *
 * Loads .env so VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.
 * Writes one JSON file per table into backups/ with a timestamp folder.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

// Load .env if present (simple parser, no dotenv dependency)
try {
  const envPath = join(process.cwd(), '.env');
  const env = readFileSync(envPath, 'utf8');
  env.split('\n').forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) {
      const key = m[1].trim();
      const val = m[2].trim().replace(/^["']|["']$/g, '');
      process.env[key] = val;
    }
  });
} catch {
  // .env optional if vars set in shell
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Set in .env or environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const TABLES = [
  'events',
  'wrestlers',
  'championships',
  'championship_history',
  'tag_teams',
  'tag_team_members',
];

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const backupDir = join(process.cwd(), 'backups', timestamp);
mkdirSync(backupDir, { recursive: true });
console.log('Backup folder:', backupDir);

async function backupTable(table) {
  const { data, error } = await supabase.from(table).select('*');
  if (error) {
    console.error(`  ${table}: error`, error.message);
    return;
  }
  const path = join(backupDir, `${table}.json`);
  writeFileSync(path, JSON.stringify(data ?? [], null, 2), 'utf8');
  console.log(`  ${table}: ${(data ?? []).length} rows -> ${path}`);
}

async function main() {
  console.log('Backing up Supabase tables...');
  for (const table of TABLES) {
    await backupTable(table);
  }
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
