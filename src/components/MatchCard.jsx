import React from 'react';
import { useNavigate } from 'react-router-dom';
import BeltIcon from './BeltIcon';
import BriefcaseIcon from './BriefcaseIcon';
import CrownIcon from './CrownIcon';
import TrophyIcon from './TrophyIcon';
import ChamberIcon from './ChamberIcon';
import WarGamesIcon from './WarGamesIcon';
import SurvivorIcon from './SurvivorIcon';

// Helper functions
function getSpecialWinnerIcon(specialWinnerType) {
  switch (specialWinnerType) {
    case "Women's Money in the Bank winner":
    case "Men's Money in the Bank winner":
      return <BriefcaseIcon size={32} />;
    case "King of the Ring winner":
    case "Queen of the Ring winner":
      return <CrownIcon size={32} />;
    case "Men's Royal Rumble winner":
    case "Women's Royal Rumble winner":
      return <TrophyIcon size={32} />;
    case "Men's Elimination Chamber winner":
    case "Women's Elimination Chamber winner":
      return <ChamberIcon size={32} />;
    case "Men's War Games winner":
    case "Women's War Games winner":
      return <WarGamesIcon size={32} />;
    case "Men's Ultimate Survivor":
    case "Women's Ultimate Survivor":
      return <SurvivorIcon size={32} />;
    default:
      return null;
  }
}

const getTeams = (participants) => {
  if (Array.isArray(participants)) {
    return participants;
  }
  if (typeof participants === 'string') {
    return participants.split(' vs ').map(s => s.trim());
  }
  return [];
};

const parseTeamString = (teamStr) => {
  // Handle team name with slugs in parentheses
  const teamMatch = teamStr.match(/^([^(]+)\s*\(([^)]+)\)$/);
  if (teamMatch) {
    const teamName = teamMatch[1].trim();
    const slugs = teamMatch[2].split('&').map(s => s.trim());
    return { teamName, slugs };
  }
  // Otherwise, just slugs
  const slugs = teamStr.split('&').map(s => s.trim());
  return { teamName: '', slugs };
};

