/**
 * Set main event checkbox for events that don't have any match marked as main event.
 * The "main event" is set to the last match on the card that is not a Promo
 * (so a promo after the main event doesn't get marked).
 *
 * Run: node scripts/set-main-event-defaults.js [--dry-run]
 *
 * Use --dry-run to only print what would be updated.
 * For updates, SUPABASE_SERVICE_ROLE_KEY in .env is recommended (avoids RLS issues).
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

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !key) {
  console.error('Need VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY) in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, key);

function isPromo(match) {
  return match?.matchType === 'Promo';
}

/**
 * For an event with matches, if no match is marked Main Event, return the match (by order index)
 * that should be set as main event: the last non-Promo match by order.
 * Returns { matchIndex, match } or null if nothing to set.
 */
function getMainEventDefault(matches) {
  if (!Array.isArray(matches) || matches.length === 0) return null;
  const hasMainEvent = matches.some((m) => m?.cardType === 'Main Event');
  if (hasMainEvent) return null;
  const sorted = [...matches].sort((a, b) => (a.order || 0) - (b.order || 0));
  const nonPromos = sorted.filter((m) => !isPromo(m));
  if (nonPromos.length === 0) return null;
  const lastNonPromo = nonPromos[nonPromos.length - 1];
  const matchIndex = matches.findIndex(
    (m) => m.order === lastNonPromo.order && m.participants === lastNonPromo.participants
  );
  return { matchIndex, match: lastNonPromo };
}

async function main() {
  const { data: events, error } = await supabase
    .from('events')
    .select('id, date, name, matches')
    .order('date', { ascending: true });

  if (error) {
    console.error('Fetch error:', error.message);
    process.exit(1);
  }

  const toUpdate = [];
  for (const event of events) {
    const result = getMainEventDefault(event.matches);
    if (result) {
      toUpdate.push({
        id: event.id,
        date: event.date,
        name: event.name,
        matchIndex: result.matchIndex,
        match: result.match,
      });
    }
  }

  if (toUpdate.length === 0) {
    console.log('No events need updating (all already have a main event or have no non-Promo matches).');
    return;
  }

  console.log(`Found ${toUpdate.length} event(s) with no main event marked.`);
  toUpdate.forEach(({ date, name, match }) => {
    const desc = match?.title && match.title !== 'None' ? match.title : (match?.participants || 'Match');
    console.log(`  ${date}  ${name}  -> set main event: ${String(desc).slice(0, 60)}...`);
  });

  if (dryRun) {
    console.log('\nDry run – no changes written. Run without --dry-run to apply.');
    return;
  }

  console.log('\nUpdating...');
  for (const { id, matchIndex } of toUpdate) {
    const event = events.find((e) => e.id === id);
    const currentMatches = Array.isArray(event.matches) ? event.matches : [];
    const updatedMatches = currentMatches.map((m, i) =>
      i === matchIndex ? { ...m, cardType: 'Main Event' } : { ...m, cardType: m.cardType || 'Undercard' }
    );
    const { error: updateError } = await supabase.from('events').update({ matches: updatedMatches }).eq('id', id);
    if (updateError) {
      console.error(`  ${id}: ${updateError.message}`);
    } else {
      console.log(`  Updated: ${event.date} ${event.name}`);
    }
  }
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
