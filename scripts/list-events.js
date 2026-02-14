/**
 * List all events from Supabase with id, date, name, match count.
 * Duplicate check only considers completed events (date today or in the past).
 * Run: node scripts/list-events.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

function isUpcoming(event) {
  if (!event?.date) return false;
  const [y, m, d] = event.date.split('-').map(Number);
  const eventDate = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return eventDate > today;
}

try {
  const env = readFileSync(join(process.cwd(), '.env'), 'utf8');
  env.split('\n').forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  });
} catch {}

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const { data: events, error } = await supabase.from('events').select('id, date, name, matches').order('date', { ascending: false });

if (error) {
  console.error('Error:', error.message);
  process.exit(1);
}

const completedEvents = events.filter((e) => !isUpcoming(e));

console.log('Events (id, date, name, match count):\n');
events.forEach((e) => {
  const count = Array.isArray(e.matches) ? e.matches.length : 0;
  const upcoming = isUpcoming(e) ? ' [upcoming]' : '';
  console.log(`${e.date}  ${e.name.padEnd(20)}  matches: ${String(count).padStart(2)}  id: ${e.id}${upcoming}`);
});

// Duplicate check: only among completed events. Normalize so same matches in different order still match.
function normalizedMatchHash(matches) {
  const list = Array.isArray(matches) ? matches : [];
  const sorted = [...list].sort((a, b) => {
    const sa = JSON.stringify(a);
    const sb = JSON.stringify(b);
    return sa.localeCompare(sb);
  });
  return JSON.stringify(sorted);
}
const matchHashes = new Map();
completedEvents.forEach((e) => {
  const hash = normalizedMatchHash(e.matches);
  if (!matchHashes.has(hash)) matchHashes.set(hash, []);
  matchHashes.get(hash).push({ date: e.date, name: e.name, id: e.id });
});

const duplicates = [...matchHashes.entries()].filter(([, list]) => list.length > 1);
if (duplicates.length > 0) {
  console.log('\n--- Completed events with identical match data (possible wrong copy) ---');
  duplicates.forEach(([_, list]) => {
    console.log(list.map((e) => `${e.date} ${e.name} (id: ${e.id})`).join('  <-- same matches as -->  '));
  });
}