export default function MatchCard({ match, event, wrestlerMap, isClickable = true }) {
  const navigate = useNavigate();

  // Parse participants into sides (split by 'vs')
  const teams = getTeams(match.participants);
  // For each side, split by '&' for tag teams
  const teamStrings = (typeof match.participants === 'string')
    ? match.participants.split(' vs ').map(s => s.trim())
    : [];
  
  // Winner logic
  const winner = match.result && match.result.includes(' def. ')
    ? match.result.split(' def. ')[0]
    : (match.result ? match.result : '');
  
  // Robust normalization function
  function normalize(str) {
    return (str || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
  }
  
  let winnerIndex = -1;
  teamStrings.forEach((teamStr, idx) => {
    const { teamName, slugs } = parseTeamString(teamStr);
    const individualNames = slugs.map(slug => wrestlerMap[slug]?.name || slug).join(' & ');
    if (
      (teamName && normalize(winner) === normalize(teamName)) ||
      normalize(winner) === normalize(individualNames)
    ) {
      winnerIndex = idx;
    }
  });
  
  const isTitleMatch = match.title && match.title !== 'None';
  
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
  const triangleDown = (
    <svg width="16" height="8" viewBox="0 0 16 8" style={{ display: 'block', margin: '0 auto 2px auto' }}>
      <polygon points="8,8 0,0 16,0" fill="#fff" />
    </svg>
  );
  
  // Top label: stipulation and/or title
  let topLabel = '';
  if (isTitleMatch && match.stipulation && match.stipulation !== 'None') {
    topLabel = `${match.stipulation} — ${match.title}`;
  } else if (isTitleMatch) {
    topLabel = match.title;
  } else if (match.stipulation && match.stipulation !== 'None') {
    topLabel = match.stipulation;
  }
  
  // Layout for 2+ sides
  const isMultiSide = teams.length > 2;
  const isTwoSide = teams.length === 2;
  
  const handleClick = () => {
    if (isClickable && event) {
      navigate(`/event/${event.id}/match/${match.order}`);
    }
  };

  return (
    <div
      onClick={handleClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: '#232323',
        borderRadius: 12,
        boxShadow: '0 0 12px #C6A04F22',
        padding: '18px 24px',
        cursor: isClickable ? 'pointer' : 'default',
        border: '1px solid #444',
        transition: 'background 0.2s',
        position: 'relative',
        minHeight: 120,
        marginBottom: 2,
      }}
    >
      {/* Top label: stipulation/title */}
      {topLabel && (
        <div style={{
          color: '#C6A04F',
          fontWeight: 700,
          fontSize: 15,
          marginBottom: 8,
          textAlign: 'center',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>{topLabel}</div>
      )}
      
      {/* Battle Royal participant image grid */}
      {match.stipulation === 'Battle Royal' && Array.isArray(match.participants) ? (
        match.winner ? (() => {
          // Split participants (excluding winner) into two balanced groups
          const others = match.participants.filter(slug => slug !== match.winner);
          const half = Math.ceil(others.length / 2);
          const left = others.slice(0, half);
          const right = others.slice(half);
          
          // Helper to render a grid column
          const renderGrid = (arr) => {
            // Auto-balance: 2 columns, N rows
            const numCols = 2;
            const numRows = Math.ceil(arr.length / numCols);
            let grid = [];
            for (let row = 0; row < numRows; row++) {
              let rowItems = [];
              for (let col = 0; col < numCols; col++) {
                const idx = row + col * numRows;
                if (arr[idx]) {
                  rowItems.push(
                    <img
                      key={arr[idx]}
                      src={wrestlerMap[arr[idx]]?.image_url || '/images/placeholder.png'}
                      alt={wrestlerMap[arr[idx]]?.name || arr[idx]}
                      title={wrestlerMap[arr[idx]]?.name || arr[idx]}
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2px solid #888',
                        background: '#222',
                        margin: 6,
                        boxShadow: '0 0 6px #0008',
                        transition: 'all 0.2s',
                        display: 'block',
                      }}
                    />
                  );
                } else {
                  rowItems.push(<div key={`empty-${col}-${row}`} style={{ width: 38, height: 38, margin: 6 }} />);
                }
              }
              grid.push(
                <div key={row} style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center' }}>{rowItems}</div>
              );
            }
            return grid;
          };
          
          return (
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              gap: 24,
              flexWrap: 'wrap',
            }}>
              {/* Left grid */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                {renderGrid(left)}
              </div>
              {/* Winner center */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: 120 }}>
                <img
                  src={wrestlerMap[match.winner]?.image_url || '/images/placeholder.png'}
                  alt={wrestlerMap[match.winner]?.name || match.winner}
                  title={wrestlerMap[match.winner]?.name || match.winner}
                  style={{
                    width: 90,
                    height: 90,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '5px solid #C6A04F',
                    boxShadow: '0 0 18px #C6A04F88',
                    background: '#222',
                    margin: 2,
                    transition: 'all 0.2s',
                  }}
                />
                <div style={{ fontWeight: 800, fontSize: 20, color: '#C6A04F', marginTop: 10, textAlign: 'center' }}>{wrestlerMap[match.winner]?.name || match.winner}</div>
                <div style={{ color: '#fff', fontSize: 15, textAlign: 'center' }}>Winner</div>
              </div>
              {/* Right grid */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                {renderGrid(right)}
              </div>
            </div>
          );
        })() : (
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
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid #888',
                    background: '#222',
                    margin: 2,
                    transition: 'all 0.2s',
                  }}
                />
                {!wrestlerMap[slug] && <div style={{color:'red',fontSize:10}}>{slug}</div>}
              </div>
            ))}
          </div>
        )
      ) : isMultiSide ? (
        <>
          {/* Match Info Block */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
            <div style={{ fontWeight: 700, color: '#C6A04F', fontSize: 15, marginBottom: 2, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 320 }}>{match.cardType}{isTitleMatch ? ' - Title Match' : ''}</div>
            <div style={{ fontWeight: 700, color: '#fff', fontSize: 20, marginBottom: 2, textAlign: 'center' }}>
              {match.isLive ? (
                <span style={{ color: '#27ae60' }}>LIVE</span>
              ) : (
                match.result && match.result !== 'No winner' ? 'Final' : match.result
              )}
            </div>
            <div style={{ color: '#bbb', fontSize: 15, marginBottom: 2, textAlign: 'center' }}>{match.method}</div>
            <div style={{ color: '#bbb', fontSize: 15, textAlign: 'center' }}>{match.time}</div>
          </div>
          {/* Participants Row */}
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: 32, width: '100%' }}>
            {teamStrings.map((teamStr, sideIdx) => {
              const { teamName, slugs } = parseTeamString(teamStr);
              const individualNames = slugs.map(slug => wrestlerMap[slug]?.name || slug).join(' & ');
              return (
                <div key={sideIdx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 120 }}>
                  {/* Arrow above winner */}
                  <div style={{ height: 22, marginBottom: 2, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                    {winnerIndex === sideIdx ? triangleDown : <span style={{ display: 'inline-block', width: 16, height: 8 }} />}
                  </div>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 8 }}>
                    {slugs.map((slug, i) => (
                      <div key={i} style={{ width: 64, height: 64, borderRadius: '50%', background: '#444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64 * 0.6, color: '#7da2c1' }}>
                        {wrestlerMap[slug]?.image_url
                          ? <img src={wrestlerMap[slug].image_url} alt={wrestlerMap[slug].name} style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} />
                          : <span role="img" aria-label="wrestler">&#128100;</span>
                        }
                      </div>
                    ))}
                  </div>
                  <span style={{ fontWeight: 700, color: winnerIndex === sideIdx ? '#C6A04F' : '#fff', fontSize: 18, textAlign: 'center', marginBottom: 2 }}>
                    {teamName ? (
                      <>
                        <div style={{ fontSize: 20, fontWeight: 800, color: winnerIndex === sideIdx ? '#C6A04F' : '#fff' }}>{teamName}</div>
                        <div style={{ fontSize: 15, color: '#bbb', fontStyle: 'italic' }}>{individualNames}</div>
                      </>
                    ) : individualNames}
                  </span>
                  {/* Belt icon under winner if title match */}
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: 24, marginTop: 2 }}>
                    {isTitleMatch && winnerIndex === sideIdx ? (
                      <>
                        <BeltIcon />
                        {match.titleOutcome && match.titleOutcome !== 'None' && (
                          <div style={{ fontSize: 10, color: match.titleOutcome === 'New Champion' ? '#4CAF50' : '#FFC107', fontWeight: 600, marginTop: 2, textAlign: 'center' }}>{match.titleOutcome}</div>
                        )}
                      </>
                    ) : 
                     match.specialWinnerType && match.specialWinnerType !== 'None' && winnerIndex === sideIdx ? 
                     getSpecialWinnerIcon(match.specialWinnerType) : 
                     <span style={{ display: 'inline-block', width: 32, height: 16 }} />}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : !isMultiSide ? (
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', width: '100%' }}>
          {/* Left participant */}
          {(() => {
            const { teamName, slugs } = parseTeamString(teamStrings[0]);
            const individualNames = slugs.map(slug => wrestlerMap[slug]?.name || slug).join(' & ');
            return (
              <div style={{ flex: 0.7, display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 90 }}>
                <div style={{ display: 'flex', gap: 2, justifyContent: 'center', marginBottom: 6 }}>
                  {slugs.map((slug, i) => (
                    <div key={i} style={{ width: 54, height: 54, borderRadius: '50%', background: '#444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 54 * 0.6, color: '#7da2c1' }}>
                      {wrestlerMap[slug]?.image_url
                        ? <img src={wrestlerMap[slug].image_url} alt={wrestlerMap[slug].name} style={{ width: 54, height: 54, borderRadius: '50%', objectFit: 'cover' }} />
                        : <span role="img" aria-label="wrestler">&#128100;</span>
                      }
                    </div>
                  ))}
                </div>
                <span style={{ fontWeight: 700, color: winnerIndex === 0 ? '#C6A04F' : '#fff', fontSize: 16, textAlign: 'center', marginBottom: 2 }}>
                  {teamName ? (
                    <>
                      <div style={{ fontSize: 18, fontWeight: 800, color: winnerIndex === 0 ? '#C6A04F' : '#fff' }}>{teamName}</div>
                      <div style={{ fontSize: 13, color: '#bbb', fontStyle: 'italic' }}>{individualNames}</div>
                    </>
                  ) : individualNames}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: 18, marginTop: 2 }}>
                  {isTitleMatch && winnerIndex === 0 ? (
                    <>
                      <BeltIcon />
                      {match.titleOutcome && match.titleOutcome !== 'None' && (
                        <div style={{ fontSize: 9, color: match.titleOutcome === 'New Champion' ? '#4CAF50' : '#FFC107', fontWeight: 600, marginTop: 2, textAlign: 'center' }}>{match.titleOutcome}</div>
                      )}
                    </>
                  ) : 
                   match.specialWinnerType && match.specialWinnerType !== 'None' && winnerIndex === 0 ? 
                   getSpecialWinnerIcon(match.specialWinnerType) : 
                   <span style={{ display: 'inline-block', width: 24, height: 12 }} />}
                </div>
              </div>
            );
          })()}
          {/* Left arrow (always reserve space) */}
          <div style={{ width: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {winnerIndex === 0 ? triangleRight : <span style={{ display: 'inline-block', width: 14, height: 18, opacity: 0 }} />}
          </div>
          {/* Center match details */}
          <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: 120, margin: 0, padding: 0 }}>
            <div style={{ fontWeight: 700, color: '#C6A04F', fontSize: 13, marginBottom: 2, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>{match.cardType}{isTitleMatch ? ' - Title Match' : ''}</div>
            <div style={{ fontWeight: 700, color: '#fff', fontSize: 16, marginBottom: 2, textAlign: 'center' }}>
              {match.isLive ? (
                <span style={{ color: '#27ae60' }}>LIVE</span>
              ) : (
                match.result && match.result !== 'No winner' ? 'Final' : match.result
              )}
            </div>
            <div style={{ color: '#bbb', fontSize: 12, marginBottom: 2, textAlign: 'center' }}>{match.method}</div>
            <div style={{ color: '#bbb', fontSize: 12, textAlign: 'center' }}>{match.time}</div>
          </div>
          {/* Right arrow (always reserve space) */}
          <div style={{ width: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {winnerIndex === 1 ? triangleLeft : <span style={{ display: 'inline-block', width: 14, height: 18, opacity: 0 }} />}
          </div>
          {/* Right participant */}
          {(() => {
            const { teamName, slugs } = parseTeamString(teamStrings[1]);
            const individualNames = slugs.map(slug => wrestlerMap[slug]?.name || slug).join(' & ');
            return (
              <div style={{ flex: 0.7, display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 90 }}>
                <div style={{ display: 'flex', gap: 2, justifyContent: 'center', marginBottom: 6 }}>
                  {slugs.map((slug, i) => (
                    <div key={i} style={{ width: 54, height: 54, borderRadius: '50%', background: '#444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 54 * 0.6, color: '#7da2c1' }}>
                      {wrestlerMap[slug]?.image_url
                        ? <img src={wrestlerMap[slug].image_url} alt={wrestlerMap[slug].name} style={{ width: 54, height: 54, borderRadius: '50%', objectFit: 'cover' }} />
                        : <span role="img" aria-label="wrestler">&#128100;</span>
                      }
                    </div>
                  ))}
                </div>
                <span style={{ fontWeight: 700, color: winnerIndex === 1 ? '#C6A04F' : '#fff', fontSize: 16, textAlign: 'center', marginBottom: 2 }}>
                  {teamName ? (
                    <>
                      <div style={{ fontSize: 18, fontWeight: 800, color: winnerIndex === 1 ? '#C6A04F' : '#fff' }}>{teamName}</div>
                      <div style={{ fontSize: 13, color: '#bbb', fontStyle: 'italic' }}>{individualNames}</div>
                    </>
                  ) : individualNames}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: 18, marginTop: 2 }}>
                  {isTitleMatch && winnerIndex === 1 ? (
                    <>
                      <BeltIcon />
                      {match.titleOutcome && match.titleOutcome !== 'None' && (
                        <div style={{ fontSize: 9, color: match.titleOutcome === 'New Champion' ? '#4CAF50' : '#FFC107', fontWeight: 600, marginTop: 2, textAlign: 'center' }}>{match.titleOutcome}</div>
                      )}
                    </>
                  ) : 
                   match.specialWinnerType && match.specialWinnerType !== 'None' && winnerIndex === 1 ? 
                   getSpecialWinnerIcon(match.specialWinnerType) : 
                   <span style={{ display: 'inline-block', width: 24, height: 12 }} />}
                </div>
              </div>
            );
          })()}
        </div>
      ) : null}
    </div>
  );
} 