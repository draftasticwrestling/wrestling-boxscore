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
    start = commentary[commentary.length - 1].timestamp;
  }
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
        <title>{match?.eventName || match?.title || 'Event'} Results - {match?.date || ''} | Wrestling Boxscore</title>
        <meta name="description" content={`Full results and match card for ${match?.eventName || match?.title || 'this event'}${match?.date ? ' on ' + match.date : ''}${match?.location ? ' in ' + match.location : ''}.`} />
        <link rel="canonical" href={`https://wrestlingboxscore.com/event/${match?.eventId || ''}/match/${match?.order || ''}`} />
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
  
  // Debug logging
  console.log('MatchPageNewWrapper user:', user);
  console.log('MatchPageNewWrapper user.email:', user?.email);
  const { eventId, matchOrder } = useParams();
  const event = events.find(e => e.id === eventId);
  const matchIndex = event ? event.matches.findIndex(m => String(m.order) === String(matchOrder)) : -1;
  const match = event && matchIndex !== -1 ? event.matches[matchIndex] : null;
  const [isEditing, setIsEditing] = React.useState(false);

  if (!event || !match) {
    return <div style={{ padding: 24 }}>Match not found.</div>;
  }

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = (updatedMatch) => {
    const updatedMatches = [...event.matches];
    updatedMatches[matchIndex] = updatedMatch;
    onEditMatch(event.id, updatedMatches);
    setIsEditing(false);
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