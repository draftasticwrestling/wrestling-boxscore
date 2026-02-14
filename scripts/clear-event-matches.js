/**
 * Clear matches for events that have wrong/duplicate match data.
 * Run: node scripts/clear-event-matches.js [--dry-run] [event-id ...]
 *
 * If you get a permission/RLS error, add SUPABASE_SERVICE_ROLE_KEY (from
 * Supabase Dashboard → Project Settings → API → service_role) to .env and run again.
 *
 * If no event ids are given, clears the 5 events from the duplicate list:
 *   elimination-chamber-20260228-1770063085004
 *   smackdown-20260227-1770063055321
 *   raw-20260223-1770063030571
 *   smackdown-20260220-1770063008805
 *   raw-20260216-1770062981572
 *
 * With --dry-run, only prints what would be updated.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

try {
  const env = readFileSync(join(process.cwd(), '.env'), 'utf8');
  env.split('\n').forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  });
} catch {}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const eventIds = args.filter((a) => a !== '--dry-run');

const DEFAULT_IDS = [
  'elimination-chamber-20260228-1770063085004',
  'smackdown-20260227-1770063055321',
  'raw-20260223-1770063030571',
  'smackdown-20260220-1770063008805',
  'raw-20260216-1770062981572',
];

const ids = eventIds.length > 0 ? eventIds : DEFAULT_IDS;

// Use service role key if set (can update without auth); otherwise anon (may need RLS to allow updates)
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
if (!process.env.VITE_SUPABASE_URL || !key) {
  console.error('Need VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY) in .env');
  process.exit(1);
}
const supabase = createClient(process.env.VITE_SUPABASE_URL, key);

if (dryRun) {
  console.log('Dry run – would clear matches for:', ids);
  process.exit(0);
}

console.log('Clearing matches for', ids.length, 'event(s)...');
for (const id of ids) {
  const { error } = await supabase.from('events').update({ matches: [] }).eq('id', id);
  if (error) {
    console.error(id, error.message);
  } else {
    console.log('Cleared:', id);
  }
}
console.log('Done. Re-add the correct match card for each event via Edit Event in the app.');
