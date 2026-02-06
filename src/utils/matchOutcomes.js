/**
 * Shared helpers for computing win/draw/loss outcomes and last-N matches.
 * Used by WrestlerProfile and MatchCard Statistics view.
 */

export function extractWrestlerSlugs(participants) {
  const slugs = new Set();
  if (!participants) return slugs;
  if (Array.isArray(participants)) {
    participants.forEach((slug) => {
      if (slug && typeof slug === 'string') slugs.add(slug.trim());
    });
    return slugs;
  }
  if (typeof participants !== 'string') return slugs;
  const sides = participants.split(' vs ');
  sides.forEach((side) => {
    const teamMatch = side.match(/^([^(]+)\s*\(([^)]+)\)$/);
    if (teamMatch) {
      teamMatch[2]
        .split('&')
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((slug) => slugs.add(slug));
    } else {
      side
        .split('&')
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((slug) => slugs.add(slug));
    }
  });
  return slugs;
}

export function parseEventDate(dateStr) {
  if (!dateStr) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return new Date(dateStr);
  const parsed = new Date(dateStr);
  return !isNaN(parsed.getTime()) ? parsed : null;
}

const DRAW_RESULT_PHRASES = [
  'no contest',
  'no winner',
  'draw',
  'double count out',
  'double dq',
  'double disqualification',
  'time limit draw',
  'countout draw',
];
const DRAW_METHODS = ['No Contest', 'Double Count Out', 'Draw'];

export function isDrawResult(result, method) {
  const r = (result || '').toLowerCase().trim();
  if (DRAW_RESULT_PHRASES.some((phrase) => r.includes(phrase))) return true;
  if (method && DRAW_METHODS.includes(method)) return true;
  return false;
}

/**
 * Returns 'W' | 'D' | 'L' for a match from the perspective of the given wrestler slug.
 */
export function getMatchOutcome(match, wrestlerSlug, wrestlerMap) {
  const wrestlerName = wrestlerMap?.[wrestlerSlug]?.name;
  const normalize = (s) =>
    (s || '').toLowerCase().trim().replace(/\s+/g, ' ');

  if (match.winner) {
    if (match.winner === wrestlerSlug) return 'W';
    const slugs = extractWrestlerSlugs(match.participants);
    if (slugs.has(wrestlerSlug)) return 'L';
    return 'D';
  }
  if (isDrawResult(match.result, match.method)) return 'D';
  if (!match.result || !match.result.includes(' def. ')) return 'D';
  const [winnerSide, loserSide] = match.result.split(' def. ').map((s) => s.trim());
  const winnerSlugs = extractWrestlerSlugs(winnerSide);
  const loserSlugs = extractWrestlerSlugs(loserSide);
  if (
    winnerSlugs.has(wrestlerSlug) ||
    (wrestlerName && normalize(winnerSide) === normalize(wrestlerName))
  )
    return 'W';
  if (
    loserSlugs.has(wrestlerSlug) ||
    (wrestlerName && normalize(loserSide) === normalize(wrestlerName))
  )
    return 'L';
  return 'D';
}

/**
 * Get last N matches (excluding promos) that the wrestler participated in, newest first.
 * @param {Array} events - All events (chronological order doesn't matter; we sort by date desc).
 * @param {string} wrestlerSlug - Wrestler slug to find matches for.
 * @param {number} limit - Max number of matches to return (default 5).
 * @param {{ excludeEventId?: string }} options - If excludeEventId is set, that event is skipped
 *   so the returned matches are "prior to" that event (e.g. for match cards, show record leading up to the match).
 */
export function getLastMatchesForWrestler(events, wrestlerSlug, limit = 5, { excludeEventId } = {}) {
  const results = [];
  const sortedEvents = [...(events || [])].sort((a, b) => {
    const da = parseEventDate(a.date);
    const db = parseEventDate(b.date);
    if (!da || !db) return 0;
    return db - da;
  });
  for (const event of sortedEvents) {
    if (excludeEventId && event.id === excludeEventId) continue;
    const matches = Array.isArray(event.matches) ? event.matches : [];
    const sortedMatches = [...matches].sort((a, b) => (a.order || 0) - (b.order || 0));
    for (let i = 0; i < sortedMatches.length; i++) {
      const match = sortedMatches[i];
      if (match.matchType === 'Promo') continue;
      const slugs = extractWrestlerSlugs(match.participants);
      if (slugs.has(wrestlerSlug)) {
        results.push({ event, match, matchIndex: i });
        if (results.length >= limit) return results;
      }
    }
  }
  return results;
}

/** Match type substrings that exclude per-participant last-5 stats (too many participants). */
const EXCLUDED_STATS_MATCH_PATTERNS = [
  'Royal Rumble',
  'Battle Royal',
  'Elimination Chamber',
  'Survivor Series',
  'War Games',
  'Gauntlet Match',
];

/** Whether this match type should show the last-5 W/D/L boxes in Statistics. */
export function shouldShowLastFiveStats(match, maxParticipantCount = 10) {
  if (!match) return false;
  const mt = (match.matchType || '').toLowerCase();
  if (EXCLUDED_STATS_MATCH_PATTERNS.some((p) => mt.includes(p.toLowerCase())))
    return false;
  const slugs = extractWrestlerSlugs(match.participants);
  return slugs.size <= maxParticipantCount;
}
