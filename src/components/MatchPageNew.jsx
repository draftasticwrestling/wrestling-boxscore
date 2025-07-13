import React from 'react';
import { Link } from 'react-router-dom';
import BeltIcon from './BeltIcon';
import { Helmet } from 'react-helmet';
import { useUser } from '../hooks/useUser';

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
function getParticipantsDisplay(participants, wrestlerMap, stipulation) {
  if (Array.isArray(participants)) {
    // Battle Royal: flat array of slugs
    if (stipulation === 'Battle Royal' || participants.every(p => typeof p === 'string')) {
      return participants.map(slug => wrestlerMap?.[slug]?.name || slug).join(', ');
    }
    // Tag/singles: array of arrays
    return participants.map(team => (Array.isArray(team) ? team : []).map(slug => wrestlerMap?.[slug]?.name || slug).join(' & ')).join(' vs ');
  }
  if (typeof participants === 'string' && wrestlerMap) {
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

export default function MatchPageNew({ match, wrestlers = [], onEdit, wrestlerMap }) {
  const user = useUser();
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
  const isBattleRoyal = match.stipulation === 'Battle Royal';

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
        {isBattleRoyal ? (
          <div>
            {(() => {
              console.log('Battle Royal participants:', match.participants);
              console.log('wrestlerMap keys:', Object.keys(wrestlerMap || {}));
            })()}
            <div style={{ color: '#C6A04F', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Battle Royal Participants</div>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              justifyContent: 'center',
              marginBottom: 16,
              maxWidth: 600,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}>
              {(Array.isArray(match.participants) ? match.participants : []).map(slug => (
                <div key={slug} style={{display:'inline-block',textAlign:'center'}}>
                  <img
                    src={wrestlerMap[slug]?.image_url || '/images/placeholder.png'}
                    alt={wrestlerMap[slug]?.name || slug}
                    title={wrestlerMap[slug]?.name || slug}
                    style={{
                      width: match.winner === slug && isCompleted ? 100 : 44,
                      height: match.winner === slug && isCompleted ? 100 : 44,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: match.winner === slug && isCompleted ? '4px solid #C6A04F' : '2px solid #888',
                      boxShadow: match.winner === slug && isCompleted ? '0 0 16px #C6A04F88' : undefined,
                      background: '#222',
                      margin: 2,
                      transition: 'all 0.2s',
                    }}
                  />
                  {!wrestlerMap[slug] && <div style={{color:'red',fontSize:10}}>{slug}</div>}
                </div>
              ))}
            </div>
            {isCompleted && match.winner && (
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <div style={{ fontWeight: 800, fontSize: 22, color: '#C6A04F', marginBottom: 4 }}>{wrestlerMap[match.winner]?.name || match.winner}</div>
                <div style={{ color: '#fff', fontSize: 16 }}>Winner</div>
              </div>
            )}
          </div>
        ) : (
          // Match Card Layout
          <div style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'center', gap: 0, marginBottom: 24, minHeight: 340 }}>
            {/* Left participant */}
            <div style={{ textAlign: 'center', position: 'relative', minWidth: 120, flex: 0.7, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 340 }}>
              <img src={wrestlers[0]?.image_url} alt={wrestlers[0]?.name} style={{ width: 95, height: 95, borderRadius: '50%', objectFit: 'cover', marginBottom: 6, border: winnerIndex === 0 ? '4px solid #C6A04F' : '2px solid #888' }} />
              <div style={{ fontWeight: 700, fontSize: 20, marginTop: 2 }}>{wrestlers[0]?.name || '—'}</div>
              {/* Belt and title outcome under winner, or placeholder for loser */}
              {isCompleted && winnerIndex === 0 && isTitleMatch ? (
                <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: 40 }}>
                  <BeltIcon size={32} />
                  {match.titleOutcome && match.titleOutcome !== 'None' && (
                    <div style={{ fontSize: 12, color: match.titleOutcome === 'New Champion' ? '#4CAF50' : '#FFC107', fontWeight: 600, marginTop: 2 }}>{match.titleOutcome}</div>
                  )}
                </div>
              ) : (
                <div style={{ marginTop: 6, minHeight: 40 }}></div>
              )}
              {/* Wrestler Info Block under image/name */}
              <div style={{ marginTop: 10 }}>
                <WrestlerInfoBlock wrestler={wrestlers[0]} titleStatus={wrestlers[0]?.titleStatus} last5={wrestlers[0]?.last5Results} />
              </div>
            </div>
            {/* Left arrow (always reserve space) and center match info, vertically centered */}
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', minWidth: 140, justifyContent: 'center', height: 340 }}>
              <div style={{ width: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 340 }}>
                {isCompleted && winnerIndex === 0 ? triangleRight : <span style={{ display: 'inline-block', width: 14, height: 18, opacity: 0 }} />}
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 340 }}>
                {topLabel && (
                  <div style={{ fontWeight: 700, color: '#C6A04F', fontSize: 16, marginBottom: 2, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>{topLabel}</div>
                )}
                <div style={{ fontWeight: 700, color: '#fff', fontSize: 24, marginBottom: 2, textAlign: 'center' }}>
                  {match.result && match.result !== 'No winner' ? 'Final' : match.result}
                </div>
                <div style={{ color: '#bbb', fontSize: 14, marginBottom: 2, textAlign: 'center' }}>{match.method}</div>
                <div style={{ color: '#bbb', fontSize: 14, textAlign: 'center' }}>{match.time}</div>
              </div>
              <div style={{ width: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 340 }}>
                {isCompleted && winnerIndex === 1 ? triangleLeft : <span style={{ display: 'inline-block', width: 14, height: 18, opacity: 0 }} />}
              </div>
            </div>
            {/* Right participant */}
            <div style={{ textAlign: 'center', position: 'relative', minWidth: 120, flex: 0.7, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 340 }}>
              <img src={wrestlers[1]?.image_url} alt={wrestlers[1]?.name} style={{ width: 95, height: 95, borderRadius: '50%', objectFit: 'cover', marginBottom: 6, border: winnerIndex === 1 ? '4px solid #C6A04F' : '2px solid #888' }} />
              <div style={{ fontWeight: 700, fontSize: 20, marginTop: 2 }}>{wrestlers[1]?.name || '—'}</div>
              {/* Belt and title outcome under winner, or placeholder for loser */}
              {isCompleted && winnerIndex === 1 && isTitleMatch ? (
                <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: 40 }}>
                  <BeltIcon size={32} />
                  {match.titleOutcome && match.titleOutcome !== 'None' && (
                    <div style={{ fontSize: 12, color: match.titleOutcome === 'New Champion' ? '#4CAF50' : '#FFC107', fontWeight: 600, marginTop: 2 }}>{match.titleOutcome}</div>
                  )}
                </div>
              ) : (
                <div style={{ marginTop: 6, minHeight: 40 }}></div>
              )}
              {/* Wrestler Info Block under image/name */}
              <div style={{ marginTop: 10 }}>
                <WrestlerInfoBlock wrestler={wrestlers[1]} titleStatus={wrestlers[1]?.titleStatus} last5={wrestlers[1]?.last5Results} />
              </div>
            </div>
          </div>
        )}
        <div style={{ background: '#111', borderRadius: 8, padding: 16, marginBottom: 24 }}>
          <div style={{ color: '#C6A04F', fontWeight: 700, marginBottom: 8 }}>Match Details</div>
          <div><b>Participants:</b> {getParticipantsDisplay(match.participants, wrestlerMap, match.stipulation)}</div>
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