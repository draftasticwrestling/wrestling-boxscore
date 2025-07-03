import React from 'react';
import { Link } from 'react-router-dom';
import BeltIcon from './BeltIcon';

// Utility to calculate age from dob
function calculateAge(dob) {
  if (!dob) return '—';
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
}

// Utility to display last 5 matches as icons
function Last5Matches({ results }) {
  // results: array of 'W', 'L', 'D'
  const colorMap = { W: '#4CAF50', L: '#E53935', D: '#FFC107' };
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {results && results.length > 0 ? results.map((r, i) => (
        <span key={i} style={{
          display: 'inline-block',
          width: 22, height: 22, borderRadius: '50%',
          background: colorMap[r] || '#bbb',
          color: '#222', fontWeight: 700, textAlign: 'center', lineHeight: '22px'
        }}>{r}</span>
      )) : <span style={{ color: '#bbb' }}>—</span>}
    </div>
  );
}

function WrestlerInfoBlock({ wrestler = {}, titleStatus, last5 }) {
  return (
    <div style={{ flex: 1, minWidth: 180, textAlign: 'center', color: '#fff', margin: '0 12px' }}>
      {titleStatus && <div style={{ color: '#FFD700', fontWeight: 600, marginBottom: 8 }}>{titleStatus}</div>}
      <div style={{ fontSize: 14, marginBottom: 2 }}>
        <b>Age:</b> {calculateAge(wrestler.dob)} &nbsp; <b>Nationality:</b> {wrestler.nationality || '—'}
      </div>
      <div style={{ fontSize: 14, marginBottom: 2 }}>
        <b>Promotion:</b> {wrestler.promotion || '—'} &nbsp; <b>Brand:</b> {wrestler.brand || '—'}
      </div>
      <div style={{ fontSize: 14, marginBottom: 2 }}>
        <b>Current title held:</b> {wrestler.currentTitle || 'None'}
      </div>
      <div style={{ fontSize: 14, marginBottom: 2 }}>
        <b>Most recent title held:</b> {wrestler.recentTitle || 'None'}
      </div>
      <div style={{ fontSize: 14, marginBottom: 2 }}>
        <b>Last 5 matches:</b> <Last5Matches results={last5} />
      </div>
    </div>
  );
}

// Helper to get display names for participants from slugs
function getParticipantsDisplay(participants, wrestlerMap) {
  if (Array.isArray(participants)) {
    return participants.map(team => team.map(slug => wrestlerMap?.[slug]?.name || slug).join(' & ')).join(' vs ');
  }
  if (typeof participants === 'string' && wrestlerMap) {
    return participants.split(' vs ').map(side =>
      side.split('&').map(slug => {
        const s = slug.trim();
        return wrestlerMap[s]?.name || s;
      }).join(' & ')
    ).join(' vs ');
  }
  return participants || '';
}

// Helper to get display name for winner from slug
function getWinnerDisplay(match, wrestlerMap) {
  if (match.result && match.result.includes(' def. ')) {
    const winnerSlug = match.result.split(' def. ')[0];
    return wrestlerMap && wrestlerMap[winnerSlug] ? wrestlerMap[winnerSlug].name : winnerSlug;
  }
  return '';
}

