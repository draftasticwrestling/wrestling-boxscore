/**
 * Match page layout helpers: headline text (not championship "None") and
 * which match types get the full-image hero on the dedicated match page.
 */

export function parseTeamStringForPage(teamStr, wrestlerMap = {}) {
  if (!teamStr) {
    return { teamName: '', slugs: [] };
  }
  const teamMatch = teamStr.match(/^([^(]+)\s*\(([^)]+)\)$/);
  if (teamMatch) {
    const teamName = teamMatch[1].trim();
    const potentialSlugs = teamMatch[2].split('&').map((s) => s.trim());
    const slugs = potentialSlugs.map((potentialSlug) => {
      if (wrestlerMap[potentialSlug]) return potentialSlug;
      const found = Object.values(wrestlerMap).find((w) => w.name === potentialSlug || w.id === potentialSlug);
      return found ? found.id : potentialSlug;
    });
    return { teamName, slugs };
  }
  const potentialSlugs = teamStr.split('&').map((s) => s.trim());
  const slugs = potentialSlugs.map((potentialSlug) => {
    if (wrestlerMap[potentialSlug]) return potentialSlug;
    const found = Object.values(wrestlerMap).find((w) => w.name === potentialSlug || w.id === potentialSlug);
    return found ? found.id : potentialSlug;
  });
  return { teamName: '', slugs };
}

function normalize(str) {
  return (str || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/** Sides from "A vs B vs C" string (not gauntlet arrows). */
export function getVersusTeamStrings(match) {
  if (!match || typeof match.participants !== 'string' || !match.participants.trim()) return null;
  if (match.matchType === 'Gauntlet Match' || match.matchType === 'Tag Team Gauntlet Match' || match.matchType === '2 out of 3 Falls') {
    return null;
  }
  return match.participants.split(' vs ').map((s) => s.trim()).filter(Boolean);
}

/**
 * Winner side index for multi-way / tag strings (same idea as MatchCard).
 */
export function getWinnerSideIndex(teamStrings, match, wrestlerMap) {
  const winner =
    match.result && match.result.includes(' def. ')
      ? match.result.split(' def. ')[0]
      : match.result || '';
  let winnerIndex = -1;
  teamStrings.forEach((teamStr, idx) => {
    const { teamName, slugs } = parseTeamStringForPage(teamStr, wrestlerMap);
    const individualNames = slugs.map((slug) => wrestlerMap[slug]?.name || slug).join(' & ');
    if (teamName && normalize(winner) === normalize(teamName)) winnerIndex = idx;
    else if (normalize(winner) === normalize(individualNames)) winnerIndex = idx;
    else if (normalize(winner) === normalize(teamStr)) winnerIndex = idx;
  });
  return winnerIndex;
}

const ENHANCED_TYPES = new Set([
  'Singles Match',
  'Tag Team',
  'Triple Threat match',
  'Fatal Four-way match',
  '6-person Tag Team',
]);

/**
 * Full-image hero for singles, tag, triple threat, fatal four-way, and 6-person tag (3 vs 3).
 * String participants only; validates slug counts per match type.
 */
export function shouldUseEnhancedMatchPage(match, wrestlerMap = {}) {
  if (!match || !ENHANCED_TYPES.has(match.matchType)) return false;
  const teamStrings = getVersusTeamStrings(match);
  if (!teamStrings || teamStrings.length < 2) return false;
  const sides = teamStrings.map((ts) => parseTeamStringForPage(ts, wrestlerMap));
  const mt = match.matchType;
  if (mt === 'Singles Match') {
    return teamStrings.length === 2 && sides.every((s) => s.slugs.length === 1);
  }
  if (mt === 'Tag Team') {
    return teamStrings.length === 2 && sides.every((s) => s.slugs.length === 2);
  }
  if (mt === 'Triple Threat match') {
    return teamStrings.length === 3 && sides.every((s) => s.slugs.length === 1);
  }
  if (mt === 'Fatal Four-way match') {
    return teamStrings.length === 4 && sides.every((s) => s.slugs.length === 1);
  }
  if (mt === '6-person Tag Team') {
    return teamStrings.length === 2 && sides.every((s) => s.slugs.length === 3);
  }
  return false;
}

/** Human-readable page title — never uses championship "None" as the main headline. */
export function buildMatchPageHeadline(match) {
  const stip =
    match.stipulation === 'Custom/Other' && (match.customStipulation || '').trim()
      ? match.customStipulation.trim()
      : match.stipulation && match.stipulation !== 'None'
        ? match.stipulation
        : '';
  const parts = [];
  if (match.matchType && match.matchType !== 'Promo') parts.push(match.matchType);
  if (stip) parts.push(stip);
  if (match.title && match.title !== 'None') parts.push(`for the ${match.title}`);
  if (parts.length === 0) {
    return match.eventName ? `Match — ${match.eventName}` : 'Match';
  }
  return parts.join(' — ');
}
