import React from 'react';
import { Link, useParams } from 'react-router-dom';
import BeltIcon from './BeltIcon';
import { Helmet } from 'react-helmet';
import { useUser } from '../hooks/useUser';
import MatchEdit from './MatchEdit';
import MatchCard from './MatchCard';

// Helper to get display names for participants from slugs
function getParticipantsDisplay(participants, wrestlerMap, stipulation, matchType) {
  if (Array.isArray(participants)) {
    // Battle Royal: flat array of slugs
    if ((matchType || stipulation) === 'Battle Royal' || participants.every(p => typeof p === 'string')) {
      return participants.map(slug => wrestlerMap?.[slug]?.name || slug).join(', ');
    }
    // Gauntlet Match and 2 out of 3 Falls: array of individual participants
    if (matchType === 'Gauntlet Match' || matchType === '2 out of 3 Falls') {
      return participants.map(team => (Array.isArray(team) ? team : []).map(slug => wrestlerMap?.[slug]?.name || slug).join('')).join(' → ');
    }
    // Tag/singles: array of arrays
    return participants.map(team => (Array.isArray(team) ? team : []).map(slug => wrestlerMap?.[slug]?.name || slug).join(' & ')).join(' vs ');
  }
  if (typeof participants === 'string' && wrestlerMap) {
    // Handle Gauntlet Matches and 2 out of 3 Falls with → separators
    if (matchType === 'Gauntlet Match' || matchType === '2 out of 3 Falls') {
      return participants.split(' → ').map(slug => {
        const s = slug.trim();
        return wrestlerMap[s]?.name || s;
      }).join(' → ');
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

// Helper to format commentary elapsed time (copied from App.jsx)
function formatCommentaryElapsedTime(ts, liveStart, commentary) {
  let start = liveStart;
  if (!start && commentary && commentary.length > 0) {
    // Use the first (newest) commentary timestamp as start since we're now storing newest first
    start = commentary[0].timestamp;
  }
  if (!ts || !start) return '0\'';
  const elapsed = Math.max(0, Math.ceil((ts - start) / 60000));
  return `${elapsed}'`;
}

export default function MatchPageNew({ match, wrestlers = [], onEdit, wrestlerMap = {} }) {
  // Ensure wrestlers is always an array
  const safeWrestlers = Array.isArray(wrestlers) ? wrestlers : [];
  // Ensure wrestlerMap is always an object
  const safeWrestlerMap = wrestlerMap || {};
  const user = useUser();
  
  // Debug logging
  console.log('MatchPageNew user:', user);
  console.log('MatchPageNew user.email:', user?.email);

  return (
    <>
      <Helmet>
        <title>
          {(match?.eventName || match?.title || 'Event') +
            ' Match Results - ' +
            (match?.date || '') +
            ' | Pro Wrestling Boxscore'}
        </title>
        <meta
          name="description"
          content={`Detailed match results for ${match?.eventName || match?.title || 'this event'}${
            match?.date ? ' on ' + match.date : ''
          }${match?.location ? ' from ' + match.location : ''}, including participants, winner, method, and time.`}
        />
        <link
          rel="canonical"
          href={`https://prowrestlingboxscore.com/event/${match?.eventId || ''}/match/${match?.order || ''}`}
        />
      </Helmet>
      <div style={{ background: '#181818', color: '#fff', borderRadius: 12, maxWidth: 900, margin: '32px auto', padding: 32 }}>
        <Link to={`/event/${match.eventId || 'unknown'}`} style={{ color: '#C6A04F', textDecoration: 'none', display: 'inline-block', marginBottom: 16 }}>
          ← Back to Event
        </Link>
        <div style={{ textAlign: 'center', color: '#C6A04F', fontWeight: 700, fontSize: 22, marginBottom: 8 }}>
          {match.title}
        </div>
        
        {/* Use the unified MatchCard component */}
        <MatchCard 
          match={match} 
          event={{ id: match.eventId }} 
          wrestlerMap={wrestlerMap} 
          isClickable={false}
        />
        
        <div style={{ background: '#111', borderRadius: 8, padding: 16, marginBottom: 24 }}>
          <div style={{ color: '#C6A04F', fontWeight: 700, marginBottom: 8 }}>Match Details</div>
          <div><b>Participants:</b> {getParticipantsDisplay(match.participants, safeWrestlerMap, match.stipulation, match.matchType)}</div>
          {match.matchType === 'Gauntlet Match' && Array.isArray(match.gauntletProgression) && match.gauntletProgression.length > 0 && (
            <div style={{ marginTop: 8, marginBottom: 8 }}>
              <b>Gauntlet Progression:</b>
              <div style={{ marginLeft: 16, marginTop: 4 }}>
                {match.gauntletProgression.map((matchResult, index) => {
                  if (matchResult.winner && matchResult.method) {
                    const winnerName = safeWrestlerMap[matchResult.winner]?.name || matchResult.winner;
                    const participant1Name = safeWrestlerMap[matchResult.participant1]?.name || matchResult.participant1;
                    const participant2Name = safeWrestlerMap[matchResult.participant2]?.name || matchResult.participant2;
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
          <div><b>Stipulation:</b> {match.stipulation}</div>
          <div><b>Title:</b> {match.title}</div>
          <div><b>Title Outcome:</b> {match.titleOutcome}</div>
        </div>
        <div style={{ background: '#111', borderRadius: 8, padding: 16, marginBottom: 24 }}>
          <div style={{ color: '#C6A04F', fontWeight: 700, marginBottom: 8 }}>Match Commentary</div>
          {Array.isArray(match.commentary) && match.commentary.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {match.commentary.map((c, i) => (
                <li key={i} style={{ marginBottom: 4 }}>
                  <span style={{ color: '#C6A04F', marginRight: 8 }}>{formatCommentaryElapsedTime(c.timestamp, match.liveStart, match.commentary)}</span>
                  {c.text}
                </li>
              ))}
            </ul>
          ) : <div style={{ color: '#bbb' }}>No commentary yet.</div>}
        </div>
        <div style={{ textAlign: 'center' }}>
          {user && user.email && (
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
    const updatedMatches = [...event.matches];
    // Use originalMatchIndex if available, otherwise fall back to matchIndex
    const indexToUpdate = originalMatchIndex !== -1 ? originalMatchIndex : matchIndex;
    if (indexToUpdate !== -1) {
      updatedMatches[indexToUpdate] = updatedMatch;
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
        <Link to={`/event/${event.id}`} style={{ color: '#C6A04F' }}>← Back to Event</Link>
        <h2 style={{ color: '#C6A04F', marginTop: 24 }}>Edit Match</h2>
        {user && (
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