/**
 * Analyzes event pages that have previews, recaps, match summaries, or promo summaries.
 * Outputs: highest word count page, lowest word count page, average word count.
 *
 * Run from project root: node scripts/event-page-word-counts.js
 * Loads VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from .env if present.
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

function countWords(text) {
  if (text == null || typeof text !== 'string') return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

function getEventPageWordCount(event) {
  // Intro line shown on every event page (approximate)
  const intro = `Full WWE results for ${event.date || ''} ${event.location || ''}. Match card, winners, methods, and championship updates.`;
  let total = countWords(intro);

  // Event preview and recap (both can be visible if user toggles)
  total += countWords(event.preview);
  total += countWords(event.recap);

  // Match and promo summaries
  const matches = event.matches;
  if (Array.isArray(matches)) {
    for (const match of matches) {
      if (match.matchType === 'Promo' || match.match_type === 'Promo') {
        total += countWords(match.notes);
      } else {
        total += countWords(match.summary);
      }
    }
  }

  return total;
}

function hasAnySummaryContent(event) {
  if (event.preview && String(event.preview).trim()) return true;
  if (event.recap && String(event.recap).trim()) return true;
  const matches = event.matches;
  if (!Array.isArray(matches)) return false;
  for (const match of matches) {
    const text = (match.matchType === 'Promo' || match.match_type === 'Promo') ? match.notes : match.summary;
    if (text && String(text).trim()) return true;
  }
  return false;
}

async function main() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Set in .env or environment.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: events, error } = await supabase
    .from('events')
    .select('id, name, date, location, preview, recap, matches')
    .order('date', { ascending: false });

  if (error) {
    console.error('Supabase error:', error.message);
    process.exit(1);
  }

  const withSummaries = (events || []).filter(hasAnySummaryContent);
  if (withSummaries.length === 0) {
    console.log('No event pages found that have event preview, event recap, or match/promo summaries.');
    return;
  }

  const counts = withSummaries.map((event) => ({
    id: event.id,
    name: event.name,
    date: event.date,
    words: getEventPageWordCount(event),
  }));

  const sorted = [...counts].sort((a, b) => b.words - a.words);
  const highest = sorted[0];
  const lowest = sorted[sorted.length - 1];
  const sum = counts.reduce((acc, c) => acc + c.words, 0);
  const average = Math.round(sum / counts.length);

  console.log('--- Event pages with previews, recaps, or match/promo summaries ---\n');
  console.log('Highest word count page:', highest.name, `(${highest.date})`);
  console.log('  Word count:', highest.words);
  console.log('');
  console.log('Lowest word count page:', lowest.name, `(${lowest.date})`);
  console.log('  Word count:', lowest.words);
  console.log('');
  console.log('Average word count (pages with summaries):', average);
  console.log('');
  console.log('Total pages analyzed:', withSummaries.length);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