export default function MatchPageNew({ match, wrestlers = [], onEdit, wrestlerMap }) {
  // wrestlers: array of full wrestler objects in match order
  // last5Results: array of arrays, one per wrestler, e.g. [['W','L','W','W','D'], ...]
  // titleStatus: e.g. 'Successful Defense', 'New Champion', etc.

  // Determine winner index (0 or 1) using slug
  let winnerIndex = -1;
  let winnerSlug = '';
  if (match.result && match.result.includes(' def. ')) {
    winnerSlug = match.result.split(' def. ')[0];
    if (wrestlers[0]?.id === winnerSlug) winnerIndex = 0;
    else if (wrestlers[1]?.id === winnerSlug) winnerIndex = 1;
  }

  // SVG triangle arrows for winner indication
  const triangleRight = (
    <svg width="14" height="18" viewBox="0 0 8 16" style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 8 }}>
      <polygon points="0,8 8,0 8,16" fill="#fff" />
    </svg>
  );
  const triangleLeft = (
    <svg width="14" height="18" viewBox="0 0 8 16" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }}>
      <polygon points="8,8 0,0 0,16" fill="#fff" />
    </svg>
  );

  const isTitleMatch = match.title && match.title !== 'None';
  const isCompleted = match.result && match.result.includes(' def. ');

  // Top label logic
  let topLabel = '';
  if (isTitleMatch && match.stipulation && match.stipulation !== 'None') {
    topLabel = `${match.stipulation} - Title Match`;
  } else if (isTitleMatch) {
    topLabel = 'Title Match';
  } else if (match.stipulation && match.stipulation !== 'None') {
    topLabel = match.stipulation;
  }

  return (
    <div style={{ background: '#181818', color: '#fff', borderRadius: 12, maxWidth: 1100, margin: '32px auto', padding: 32 }}>
      <Link to={`/event/${match.eventId || 'unknown'}`} style={{ color: '#C6A04F', textDecoration: 'none', display: 'inline-block', marginBottom: 16 }}>
        ← Back to Event
      </Link>
      {/* Centered event title */}
      <div style={{ textAlign: 'center', color: '#C6A04F', fontWeight: 700, fontSize: 22, marginBottom: 8 }}>
        {match.title}
      </div>
      {/* Match Card Layout */}
      <div style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'center', gap: 0, marginBottom: 8, minHeight: 260 }}>
        {/* Left participant */}
        <div style={{ textAlign: 'center', position: 'relative', minWidth: 200, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 260 }}>
          <img src={wrestlers[0]?.image_url} alt={wrestlers[0]?.name} style={{ width: 110, height: 110, borderRadius: '50%', objectFit: 'cover', marginBottom: 8, border: winnerIndex === 0 ? '4px solid #C6A04F' : '2px solid #888' }} />
          <div style={{ fontWeight: 700, fontSize: 22, marginTop: 4 }}>{wrestlers[0]?.name || '—'}</div>
          {/* Belt and title outcome under winner, or placeholder for loser */}
          {isCompleted && winnerIndex === 0 && isTitleMatch ? (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: 48 }}>
              <BeltIcon size={36} />
              {match.titleOutcome && match.titleOutcome !== 'None' && (
                <div style={{ fontSize: 13, color: match.titleOutcome === 'New Champion' ? '#4CAF50' : '#FFC107', fontWeight: 600, marginTop: 2 }}>{match.titleOutcome}</div>
              )}
            </div>
          ) : (
            <div style={{ marginTop: 8, minHeight: 48 }}></div>
          )}
          {/* Wrestler Info Block under image/name */}
          <div style={{ marginTop: 16 }}>
            <WrestlerInfoBlock wrestler={wrestlers[0]} titleStatus={wrestlers[0]?.titleStatus} last5={wrestlers[0]?.last5Results} />
          </div>
        </div>
        {/* Left arrow (always reserve space) and center match info, vertically centered */}
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', minWidth: 240, justifyContent: 'center', height: 260 }}>
          <div style={{ width: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 260 }}>
            {isCompleted && winnerIndex === 0 ? triangleRight : <span style={{ display: 'inline-block', width: 14, height: 18, opacity: 0 }} />}
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 260 }}>
            {topLabel && (
              <div style={{ fontWeight: 700, color: '#C6A04F', fontSize: 18, marginBottom: 2, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 320 }}>{topLabel}</div>
            )}
            <div style={{ fontWeight: 700, color: '#fff', fontSize: 28, marginBottom: 2, textAlign: 'center' }}>
              {match.result && match.result !== 'No winner' ? 'Final' : match.result}
            </div>
            <div style={{ color: '#bbb', fontSize: 16, marginBottom: 2, textAlign: 'center' }}>{match.method}</div>
            <div style={{ color: '#bbb', fontSize: 16, textAlign: 'center' }}>{match.time}</div>
          </div>
          <div style={{ width: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 260 }}>
            {isCompleted && winnerIndex === 1 ? triangleLeft : <span style={{ display: 'inline-block', width: 14, height: 18, opacity: 0 }} />}
          </div>
        </div>
        {/* Right participant */}
        <div style={{ textAlign: 'center', position: 'relative', minWidth: 200, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 260 }}>
          <img src={wrestlers[1]?.image_url} alt={wrestlers[1]?.name} style={{ width: 110, height: 110, borderRadius: '50%', objectFit: 'cover', marginBottom: 8, border: winnerIndex === 1 ? '4px solid #C6A04F' : '2px solid #888' }} />
          <div style={{ fontWeight: 700, fontSize: 22, marginTop: 4 }}>{wrestlers[1]?.name || '—'}</div>
          {/* Belt and title outcome under winner, or placeholder for loser */}
          {isCompleted && winnerIndex === 1 && isTitleMatch ? (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: 48 }}>
              <BeltIcon size={36} />
              {match.titleOutcome && match.titleOutcome !== 'None' && (
                <div style={{ fontSize: 13, color: match.titleOutcome === 'New Champion' ? '#4CAF50' : '#FFC107', fontWeight: 600, marginTop: 2 }}>{match.titleOutcome}</div>
              )}
            </div>
          ) : (
            <div style={{ marginTop: 8, minHeight: 48 }}></div>
          )}
          {/* Wrestler Info Block under image/name */}
          <div style={{ marginTop: 16 }}>
            <WrestlerInfoBlock wrestler={wrestlers[1]} titleStatus={wrestlers[1]?.titleStatus} last5={wrestlers[1]?.last5Results} />
          </div>
        </div>
      </div>
      <div style={{ background: '#111', borderRadius: 8, padding: 16, marginBottom: 24 }}>
        <div style={{ color: '#C6A04F', fontWeight: 700, marginBottom: 8 }}>Match Details</div>
        <div><b>Participants:</b> {getParticipantsDisplay(match.participants, wrestlerMap)}</div>
        <div><b>Winner:</b> {getWinnerDisplay(match, wrestlerMap)}</div>
        <div><b>Method:</b> {match.method}</div>
        <div><b>Time:</b> {match.time}</div>
        <div><b>Stipulation:</b> {match.stipulation}</div>
        <div><b>Title:</b> {match.title}</div>
        <div><b>Title Outcome:</b> {match.titleOutcome}</div>
      </div>
      <div style={{ background: '#111', borderRadius: 8, padding: 16, marginBottom: 24 }}>
        <div style={{ color: '#C6A04F', fontWeight: 700, marginBottom: 8 }}>Match Commentary</div>
        {match.commentary && match.commentary.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {match.commentary.map((c, i) => (
              <li key={i} style={{ marginBottom: 4 }}>
                <span style={{ color: '#C6A04F', marginRight: 8 }}>{c.time}</span>
                {c.text}
              </li>
            ))}
          </ul>
        ) : <div style={{ color: '#bbb' }}>No commentary yet.</div>}
      </div>
      <div style={{ textAlign: 'center' }}>
        <button onClick={onEdit} style={{
          background: '#C6A04F', color: '#232323', border: 'none', borderRadius: 4,
          fontWeight: 700, fontSize: 16, padding: '10px 32px', cursor: 'pointer'
        }}>
          Edit Match
        </button>
      </div>
    </div>
  );
} 