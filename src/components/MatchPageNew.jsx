import React, { useMemo, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useUser } from '../hooks/useUser';
import MatchEdit, { PromoMatchEdit } from './MatchEdit';
import MatchCard from './MatchCard';
import MatchPageHero from './MatchPageHero';
import MatchCardTabsSection from './MatchCardTabsSection';
import { getRoyalRumbleHighlights } from '../utils/royalRumbleStats';
import { getEventSlug } from '../utils/eventSlug';
import { buildMatchPageHeadline, shouldUseEnhancedMatchPage } from '../utils/matchPageLayout';

// Short date for title/meta (e.g. "Feb 16, 2026")
function formatDateShort(dateStr) {
  if (!dateStr) return '';
  let dateObj;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-');
    dateObj = new Date(Number(year), Number(month) - 1, Number(day));
  } else {
    dateObj = new Date(dateStr);
  }
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// When true, show gauntlet participants in entry order (→). When false, show as multi-way (vs).
function hasGauntletResults(match) {
  if (!match || (match.matchType !== 'Gauntlet Match' && match.matchType !== 'Tag Team Gauntlet Match')) return false;
  const hasProgression = match.gauntletProgression && match.gauntletProgression.length > 0 &&
    match.gauntletProgression.some(p => p && p.winner && p.method);
  const hasResult = match.result && String(match.result).trim();
  return !!(hasProgression || hasResult);
}

// Helper to get display names for participants from slugs
function getParticipantsDisplay(participants, wrestlerMap, stipulation, matchType, match) {
  const useGauntletOrder = match && (matchType === 'Gauntlet Match' || matchType === 'Tag Team Gauntlet Match') && hasGauntletResults(match);
  const gauntletSeparator = useGauntletOrder ? ' → ' : ' vs ';
  if (Array.isArray(participants)) {
    // Battle Royal: flat array of slugs
    if ((matchType || stipulation) === 'Battle Royal' || participants.every(p => typeof p === 'string')) {
      return participants.map(slug => wrestlerMap?.[slug]?.name || slug).join(', ');
    }
    // Tag Team Gauntlet: array of teams (each team [slug1, slug2])
    if (matchType === 'Tag Team Gauntlet Match') {
      return participants.map(team => (Array.isArray(team) ? team : []).map(slug => wrestlerMap?.[slug]?.name || slug).join(' & ')).join(gauntletSeparator);
    }
    // Gauntlet Match and 2 out of 3 Falls: array of individual participants
    if (matchType === 'Gauntlet Match' || matchType === '2 out of 3 Falls') {
      return participants.map(team => (Array.isArray(team) ? team : []).map(slug => wrestlerMap?.[slug]?.name || slug).join('')).join(gauntletSeparator);
    }
    // Tag/singles: array of arrays
    return participants.map(team => (Array.isArray(team) ? team : []).map(slug => wrestlerMap?.[slug]?.name || slug).join(' & ')).join(' vs ');
  }
  if (typeof participants === 'string' && wrestlerMap) {
    // Handle Gauntlet, Tag Team Gauntlet, and 2 out of 3 Falls (→ when has results, vs when upcoming)
    if (matchType === 'Gauntlet Match' || matchType === 'Tag Team Gauntlet Match' || matchType === '2 out of 3 Falls') {
      const parts = participants.split(' → ').map(part => {
        const p = part.trim();
        if (p.includes('&')) return p.split('&').map(s => wrestlerMap[s.trim()]?.name || s.trim()).join(' & ');
        return wrestlerMap[p]?.name || p;
      });
      return parts.join(matchType === '2 out of 3 Falls' ? ' → ' : gauntletSeparator);
    }
    // Split by vs, then by &
    return participants.split(' vs ').map(side => {
      // Handle team name with slugs in parentheses
      const teamMatch = side.match(/^([^(]+)\s*\(([^)]+)\)$/);
      if (teamMatch) {
        const teamName = teamMatch[1].trim();
        const slugs = teamMatch[2].split('&').map(s => s.trim());
        const names = slugs.map(slug => wrestlerMap[slug]?.name || slug).join(' & ');
        return `${teamName} (${names})`;
      }
      // Otherwise, just slugs
      return side.split('&').map(slug => {
        const s = slug.trim();
        return wrestlerMap[s]?.name || s;
      }).join(' & ');
    }).join(' vs ');
  }
  return participants || '';
}

