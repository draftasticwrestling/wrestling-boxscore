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
  if (!teamStr) {
    return { teamName: '', slugs: [] };
  }
  
  const teamMatch = teamStr.match(/^([^(]+)\s*\(([^)]+)\)$/);
  if (teamMatch) {
    const teamName = teamMatch[1].trim();
    const slugs = teamMatch[2].split('&').map(s => s.trim());
    return { teamName, slugs };
  }
  const slugs = teamStr.split('&').map(s => s.trim());
  return { teamName: '', slugs };
};

export default function MatchCard({ match, event, wrestlerMap, isClickable = true }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (isClickable && event) {
      navigate(`/event/${event.id}/match/${match.order}`);
    }
  };

  // Early return for 2 out of 3 Falls
  if (match.matchType === '2 out of 3 Falls' && typeof match.participants === 'string') {
    const participantStrings = match.participants.split(' vs ').map(s => s.trim());
    const participant1 = participantStrings[0];
    const participant2 = participantStrings[1];
    const falls = [];
    
    if (match.result) {
      let resultParts = match.result.split(' → ');
      if (resultParts.length === 1) {
        resultParts = match.result.split(' -> ');
      }
      falls.push(...resultParts);
    }
    
    if (falls.length === 1 && falls[0].includes(' def. ')) {
      const finalResult = falls[0];
      const winner = finalResult.split(' def. ')[0];
      const loser = finalResult.split(' def. ')[1];
      
      falls.length = 0;
      falls.push(`${loser} def. ${winner}`);
      falls.push(`${winner} def. ${loser}`);
      falls.push(finalResult);
    }
    
    let overallWinner = null;
    if (falls.length > 0) {
      const lastFall = falls[falls.length - 1];
      if (lastFall.includes(' def. ')) {
        overallWinner = lastFall.split(' def. ')[0];
      }
    }
    
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
          border: match.cardType === 'Main Event' ? '2px solid #C6A04F' : '1px solid #444',
          position: 'relative',
          minHeight: 120,
          marginBottom: 2,
          transition: 'background 0.2s',
        }}
      >
        {match.cardType === 'Main Event' && (
          <div style={{
            position: 'absolute',
            top: -10,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#C6A04F',
            color: '#000',
            padding: '4px 16px',
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            zIndex: 10,
          }}>
            Main Event
          </div>
        )}

        <div style={{
          color: '#C6A04F',
          fontWeight: 700,
          fontSize: 15,
          marginBottom: 8,
          textAlign: 'center',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {[match.matchType, match.stipulation !== 'None' ? match.stipulation : null, match.title && match.title !== 'None' ? match.title : null].filter(Boolean).join(' — ')}
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, color: '#C6A04F', fontSize: 15, marginBottom: 2, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 320 }}>
            {match.cardType}{match.title && match.title !== 'None' && match.stipulation !== 'No. 1 Contender Match' ? ' - Title Match' : ''}
          </div>
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
        
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
          marginBottom: 16,
          flexWrap: 'wrap',
        }}>
          {falls.map((fall, index) => {
            let fallWinner = null;
            if (fall.includes(' def. ')) {
              fallWinner = fall.split(' def. ')[0];
            }
            
            const participant1IsWinner = fallWinner === wrestlerMap[participant1]?.name || fallWinner === participant1;
            const participant2IsWinner = fallWinner === wrestlerMap[participant2]?.name || fallWinner === participant2;
            
            return (
              <div key={index} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
              }}>
                <div style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: 12,
                  background: '#2a2a2a',
                  borderRadius: 8,
                  border: '1px solid #444',
                  minWidth: 160,
                  minHeight: 80,
                }}>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                  }}>
                    <img
                      src={wrestlerMap[participant1]?.image_url || '/images/placeholder.png'}
                      alt={wrestlerMap[participant1]?.name || participant1}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: participant1IsWinner ? '2px solid #C6A04F' : '2px solid #666',
                      }}
                    />
                    <span style={{
                      fontSize: 11,
                      color: participant1IsWinner ? '#C6A04F' : '#fff',
                      fontWeight: participant1IsWinner ? 'bold' : 'normal',
                      textAlign: 'center',
                      maxWidth: 70,
                    }}>
                      {wrestlerMap[participant1]?.name || participant1}
                    </span>
                  </div>
                  
                  <div style={{ color: '#C6A04F', fontSize: 13, fontWeight: 'bold' }}>vs</div>
                  
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                  }}>
                    <img
                      src={wrestlerMap[participant2]?.image_url || '/images/placeholder.png'}
                      alt={wrestlerMap[participant2]?.name || participant2}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: participant2IsWinner ? '2px solid #C6A04F' : '2px solid #666',
                      }}
                    />
                    <span style={{
                      fontSize: 11,
                      color: participant2IsWinner ? '#C6A04F' : '#fff',
                      fontWeight: participant2IsWinner ? 'bold' : 'normal',
                      textAlign: 'center',
                      maxWidth: 70,
                    }}>
                      {wrestlerMap[participant2]?.name || participant2}
                    </span>
                  </div>
                </div>
                
                <div style={{
                  color: '#C6A04F',
                  fontWeight: 700,
                  fontSize: 13,
                  textAlign: 'center',
                }}>
                  Fall {index + 1}
                </div>
              </div>
            );
          })}
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            color: '#C6A04F',
            fontSize: 20,
            fontWeight: 'bold',
          }}>
            →
          </div>
          
          {overallWinner && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: 16,
                background: '#2a2a2a',
                borderRadius: 8,
                border: '2px solid #C6A04F',
                minWidth: 160,
                minHeight: 120,
              }}>
                <div style={{
                  color: '#C6A04F',
                  fontWeight: 800,
                  fontSize: 16,
                  textAlign: 'center',
                  marginBottom: 8,
                }}>
                  WINNER
                </div>
                <img
                  src={wrestlerMap[overallWinner]?.image_url || '/images/placeholder.png'}
                  alt={overallWinner}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid #C6A04F',
                    marginBottom: 8,
                  }}
                />
                <span style={{
                  fontSize: 14,
                  color: '#C6A04F',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  maxWidth: 80,
                }}>
                  {wrestlerMap[overallWinner]?.name || overallWinner}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Parse participants
  const teams = getTeams(match.participants);
  const teamStrings = (typeof match.participants === 'string' && match.participants)
    ? ((match.matchType === 'Gauntlet Match' || match.matchType === '2 out of 3 Falls')
        ? match.participants.split(' → ').map(s => s.trim())
        : match.participants.split(' vs ').map(s => s.trim()))
    : [];
  
  const winner = match.result && match.result.includes(' def. ')
    ? match.result.split(' def. ')[0]
    : (match.result ? match.result : '');
  
  console.log('MatchCard winner detection:', {
    matchResult: match.result,
    winner: winner,
    teamStrings: teamStrings,
    participants: match.participants
  });
  
  function normalize(str) {
    return (str || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
  }
  
  let winnerIndex = -1;
  teamStrings.forEach((teamStr, idx) => {
    const { teamName, slugs } = parseTeamString(teamStr);
    const individualNames = slugs.map(slug => wrestlerMap[slug]?.name || slug).join(' & ');
    
    console.log('Checking team:', {
      teamStr,
      teamName,
      slugs,
      individualNames,
      winner,
      normalizedWinner: normalize(winner),
      normalizedTeamName: normalize(teamName),
      normalizedIndividualNames: normalize(individualNames)
    });
    
    // Check if winner matches team name
    if (teamName && normalize(winner) === normalize(teamName)) {
      winnerIndex = idx;
      console.log('Winner matched by team name');
    }
    // Check if winner matches individual names
    else if (normalize(winner) === normalize(individualNames)) {
      winnerIndex = idx;
      console.log('Winner matched by individual names');
    }
    // Check if winner matches the full team string (e.g., "TeamName (wrestler1 & wrestler2)")
    else if (normalize(winner) === normalize(teamStr)) {
      winnerIndex = idx;
      console.log('Winner matched by full team string');
    }
  });
  
  const isTitleMatch = match.title && match.title !== 'None' && match.stipulation !== 'No. 1 Contender Match';
  
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
  
  let topLabel = '';
  const labelParts = [];
  
  if (match.matchType && match.matchType !== 'Singles Match') {
    labelParts.push(match.matchType);
  }
  
  if (match.stipulation && match.stipulation !== 'None') {
    labelParts.push(match.stipulation);
  }
  
  if (match.title && match.title !== 'None') {
    labelParts.push(match.title);
  }
  
  if (labelParts.length > 0) {
    topLabel = labelParts.join(' — ');
  }
  
  const isMultiSide = teams.length > 2;
  const isTwoSide = teams.length === 2;

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
        border: match.cardType === 'Main Event' ? '2px solid #C6A04F' : '1px solid #444',
        transition: 'background 0.2s',
        position: 'relative',
        minHeight: 120,
        marginBottom: 2,
      }}
    >
      {match.cardType === 'Main Event' && (
        <div style={{
          position: 'absolute',
          top: -10,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#C6A04F',
          color: '#000',
          padding: '4px 16px',
          borderRadius: 12,
          fontSize: 12,
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          zIndex: 10,
        }}>
          Main Event
        </div>
      )}
      
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
        }}>
          {topLabel}
        </div>
      )}
      
      {match.matchType === 'Gauntlet Match' && typeof match.participants === 'string' ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, color: '#C6A04F', fontSize: 15, marginBottom: 2, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 320 }}>
              {match.cardType}{match.title && match.title !== 'None' && match.stipulation !== 'No. 1 Contender Match' ? ' - Title Match' : ''}
            </div>
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

          <div style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            marginBottom: 16,
            flexWrap: 'wrap',
            position: 'relative',
          }}>
            {(() => {
              const matches = [];
              let currentWinner = teamStrings[0];
              
              for (let i = 0; i < teamStrings.length - 1; i++) {
                const participant1 = currentWinner;
                const participant2 = teamStrings[i + 1];
                const isLastMatch = i === teamStrings.length - 2;
                
                let winner = null;
                if (match.gauntletProgression && match.gauntletProgression[i]) {
                  const matchResult = match.gauntletProgression[i];
                  if (matchResult.winner) {
                    if (matchResult.winner === participant1) {
                      winner = wrestlerMap[participant1]?.name || participant1;
                      currentWinner = participant1;
                    } else if (matchResult.winner === participant2) {
                      winner = wrestlerMap[participant2]?.name || participant2;
                      currentWinner = participant2;
                    }
                  }
                }
               
                matches.push(
                  <div key={i} style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    position: 'relative',
                  }}>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      padding: 6,
                      background: '#2a2a2a',
                      borderRadius: 6,
                      border: '1px solid #444',
                      minWidth: 140,
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        color: winner === wrestlerMap[participant1]?.name ? '#C6A04F' : '#fff',
                        fontWeight: winner === wrestlerMap[participant1]?.name ? 'bold' : 'normal',
                      }}>
                        <img
                          src={wrestlerMap[participant1]?.image_url || '/images/placeholder.png'}
                          alt={wrestlerMap[participant1]?.name || participant1}
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: winner === wrestlerMap[participant1]?.name ? '2px solid #C6A04F' : '1px solid #666',
                          }}
                        />
                        <span style={{ fontSize: 10, maxWidth: 50, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {wrestlerMap[participant1]?.name || participant1}
                        </span>
                      </div>
                      
                      <div style={{ color: '#C6A04F', fontSize: 9, fontWeight: 'bold' }}>vs</div>
                      
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        color: winner === wrestlerMap[participant2]?.name ? '#C6A04F' : '#fff',
                        fontWeight: winner === wrestlerMap[participant2]?.name ? 'bold' : 'normal',
                      }}>
                        <img
                          src={wrestlerMap[participant2]?.image_url || '/images/placeholder.png'}
                          alt={wrestlerMap[participant2]?.name || participant2}
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: winner === wrestlerMap[participant2]?.name ? '2px solid #C6A04F' : '1px solid #666',
                          }}
                        />
                        <span style={{ fontSize: 10, maxWidth: 50, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {wrestlerMap[participant2]?.name || participant2}
                        </span>
                      </div>
                    </div>
                    
                    {!isLastMatch && (
                      <div style={{
                        color: '#C6A04F',
                        fontSize: 16,
                        fontWeight: 'bold',
                      }}>
                        →
                      </div>
                    )}
                  </div>
                );
              }
              return matches;
            })()}
          </div>
          
          {(() => {
            let finalWinner = null;
            let finalWinnerSlug = null;
            if (match.winner) {
              const winnerEntry = Object.entries(wrestlerMap).find(([slug, wrestler]) => 
                wrestler.name === match.winner || slug === match.winner
              );
              if (winnerEntry) {
                finalWinner = winnerEntry[1].name;
                finalWinnerSlug = winnerEntry[0];
              } else {
                finalWinner = match.winner;
                finalWinnerSlug = match.winner;
              }
            }
            
            return finalWinner ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                marginTop: 16,
              }}>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: 16,
                  background: '#2a2a2a',
                  borderRadius: 8,
                  border: '2px solid #C6A04F',
                  minWidth: 160,
                  minHeight: 120,
                }}>
                  <div style={{
                    color: '#C6A04F',
                    fontWeight: 800,
                    fontSize: 16,
                    textAlign: 'center',
                    marginBottom: 8,
                  }}>
                    WINNER
                  </div>
                  <img
                    src={wrestlerMap[finalWinnerSlug]?.image_url || '/images/placeholder.png'}
                    alt={finalWinner || 'Winner'}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid #C6A04F',
                      marginBottom: 8,
                    }}
                  />
                  <span style={{
                    fontSize: 14,
                    color: '#C6A04F',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    maxWidth: 80,
                  }}>
                    {finalWinner || 'Winner'}
                  </span>
                </div>
              </div>
            ) : null;
          })()}
        </div>
      ) : match.matchType === 'Battle Royal' && Array.isArray(match.participants) ? (
        match.winner ? (() => {
          const others = match.participants.filter(slug => slug !== match.winner);
          const half = Math.ceil(others.length / 2);
          const left = others.slice(0, half);
          const right = others.slice(half);
          
          const renderGrid = (arr) => {
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
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                {renderGrid(left)}
              </div>
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
                <div style={{ fontWeight: 800, fontSize: 20, color: '#C6A04F', marginTop: 10, textAlign: 'center' }}>
                  {wrestlerMap[match.winner]?.name || match.winner}
                </div>
                <div style={{ color: '#fff', fontSize: 15, textAlign: 'center' }}>Winner</div>
              </div>
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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
            <div style={{ fontWeight: 700, color: '#C6A04F', fontSize: 15, marginBottom: 2, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 320 }}>
              {match.cardType}{isTitleMatch ? ' - Title Match' : ''}
            </div>
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
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: 32, width: '100%' }}>
            {teamStrings.map((teamStr, sideIdx) => {
              const { teamName, slugs } = parseTeamString(teamStr);
              const individualNames = slugs.map(slug => wrestlerMap[slug]?.name || slug).join(' & ');
              return (
                <div key={sideIdx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 120 }}>
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
          {(() => {
            const { teamName, slugs } = parseTeamString(teamStrings[0] || '');
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
          <div style={{ width: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {winnerIndex === 0 ? triangleRight : <span style={{ display: 'inline-block', width: 14, height: 18, opacity: 0 }} />}
          </div>
          <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: 120, margin: 0, padding: 0 }}>
            <div style={{ fontWeight: 700, color: '#C6A04F', fontSize: 13, marginBottom: 2, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>
              {match.cardType}{isTitleMatch ? ' - Title Match' : ''}
            </div>
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
          <div style={{ width: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {winnerIndex === 1 ? triangleLeft : <span style={{ display: 'inline-block', width: 14, height: 18, opacity: 0 }} />}
          </div>
          {(() => {
            const { teamName, slugs } = parseTeamString(teamStrings[1] || '');
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
      
      {match.result && match.matchType === 'Battle Royal' && (
        <div style={{
          background: '#2a2a2a',
          borderRadius: 8,
          padding: 12,
          marginTop: 8,
          marginLeft: 'auto',
          marginRight: 'auto',
          border: '1px solid #444',
          maxWidth: 500,
          textAlign: 'center'
        }}>
          <div style={{ color: '#C6A04F', fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
            Battle Royal Result
          </div>
          <div style={{ color: '#fff', fontSize: 13, lineHeight: 1.4 }}>
            {match.result}
          </div>
        </div>
      )}
    </div>
  );
} 