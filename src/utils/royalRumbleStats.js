/**
 * Compute Royal Rumble highlights (Winner, Most Eliminations, Ironman) from match data.
 * Used by Match Details (MatchPageNew, App.jsx expanded details) so the info appears
 * in the expanded text section, not on the visual match card.
 * @param {Object} match - Match object with matchType, winner, royalRumbleData, time
 * @returns {{ winner: string|null, mostEliminations: Array<{slug: string, count: number}>|null, ironman: {slug: string, time: string|null}|null }|null}
 */
export function getRoyalRumbleHighlights(match) {
  if (!match || match.matchType !== 'Royal Rumble') return null;
  const { entryOrder = [], eliminations = [], manualIronman } = match.royalRumbleData || {};

  const parseTime = (s) => {
    if (!s) return 0;
    const p = String(s).split(':');
    return p.length === 2 ? parseInt(p[0], 10) * 60 + parseInt(p[1], 10) : 0;
  };
  const formatTime = (sec) => `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;

  const participantStats = {};
  entryOrder.forEach((entry) => {
    const entrySeconds = parseTime(entry.entryTime);
    const official = entry.timeInRing ? parseTime(entry.timeInRing) : null;
    participantStats[entry.slug] = { entrySeconds, eliminationSeconds: null, timeInRumble: official, eliminations: 0 };
  });
  eliminations.forEach((elim) => {
    [elim.eliminatedBy, elim.eliminatedBy2, elim.eliminated].filter(Boolean).forEach((slug) => {
      if (!participantStats[slug]) {
        participantStats[slug] = { entrySeconds: 0, eliminationSeconds: null, timeInRumble: null, eliminations: 0 };
      }
    });
  });

  const hasOfficialTimes = entryOrder.some((e) => !!e.timeInRing);
  eliminations.forEach((elim) => {
    if (elim.eliminated && elim.time) {
      const es = parseTime(elim.time);
      if (participantStats[elim.eliminated]) {
        const st = participantStats[elim.eliminated];
        st.eliminationSeconds = es;
        if (st.timeInRumble == null && st.entrySeconds != null) st.timeInRumble = es - st.entrySeconds;
      }
    }
    if (elim.eliminatedBy && participantStats[elim.eliminatedBy]) participantStats[elim.eliminatedBy].eliminations++;
    if (elim.eliminatedBy2 && participantStats[elim.eliminatedBy2]) participantStats[elim.eliminatedBy2].eliminations++;
  });

  if (match.winner && participantStats[match.winner] && match.time) {
    const st = participantStats[match.winner];
    if (st.timeInRumble == null && !st.eliminationSeconds) st.timeInRumble = parseTime(match.time) - st.entrySeconds;
  }

  let ironman = null;
  let maxT = -1;
  Object.entries(participantStats).forEach(([slug, st]) => {
    if (st.timeInRumble != null && st.timeInRumble > maxT) {
      maxT = st.timeInRumble;
      ironman = { slug, time: formatTime(st.timeInRumble) };
    }
  });
  if (!hasOfficialTimes && manualIronman && participantStats[manualIronman]) {
    const st = participantStats[manualIronman];
    ironman = { slug: manualIronman, time: st.timeInRumble != null ? formatTime(st.timeInRumble) : null };
  }

  let mostEliminations = [];
  let maxE = -1;
  Object.entries(participantStats).forEach(([slug, st]) => {
    if (st.eliminations > maxE) {
      maxE = st.eliminations;
      mostEliminations = [{ slug, count: st.eliminations }];
    } else if (st.eliminations === maxE && maxE > 0) {
      mostEliminations.push({ slug, count: st.eliminations });
    }
  });

  return {
    winner: match.winner || null,
    mostEliminations: mostEliminations.length > 0 && mostEliminations[0].count > 0 ? mostEliminations : null,
    ironman: ironman && (ironman.time || participantStats[ironman?.slug]?.timeInRumble != null) ? ironman : null,
  };
}