// Helper to get display name for winner from slug or team
function getWinnerDisplay(match, wrestlerMap) {
  // PATCH: Handle Battle Royal winner display
  if (match.stipulation === 'Battle Royal' && match.winner) {
    return wrestlerMap?.[match.winner]?.name || match.winner;
  }
  if (!match.result) return '';
  if (match.result.includes(' def. ')) {
    const winnerRaw = match.result.split(' def. ')[0];
    // Try to match as a team (e.g., "Team Name (slug1 & slug2)")
    const teamMatch = winnerRaw.match(/^([^(]+)\s*\(([^)]+)\)$/);
    if (teamMatch) {
      const teamName = teamMatch[1].trim();
      const slugs = teamMatch[2].split('&').map(s => s.trim());
      const names = slugs.map(slug => wrestlerMap?.[slug]?.name || slug).join(' & ');
      return `${teamName} (${names})`;
    }
    // Try to match as multiple slugs (e.g., "slug1 & slug2")
    if (winnerRaw.includes('&')) {
      return winnerRaw.split('&').map(s => {
        const slug = s.trim();
        return wrestlerMap?.[slug]?.name || slug;
      }).join(' & ');
    }
    // Try to match as a single slug
    if (wrestlerMap && wrestlerMap[winnerRaw]) {
      return wrestlerMap[winnerRaw].name;
    }
    // Try to match as a display name (legacy data)
    const found = Object.values(wrestlerMap || {}).find(w => w.name === winnerRaw);
    if (found) return found.name;
    // Fallback: show as is
    return winnerRaw;
  }
  return '';
}

