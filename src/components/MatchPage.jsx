import React from 'react';
import { useParams, Link } from 'react-router-dom';
import MatchEdit from './MatchEdit';
import { useUser } from '../hooks/useUser';

const gold = '#C6A04F';
const sectionStyle = {
  background: 'rgba(20, 20, 20, 0.98)',
  borderRadius: 12,
  boxShadow: '0 0 24px #C6A04F22',
  padding: '24px 40px',
  margin: '24px auto',
  maxWidth: 600,
};

const tableStyle = {
  width: '100%',
  background: 'rgba(34, 34, 34, 0.98)',
  color: gold,
  borderCollapse: 'collapse',
  boxShadow: '0 0 12px #C6A04F22',
};
const thStyle = {
  background: '#222',
  color: gold,
  fontWeight: 700,
  borderBottom: '2px solid #C6A04F',
  padding: 10,
  textAlign: 'left',
  minWidth: 120,
};
const tdStyle = {
  background: 'rgba(34, 34, 34, 0.98)',
  color: '#fff8e1',
  borderBottom: '1px solid #444',
  padding: 10,
  verticalAlign: 'top',
};

export default function MatchPage({ events, onEditMatch, getParticipantsDisplay, wrestlerMap }) {
  const user = useUser();
  const { eventId, matchOrder } = useParams();
  const event = events.find(e => e.id === eventId);
  
  // Sort matches by order (same as event page) to ensure consistent lookup
  const sortedMatches = event ? [...event.matches].sort((a, b) => {
    const orderA = a.order || 0;
    const orderB = b.order || 0;
    return orderA - orderB;
  }) : [];
  
  // Use the matchOrder as an index (1-based) to find the match in the sorted array
  // matchOrder comes from the URL and represents the position in the sorted list
  const matchOrderNum = parseInt(matchOrder, 10);
  const matchIndex = !isNaN(matchOrderNum) && matchOrderNum > 0 ? matchOrderNum - 1 : -1;
  const match = matchIndex >= 0 && matchIndex < sortedMatches.length ? sortedMatches[matchIndex] : null;
  
  // Find the original index in event.matches for editing
  const originalMatchIndex = event && match ? event.matches.findIndex(m => m === match || (m.order === match.order && m.participants === match.participants)) : -1;
  const [isEditing, setIsEditing] = React.useState(false);

  if (!event || !match) {
    return <div style={{ padding: 24 }}>Match not found.</div>;
  }

  // Helper to format commentary time
  function formatCommentaryTime(ts, liveStart, commentary) {
    let start = liveStart;
    if (!start && commentary && commentary.length > 0) {
      // Use the first (newest) commentary timestamp as start since we're now storing newest first
      start = commentary[0].timestamp;
    }
    if (!ts || !start) return '0\'';
    const elapsed = Math.max(0, Math.ceil((ts - start) / 60000));
    return `${elapsed}'`;
  }

  if (isEditing && user) {
    return (
      <div style={sectionStyle}>
        <Link to={`/event/${event.id}`} style={{ color: gold }}>← Back to Event</Link>
        <h2 style={{ color: gold, marginTop: 24 }}>Edit Match</h2>
        <MatchEdit
          initialMatch={match}
          eventStatus={event.status}
          eventDate={event.date}
          onSave={updatedMatch => {
            const updatedMatches = [...event.matches];
            // Use originalMatchIndex if available, otherwise fall back to matchIndex
            const indexToUpdate = originalMatchIndex !== -1 ? originalMatchIndex : matchIndex;
            if (indexToUpdate !== -1) {
              updatedMatches[indexToUpdate] = updatedMatch;
              onEditMatch(event.id, updatedMatches);
              setIsEditing(false);
            }
          }}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    );
  }

  return (
    <div style={sectionStyle}>
      <Link to={`/event/${event.id}`} style={{ color: gold }}>← Back to Event</Link>
      <h2 style={{ color: gold, marginTop: 24 }}>Match Details</h2>
      {event.status === 'live' && match.isLive && (
        <div style={{
          marginTop: 8,
          marginBottom: 16,
          padding: '6px 12px',
          display: 'inline-block',
          borderRadius: 999,
          background: '#27ae60',
          color: '#fff',
          fontWeight: 700,
          fontSize: 13,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}>
          Match in progress
        </div>
      )}
      {user && user.email && (
        <button
          style={{
            marginBottom: 24,
            background: gold,
            color: '#232323',
            border: 'none',
            borderRadius: 4,
            fontWeight: 700,
            fontSize: 16,
            padding: '8px 24px',
            cursor: 'pointer',
          }}
          onClick={() => setIsEditing(true)}
        >
          Edit Match
        </button>
      )}
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Field</th>
            <th style={thStyle}>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style={tdStyle}>Participants</td><td style={tdStyle}>{/* Show names, not slugs */}
            {/* TODO: Wire wrestlerMap prop from parent if not available */}
            {typeof getParticipantsDisplay === 'function' && typeof wrestlerMap === 'object'
              ? getParticipantsDisplay(match.participants, wrestlerMap)
              : match.participants}
          </td></tr>
          <tr><td style={tdStyle}>Winner</td><td style={tdStyle}>{(() => {
            const winnerSlug = match.result && match.result.includes(' def. ')
              ? match.result.split(' def. ')[0]
              : (match.result || 'None');
            return wrestlerMap && wrestlerMap[winnerSlug]
              ? wrestlerMap[winnerSlug].name
              : winnerSlug;
          })()}</td></tr>
          <tr><td style={tdStyle}>Method</td><td style={tdStyle}>{match.method || 'None'}</td></tr>
          <tr><td style={tdStyle}>Time</td><td style={tdStyle}>{match.time || 'None'}</td></tr>
          <tr><td style={tdStyle}>Stipulation</td><td style={tdStyle}>{match.stipulation || 'None'}</td></tr>
          <tr><td style={tdStyle}>Title</td><td style={tdStyle}>{match.title || 'None'}</td></tr>
          <tr><td style={tdStyle}>Title Outcome</td><td style={tdStyle}>{match.titleOutcome || 'None'}</td></tr>
        </tbody>
      </table>
      {match.matchType === '5-on-5 War Games Match' && match.warGamesData && (
        <div style={{ marginTop: 16, marginBottom: 24 }}>
          {match.warGamesData.entryOrder && Array.isArray(match.warGamesData.entryOrder) && match.warGamesData.entryOrder.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <strong style={{ color: gold }}>Entry Order:</strong>
              <div style={{ color: '#fff', marginTop: 4, marginLeft: 16 }}>
                {[...match.warGamesData.entryOrder].sort((a, b) => a.entryNumber - b.entryNumber).map((entry, index) => {
                  const wrestlerName = wrestlerMap && wrestlerMap[entry.wrestler] 
                    ? wrestlerMap[entry.wrestler].name 
                    : entry.wrestler;
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
            <div style={{ marginBottom: 12 }}>
              <strong style={{ color: gold }}>Pin/Submission by:</strong>
              <div style={{ color: '#fff', marginTop: 4, marginLeft: 16 }}>
                {wrestlerMap && wrestlerMap[match.warGamesData.pinSubmissionWinner]
                  ? wrestlerMap[match.warGamesData.pinSubmissionWinner].name
                  : (match.warGamesData.pinWinnerName || match.warGamesData.pinSubmissionWinner)}
              </div>
            </div>
          ) : null}
        </div>
      )}
      {(match.matchType === 'Survivor Series-style 10-man Tag Team Elimination match' || match.matchType?.includes('Survivor Series')) && match.survivorSeriesData && (
        <div style={{ marginTop: 16, marginBottom: 24 }}>
          {match.survivorSeriesData.eliminations && Array.isArray(match.survivorSeriesData.eliminations) && match.survivorSeriesData.eliminations.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <strong style={{ color: gold }}>Eliminations:</strong>
              <div style={{ color: '#fff', marginTop: 4, marginLeft: 16 }}>
                {[...match.survivorSeriesData.eliminations].sort((a, b) => a.order - b.order).map((elim, index) => {
                  const eliminatedName = wrestlerMap && wrestlerMap[elim.eliminated]
                    ? wrestlerMap[elim.eliminated].name
                    : elim.eliminated;
                  const eliminatedByName = wrestlerMap && wrestlerMap[elim.eliminatedBy]
                    ? wrestlerMap[elim.eliminatedBy].name
                    : elim.eliminatedBy;
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
            <div style={{ marginBottom: 12 }}>
              <strong style={{ color: gold }}>Survivor:</strong>
              <div style={{ color: '#fff', marginTop: 4, marginLeft: 16 }}>
                {wrestlerMap && wrestlerMap[match.survivorSeriesData.survivor]
                  ? wrestlerMap[match.survivorSeriesData.survivor].name
                  : (match.survivorSeriesData.survivorName || match.survivorSeriesData.survivor)}
              </div>
            </div>
          ) : null}
        </div>
      )}
      {match.notes && (
        <div style={{ marginBottom: 24 }}>
          <strong style={{ color: gold }}>Notes:</strong>
          <div style={{ color: '#fff', marginTop: 4 }}>{match.notes}</div>
        </div>
      )}
      {Array.isArray(match.commentary) && match.commentary.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ color: gold, fontWeight: 600, marginBottom: 6 }}>Live Commentary</div>
          <div style={{ maxHeight: 220, overflowY: 'auto', borderRadius: 4, background: '#232323', padding: 8 }}>
            {match.commentary.map((c, idx) => {
              return (
                <div key={idx} style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: gold, minWidth: 32 }}>{formatCommentaryTime(c.timestamp, match.liveStart, match.commentary)}</span>
                  <span style={{ color: '#fff' }}>{c.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
} 