export default function MatchPageNew({ match, matchOrderFromUrl, wrestlers = [], onEdit, wrestlerMap = {}, canEdit = false, events }) {
  const safeWrestlers = Array.isArray(wrestlers) ? wrestlers : [];
  const safeWrestlerMap = wrestlerMap || {};
  const user = useUser();
  const isEditor = canEdit || !!(user && user.email);
  const showPreview = match?.eventStatus === 'upcoming' && match?.eventPreview;
  const showRecap = (match?.eventStatus === 'completed' || match?.eventStatus === 'live') && match?.eventRecap;

  const eventName = match?.eventName || 'WWE';
  const headline = buildMatchPageHeadline(match);
  const dateShort = match?.date ? formatDateShort(match.date) : '';
  const winnerDisplay = getWinnerDisplay(match, safeWrestlerMap);
  const metaDescription =
    `${headline} at ${eventName}${dateShort ? ` (${dateShort})` : ''}. ` +
    (winnerDisplay ? `${winnerDisplay} wins. ` : '') +
    'Full match results, method, and time.';

  const useEnhanced = shouldUseEnhancedMatchPage(match, safeWrestlerMap);
  const matchIndexForCard = matchOrderFromUrl != null ? parseInt(matchOrderFromUrl, 10) - 1 : undefined;
  const navigationIndex = matchIndexForCard != null ? matchIndexForCard + 1 : match?.order || 1;
  /** Path segment for `/events/.../match/:n` — must match the URL, not necessarily `match.order` in the DB */
  const matchPathSegment =
    matchOrderFromUrl != null && String(matchOrderFromUrl).trim() !== ''
      ? String(matchOrderFromUrl)
      : String(match?.order ?? '');
  const eventSlug = getEventSlug({ name: match.eventName, date: match.date });
  const wrestlerLinkState = useMemo(
    () =>
      match.eventId
        ? { fromEvent: match.eventId, fromEventSlug: eventSlug, eventName: match.eventName || 'Event', matchOrder: navigationIndex }
        : null,
    [match.eventId, eventSlug, match.eventName, navigationIndex]
  );
  const wrestlerTo = useCallback(
    (slugOrId) => (slugOrId ? { pathname: `/wrestler/${slugOrId}`, state: wrestlerLinkState || {} } : '/wrestlers'),
    [wrestlerLinkState]
  );

  const hasSummary = !!(match?.summary || (match?.matchType === 'Promo' && match?.notes));
  const hasCommentary = Array.isArray(match?.commentary) && match.commentary.length > 0;
  const summaryContent = match?.matchType === 'Promo' ? (match?.notes || '') : (match?.summary || '');

  const eventForHero = {
    id: match.eventId,
    name: match.eventName,
    date: match.date,
    status: match.eventStatus,
  };

  return (
    <>
      <Helmet>
        <title>
          {[headline, eventName + ' Results', dateShort].filter(Boolean).join(' — ')} | Pro Wrestling Boxscore
        </title>
        <meta name="description" content={metaDescription} />
        <link
          rel="canonical"
          href={`https://prowrestlingboxscore.com/events/${match?.eventSlug || match?.eventId || ''}/match/${matchPathSegment}`}
        />
      </Helmet>
      <div style={{ background: '#181818', color: '#fff', borderRadius: 12, maxWidth: 900, margin: '32px auto', padding: 32 }}>
        <Link to={match.eventSlug ? `/events/${match.eventSlug}` : `/event/${match.eventId || 'unknown'}`} style={{ color: '#C6A04F', textDecoration: 'none', display: 'inline-block', marginBottom: 16 }}>
          ← Back to Event
        </Link>
        {showPreview && (
          <div style={{ marginBottom: 16, padding: 16, background: '#232323', borderRadius: 8, border: '1px solid #C6A04F44' }}>
            <div style={{ color: '#C6A04F', fontWeight: 700, marginBottom: 8 }}>
              Event Preview
            </div>
            <div style={{ color: '#fff', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {match.eventPreview}
            </div>
          </div>
        )}
        {showRecap && (
          <div style={{ marginBottom: 16, padding: 16, background: '#111', borderRadius: 8, border: '1px solid #C6A04F66' }}>
            <div style={{ color: '#C6A04F', fontWeight: 700, marginBottom: 8 }}>
              Event Recap
            </div>
            <div style={{ color: '#fff', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {match.eventRecap}
            </div>
          </div>
        )}
        <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800, marginBottom: 6, textAlign: 'center' }}>
          {headline}
        </h1>
        <p style={{ color: '#aaa', fontSize: 14, textAlign: 'center', margin: '0 0 20px' }}>
          {eventName}
          {dateShort && ` · ${dateShort}`}
        </p>

        {useEnhanced ? (
          <>
            <MatchPageHero
              match={match}
              event={eventForHero}
              wrestlerMap={safeWrestlerMap}
              events={events}
              matchIndex={matchIndexForCard}
              wrestlerTo={wrestlerTo}
            />
            <div
              style={{
                background: '#232323',
                borderRadius: 12,
                border: '1px solid #444',
                boxShadow: '0 0 12px #C6A04F22',
                padding: '18px 24px',
                marginBottom: 24,
              }}
            >
              <MatchCardTabsSection
                match={match}
                event={{ id: match.eventId, name: match.eventName }}
                wrestlerMap={safeWrestlerMap}
                events={events}
                matchIndex={matchIndexForCard}
                royalRumbleHighlights={null}
                wrestlerTo={wrestlerTo}
                summaryContent={summaryContent}
                hasSummary={hasSummary}
                hasCommentary={hasCommentary}
                statisticsExtraHint="Last 5 and calendar-year records are shown above each competitor."
                standalone
              />
            </div>
          </>
        ) : (
          <MatchCard
            match={match}
            event={{ id: match.eventId, name: match.eventName }}
            wrestlerMap={wrestlerMap}
            isClickable={false}
            matchIndex={matchIndexForCard}
            events={events}
          />
        )}

        <div style={{ background: '#111', borderRadius: 8, padding: 16, marginBottom: 24 }}>
          <div style={{ color: '#C6A04F', fontWeight: 700, marginBottom: 8 }}>Match Details</div>
          {match.matchType === 'Royal Rumble' && (() => {
            const rr = getRoyalRumbleHighlights(match);
            if (!rr) return null;
            return (
              <div style={{ marginBottom: 12, padding: '12px 14px', background: '#1a1a1a', borderRadius: 8, border: '1px solid #C6A04F' }}>
                <div style={{ marginBottom: 4 }}>
                  <b style={{ color: '#C6A04F' }}>Winner:</b>{' '}
                  {rr.winner ? (safeWrestlerMap[rr.winner]?.name || rr.winner) : '—'}
                </div>
                {rr.mostEliminations && rr.mostEliminations.length > 0 && (
                  <div style={{ marginBottom: 4 }}>
                    <b style={{ color: '#C6A04F' }}>Most Eliminations:</b>{' '}
                    {rr.mostEliminations.map((w, i) => (
                      <span key={w.slug}>{i > 0 && ' & '}{safeWrestlerMap[w.slug]?.name || w.slug}</span>
                    ))} ({rr.mostEliminations[0].count})
                  </div>
                )}
                {rr.ironman && (
                  <div>
                    <b style={{ color: '#C6A04F' }}>Ironman/Ironwoman:</b>{' '}
                    {safeWrestlerMap[rr.ironman.slug]?.name || rr.ironman.slug}
                    {rr.ironman.time && ` (${rr.ironman.time})`}
                  </div>
                )}
              </div>
            );
          })()}
          <div><b>Participants:</b> {getParticipantsDisplay(match.participants, safeWrestlerMap, match.stipulation, match.matchType, match)}</div>
          {(match.matchType === 'Gauntlet Match' || match.matchType === 'Tag Team Gauntlet Match') && hasGauntletResults(match) && Array.isArray(match.gauntletProgression) && match.gauntletProgression.length > 0 && (
            <div style={{ marginTop: 8, marginBottom: 8 }}>
              <b>{match.matchType === 'Tag Team Gauntlet Match' ? 'Tag Team Gauntlet' : 'Gauntlet'} Progression:</b>
              <div style={{ marginLeft: 16, marginTop: 4 }}>
                {match.gauntletProgression.map((matchResult, index) => {
                  if (matchResult.winner && matchResult.method) {
                    const resolve = (str) => {
                      if (!str) return '';
                      if (str.includes(' & ')) return str.split('&').map(s => safeWrestlerMap[s.trim()]?.name || s.trim()).join(' & ');
                      return safeWrestlerMap[str]?.name || str;
                    };
                    const winnerName = resolve(matchResult.winner);
                    const participant1Name = resolve(matchResult.participant1);
                    const participant2Name = resolve(matchResult.participant2);
                    return (
                      <div key={index} style={{ marginBottom: 2 }}>
                        {winnerName} def. {winnerName === participant1Name ? participant2Name : participant1Name} ({matchResult.method})
                        {index < match.gauntletProgression.length - 1 && ' →'}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          )}
          {match.matchType === '5-on-5 War Games Match' && match.warGamesData && (
            <div style={{ marginTop: 8, marginBottom: 8 }}>
              {match.warGamesData.entryOrder && Array.isArray(match.warGamesData.entryOrder) && match.warGamesData.entryOrder.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <b>Entry Order:</b>
                  <div style={{ marginLeft: 16, marginTop: 4 }}>
                    {[...match.warGamesData.entryOrder].sort((a, b) => a.entryNumber - b.entryNumber).map((entry, index) => {
                      const wrestlerName = safeWrestlerMap[entry.wrestler]?.name || entry.wrestler;
                      const isStart = entry.entryNumber <= 2;
                      return (
                        <div key={index} style={{ marginBottom: 2 }}>
                          Entry #{entry.entryNumber}{isStart ? ' (Starts)' : ''}: {wrestlerName} {index < match.warGamesData.entryOrder.length - 1 && '→'}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {match.warGamesData.pinWinnerName || match.warGamesData.pinSubmissionWinner ? (
                <div style={{ marginBottom: 4 }}>
                  <b>Pin/Submission by:</b> {safeWrestlerMap[match.warGamesData.pinSubmissionWinner]?.name || match.warGamesData.pinWinnerName || match.warGamesData.pinSubmissionWinner}
                </div>
              ) : null}
            </div>
          )}
          {(match.matchType === 'Survivor Series-style 10-man Tag Team Elimination match' || match.matchType?.includes('Survivor Series')) && match.survivorSeriesData && (
            <div style={{ marginTop: 8, marginBottom: 8 }}>
              {match.survivorSeriesData.eliminations && Array.isArray(match.survivorSeriesData.eliminations) && match.survivorSeriesData.eliminations.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <b>Eliminations:</b>
                  <div style={{ marginLeft: 16, marginTop: 4 }}>
                    {[...match.survivorSeriesData.eliminations].sort((a, b) => a.order - b.order).map((elim, index) => {
                      const eliminatedName = safeWrestlerMap[elim.eliminated]?.name || elim.eliminated;
                      const eliminatedByName = safeWrestlerMap[elim.eliminatedBy]?.name || elim.eliminatedBy;
                      return (
                        <div key={index} style={{ marginBottom: 2 }}>
                          #{elim.order}: {eliminatedName} eliminated by {eliminatedByName} ({elim.method}) {index < match.survivorSeriesData.eliminations.length - 1 && '→'}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {match.survivorSeriesData.survivorName || match.survivorSeriesData.survivor ? (
                <div style={{ marginBottom: 4 }}>
                  <b>Survivor:</b> {safeWrestlerMap[match.survivorSeriesData.survivor]?.name || match.survivorSeriesData.survivorName || match.survivorSeriesData.survivor}
                </div>
              ) : null}
            </div>
          )}
          <div><b>Winner:</b> {getWinnerDisplay(match, safeWrestlerMap)}</div>
          <div><b>Method:</b> {match.method}</div>
          <div><b>Time:</b> {match.time}</div>
          <div><b>Stipulation:</b> {(match.stipulation === 'Custom/Other' && (match.customStipulation || '').trim()) ? match.customStipulation.trim() : (match.stipulation || 'None')}</div>
          <div>
            <b>Title:</b>{' '}
            {match.title && match.title !== 'None' ? match.title : <span style={{ color: '#888' }}>Non-title match</span>}
          </div>
          <div><b>Title Outcome:</b> {match.titleOutcome}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          {isEditor && (
            <button onClick={onEdit} style={{
              background: '#C6A04F', color: '#232323', border: 'none', borderRadius: 4,
              fontWeight: 700, fontSize: 16, padding: '10px 32px', cursor: 'pointer'
            }}>
              Edit Match
            </button>
          )}
        </div>
      </div>
    </>
  );
}

function MatchPageNewWrapper({ events, onEditMatch, onRealTimeCommentaryUpdate, wrestlerMap, wrestlers }) {
  // Ensure wrestlers is always an array
  const safeWrestlers = Array.isArray(wrestlers) ? wrestlers : [];
  const user = useUser();
  const { eventId, matchOrder } = useParams();
  const event = events.find(e => e.id === eventId);
  
  if (!event) {
    return <div style={{ padding: 24, color: '#fff' }}>Event not found.</div>;
  }
  
  // Sort matches by order (same as event page) to ensure consistent lookup
  const sortedMatches = [...event.matches].sort((a, b) => {
    const orderA = a.order || 0;
    const orderB = b.order || 0;
    return orderA - orderB;
  });
  
  // Use the matchOrder as an index (1-based) to find the match in the sorted array
  // matchOrder comes from the URL and represents the position in the sorted list
  const matchOrderNum = parseInt(matchOrder, 10);
  const matchIndex = !isNaN(matchOrderNum) && matchOrderNum > 0 ? matchOrderNum - 1 : -1;
  const match = matchIndex >= 0 && matchIndex < sortedMatches.length ? sortedMatches[matchIndex] : null;
  
  // Find the original index in event.matches for editing
  const originalMatchIndex = event && match ? event.matches.findIndex(m => m === match || (m.order === match.order && m.participants === match.participants)) : -1;
  const [isEditing, setIsEditing] = React.useState(false);

  if (!event) {
    return (
      <div style={{ padding: 24, color: '#fff' }}>
        <div style={{ fontSize: 18, marginBottom: 16 }}>Event not found.</div>
        <div style={{ fontSize: 14, color: '#999' }}>
          Looking for eventId: <strong>{eventId}</strong><br/>
          Total events loaded: {events.length}<br/>
          Event IDs: {events.slice(0, 5).map(e => e.id).join(', ')}...
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div style={{ padding: 24, color: '#fff' }}>
        <div style={{ fontSize: 18, marginBottom: 16 }}>Match not found.</div>
        <div style={{ fontSize: 14, color: '#999', lineHeight: 1.6 }}>
          <div>Event: <strong>{event.name}</strong></div>
          <div>Event ID: {eventId}</div>
          <div>Match Order from URL: <strong>{matchOrder}</strong></div>
          <div>Parsed as number: {matchOrderNum}</div>
          <div>Calculated index (0-based): {matchIndex}</div>
          <div>Total matches in event: {event.matches.length}</div>
          <div>Sorted matches length: {sortedMatches.length}</div>
          <div style={{ marginTop: 16 }}>
            Match indices available: 1-{sortedMatches.length}
          </div>
          {sortedMatches.length > 0 && (
            <div style={{ marginTop: 8 }}>
              First match participants: {sortedMatches[0]?.participants || 'N/A'}<br/>
              {matchIndex >= 0 && matchIndex < sortedMatches.length && (
                <div>Match at index {matchIndex}: {sortedMatches[matchIndex]?.participants || 'N/A'}</div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = (updatedMatch) => {
    let targetIndex = event.matches.findIndex(
      (m) => (m.order ?? 0) === (updatedMatch.order ?? 0)
    );
    if (targetIndex < 0 && matchIndex >= 0) {
      const atDisplay = sortedMatches[matchIndex];
      if (atDisplay) {
        targetIndex = event.matches.findIndex(
          (m) => (m.order ?? 0) === (atDisplay.order ?? 0)
        );
      }
    }
    if (targetIndex < 0 && originalMatchIndex >= 0) targetIndex = originalMatchIndex;
    const updatedMatches = [...event.matches];
    if (targetIndex >= 0 && targetIndex < updatedMatches.length) {
      updatedMatches[targetIndex] = updatedMatch;
      onEditMatch(event.id, updatedMatches);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div style={{ background: '#181511', minHeight: '100vh', padding: 24 }}>
        <Link to={`/events/${getEventSlug(event)}`} style={{ color: '#C6A04F' }}>← Back to Event</Link>
        <h2 style={{ color: '#C6A04F', marginTop: 24 }}>Edit Match</h2>
        {user && (
          match.matchType === 'Promo' ? (
            <PromoMatchEdit
              initialMatch={match}
              onSave={handleSave}
              onCancel={handleCancel}
              wrestlers={safeWrestlers}
            />
          ) : (
            <MatchEdit
              initialMatch={match}
              eventStatus={event.status}
              eventDate={event.date}
              onSave={handleSave}
              onCancel={handleCancel}
              onRealTimeCommentaryUpdate={onRealTimeCommentaryUpdate}
              eventId={event.id}
              matchOrder={match.order}
              wrestlers={safeWrestlers}
            />
          )
        )}
      </div>
    );
  }

  return (
    <MatchPageNew 
      match={{ ...match, eventId: event.id }} 
      wrestlers={safeWrestlers} 
      onEdit={handleEdit}
      wrestlerMap={wrestlerMap}
    />
  );
} 