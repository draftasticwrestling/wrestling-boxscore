import React, { useState, useEffect } from 'react';
import {
  MATCH_TYPE_OPTIONS,
  STIPULATION_OPTIONS,
  METHOD_OPTIONS,
  TITLE_OPTIONS,
  SPECIAL_WINNER_OPTIONS,
  TITLE_OUTCOME_OPTIONS
} from '../options';
import { supabase } from '../supabaseClient';

import WrestlerAutocomplete from './WrestlerAutocomplete';
import VisualMatchBuilder from './VisualMatchBuilder';
import GauntletMatchBuilder from './GauntletMatchBuilder';
import TwoOutOfThreeFallsBuilder from './TwoOutOfThreeFallsBuilder';

const labelStyle = { color: '#fff', fontWeight: 500, marginBottom: 4, display: 'block' };
const inputStyle = {
  width: '100%',
  padding: '8px',
  borderRadius: '4px',
  border: '1px solid #444',
  background: '#222',
  color: '#fff',
  marginBottom: '12px',
};

const gold = '#C6A04F';

export default function MatchEdit({
  initialMatch = {},
  onSave,
  onCancel,
  eventStatus,
  eventDate,
  onRealTimeCommentaryUpdate,
  eventId,
  matchOrder,
  wrestlers = [],
}) {
  // Ensure wrestlers is always an array
  const safeWrestlers = Array.isArray(wrestlers) ? wrestlers : [];
  const [match, setMatch] = useState({
    participants: '',
    result: '',
    method: '',
    time: '',
    matchType: 'Singles Match',
    stipulation: 'None',
    customStipulation: '',
    title: '',
    specialWinnerType: '',
    titleOutcome: '',
    notes: '',
    status: initialMatch.status || eventStatus || 'completed',
    ...initialMatch,
  });
  const [status, setStatus] = useState(initialMatch.status || eventStatus || 'completed');
  const [resultType, setResultType] = useState('');
  const [winner, setWinner] = useState('');
  const [winnerOptions, setWinnerOptions] = useState([]);
  const [isLive, setIsLive] = useState(match.isLive || false);
  const [liveStart, setLiveStart] = useState(match.liveStart || null);
  const [liveEnd, setLiveEnd] = useState(match.liveEnd || null);
  const [commentary, setCommentary] = useState(Array.isArray(match.commentary) ? match.commentary : []);
  const [commentaryInput, setCommentaryInput] = useState("");
  const [liveMode, setLiveMode] = useState(isLive && (liveStart || !status || status === 'upcoming'));
  const [matchDetailsSaved, setMatchDetailsSaved] = useState(false);
  const [editingCommentIdx, setEditingCommentIdx] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [useVisualBuilder, setUseVisualBuilder] = useState(true);

  // Battle Royal specific state
  const [numParticipants, setNumParticipants] = useState(Array.isArray(initialMatch.participants) ? initialMatch.participants.length : 10);
  const [brParticipants, setBrParticipants] = useState(() => {
    if (Array.isArray(initialMatch.participants)) {
      const arr = initialMatch.participants.slice(0, 10);
      while (arr.length < 10) arr.push('');
      return arr;
    }
    return Array(10).fill('');
  });
  const [brWinner, setBrWinner] = useState(initialMatch.winner || '');

  // Define isBattleRoyal early to avoid "Cannot access before initialization" error
  const isBattleRoyal = match.matchType === 'Battle Royal';

  useEffect(() => {
    setMatch(m => ({ ...m, status }));
  }, [status]);

  useEffect(() => {
    if (typeof match.participants === 'string' && match.participants.includes(' vs ')) {
      // Parse participants to get team names for winner selection
      const { participants, tagTeams } = parseParticipantsWithTagTeams(match.participants);
      const teamNames = participants.map((team, index) => {
        const tagTeamName = tagTeams[index];
        if (tagTeamName) {
          return tagTeamName; // Use tag team name for winner selection
        } else {
          // Fall back to individual names joined with '&'
          return team.join(' & ');
        }
      });
      setWinnerOptions(teamNames);
    } else {
      setWinnerOptions([]);
    }
  }, [match.participants]);

  useEffect(() => {
    if (initialMatch && initialMatch.result) {
      setResultType(initialMatch.result.includes('def.') ? 'Winner' : 'No Winner');
      if (winnerOptions.length && initialMatch.result && typeof match.participants === 'string') {
        // Try to find the winner by matching against tag team names first, then individual names
        const { participants, tagTeams } = parseParticipantsWithTagTeams(match.participants);
        let found = null;
        
        // First try to match against tag team names
        for (let i = 0; i < participants.length; i++) {
          const tagTeamName = tagTeams[i];
          if (tagTeamName && initialMatch.result.includes(tagTeamName)) {
            found = tagTeamName;
            break;
          }
        }
        
        // If no tag team match, try individual names
        if (!found) {
          for (let i = 0; i < participants.length; i++) {
            const team = participants[i];
            for (const participant of team) {
              if (initialMatch.result.includes(participant)) {
                found = team.join(' & ');
                break;
              }
            }
            if (found) break;
          }
        }
        
        if (found) {
          setWinner(found);
        }
      }
    }
  }, [initialMatch, winnerOptions, match.participants]);

  function isMethodRequired() {
    return status === 'completed' && resultType === 'Winner';
  }

  function getElapsedMinutes(ts) {
    if (!ts || !liveStart) return 0;
    return Math.floor((ts - liveStart) / 60000);
  }

  function formatCommentaryTime(ts, liveStart, commentary) {
    if (!ts || !liveStart) return '00:00';
    const elapsed = Math.floor((ts - liveStart) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  const handleSaveMatchDetails = (e) => {
    e.preventDefault();
    setMatchDetailsSaved(true);
  };

  const handleEndMatch = () => {
    const endTime = Date.now();
    setLiveEnd(endTime);
    setStatus('completed');
    setMatch(prev => ({ ...prev, liveEnd: endTime, status: 'completed' }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    
    let result = '';
    
    // --- Battle Royal branch ---
    if (isBattleRoyal) {
      if (status === 'completed' && brWinner) {
        const winnerName = safeWrestlers.find(w => w.id === brWinner)?.name || brWinner;
        const participants = Array.isArray(brParticipants) ? brParticipants.filter(Boolean).map(slug => 
          safeWrestlers.find(w => w.id === slug)?.name || slug
        ) : [];
        result = `${winnerName} won the Battle Royal (${participants.join(', ')})`;
      }
    } else {
      // --- Default (non-Battle Royal) branch ---
      if (status === 'completed' && resultType === 'Winner' && winner && winnerOptions.length >= 2) {
        const { participants, tagTeams } = parseParticipantsWithTagTeams(match.participants);
        const winnerIndex = winnerOptions.indexOf(winner);
        if (winnerIndex !== -1) {
          const winnerTeam = participants[winnerIndex];
          const loserTeams = participants.filter((_, index) => index !== winnerIndex);
          const winnerName = tagTeams[winnerIndex] || winnerTeam.join(' & ');
          const loserNames = loserTeams.map((team, index) => {
            const actualIndex = index >= winnerIndex ? index + 1 : index;
            return tagTeams[actualIndex] || team.join(' & ');
          });
          result = `${winnerName} def. ${loserNames.join(' & ')}`;
        }
      } else if (status === 'completed' && resultType === 'No Winner') {
        result = 'No winner';
      }
    }

    // For Gauntlet Match and 2 out of 3 Falls, preserve the existing result
    if (match.matchType === 'Gauntlet Match' || match.matchType === '2 out of 3 Falls') {
      result = match.result || result;
    }

    const updatedMatch = {
      ...match,
      result,
      status,
      isLive,
      liveStart,
      liveEnd,
      commentary,
    };

    onSave(updatedMatch);
  };

  async function updateMatchCommentaryInSupabase(eventId, matchOrder, newCommentary) {
    try {
      const { error } = await supabase
        .from('events')
        .update({ 
          matches: supabase.sql`array_replace(matches, ${matchOrder}, ${JSON.stringify({ ...match, commentary: newCommentary })})`
        })
        .eq('id', eventId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error updating commentary in Supabase:', error);
    }
  }

  const handleAddCommentary = async (e) => {
    e.preventDefault();
    if (!commentaryInput.trim()) return;

    const newComment = {
      text: commentaryInput,
      timestamp: Date.now()
    };

    const updatedCommentary = [...(Array.isArray(commentary) ? commentary : []), newComment];
    setCommentary(updatedCommentary);
    setCommentaryInput("");

    // Update in real-time
    if (onRealTimeCommentaryUpdate && eventId && matchOrder) {
      const updatedMatch = {
        ...match,
        commentary: updatedCommentary
      };
      onRealTimeCommentaryUpdate(eventId, matchOrder, updatedMatch);
    }

    // Update in Supabase
    await updateMatchCommentaryInSupabase(eventId, matchOrder, updatedCommentary);
  };

  function parseParticipants(input) {
    if (!input) return [];
    return input.split(' vs ').map(side => 
      side.split(' & ').map(name => name.trim())
    );
  }

  function parseParticipantsWithTagTeams(input) {
    if (!input) return { participants: [], tagTeams: {} };
    
    const sides = input.split(' vs ');
    const participants = [];
    const tagTeams = {};
    
    sides.forEach((side, sideIndex) => {
      const names = side.split(' & ').map(name => name.trim());
      participants.push(names);
      
      // If there are multiple names, treat as tag team
      if (names.length > 1) {
        tagTeams[sideIndex] = names.join(' & ');
      }
    });
    
    return { participants, tagTeams };
  }

  // Function to get match structure from match type (copied from App.jsx)
  const getMatchStructureFromMatchType = (matchType) => {
    switch (matchType) {
      case 'Singles Match':
        return { type: 'singles', sides: 2 };
      case 'Tag Team Match':
        return { type: 'tag', sides: 2, participantsPerSide: 2 };
      case 'Triple Threat Match':
        return { type: 'singles', sides: 3 };
      case 'Fatal 4-Way Match':
        return { type: 'singles', sides: 4 };
      case '6-Man Tag Team Match':
        return { type: 'tag', sides: 2, participantsPerSide: 3 };
      case '8-Man Tag Team Match':
        return { type: 'tag', sides: 2, participantsPerSide: 4 };
      case '10-Man Tag Team Match':
        return { type: 'tag', sides: 2, participantsPerSide: 5 };
      case '12-Man Tag Team Match':
        return { type: 'tag', sides: 2, participantsPerSide: 6 };
      case 'Ladder Match':
        return { type: 'singles', sides: 2 };
      case 'Tables Match':
        return { type: 'singles', sides: 2 };
      case 'No Disqualification Match':
        return { type: 'singles', sides: 2 };
      case 'Extreme Rules Match':
        return { type: 'singles', sides: 2 };
      case 'Steel Cage Match':
        return { type: 'singles', sides: 2 };
      case 'Hell in a Cell Match':
        return { type: 'singles', sides: 2 };
      case 'TLC Match':
        return { type: 'singles', sides: 2 };
      case 'Elimination Chamber Match':
        return { type: 'singles', sides: 6 };
      case 'Money in the Bank Match':
        return { type: 'singles', sides: 6 };
      case 'Royal Rumble Match':
        return { type: 'singles', sides: 30 };
      case 'WarGames Match':
        return { type: 'tag', sides: 2, participantsPerSide: 4 };
      case 'Survivor Series Match':
        return { type: 'tag', sides: 2, participantsPerSide: 5 };
      case 'Gauntlet Match':
        return { type: 'gauntlet', sides: 4 };
      case '2 out of 3 Falls':
        return { type: 'singles', sides: 2 };
      default:
        return { type: 'singles', sides: 2 };
    }
  };

  // Parse existing match participants into VisualMatchBuilder structure
  const parseExistingMatchStructure = (match) => {
    console.log('parseExistingMatchStructure called with match:', match);
    if (!match.participants) {
      console.log('No participants found, returning null');
      return null;
    }

    // If participants is already an array (Battle Royal), return as is
    if (Array.isArray(match.participants)) {
      return [{ type: 'battle-royal', participants: match.participants }];
    }

    // If participants is a string, parse it
    if (typeof match.participants === 'string') {
      const participants = match.participants.trim();
      
      if (!participants) {
        return null;
      }

      // Check if it's a Gauntlet Match (contains arrows)
      if (participants.includes(' → ')) {
        const participantList = participants.split(' → ').filter(s => s.trim()).map(s => s.trim());
        return participantList.map(participant => ({
          type: 'individual',
          participants: [participant]
        }));
      }

      // Regular match format: side1 vs side2
      const sides = participants.split(' vs ').filter(s => s.trim());
      console.log('Split sides:', sides);
      
      const result = sides.map(side => {
        const teamMatch = side.match(/^([^(]+)\s*\(([^)]+)\)$/);
        if (teamMatch) {
          // Tag team with name
          const teamName = teamMatch[1].trim();
          const wrestlerSlugs = teamMatch[2].split('&').filter(s => s.trim()).map(s => s.trim());
          console.log('Found team with name:', teamName, 'wrestlers:', wrestlerSlugs);
          return { type: 'team', name: teamName, participants: wrestlerSlugs };
        } else {
          // Individual wrestlers - check if this should be a team based on match type
          const wrestlerSlugs = side.split('&').filter(s => s.trim()).map(s => s.trim());
          const isTagTeamMatch = match.matchType && (
            match.matchType.includes('Tag Team') || 
            match.matchType.includes('6-Man') || 
            match.matchType.includes('8-Man') || 
            match.matchType.includes('10-Man') || 
            match.matchType.includes('12-Man') ||
            match.matchType.includes('WarGames') ||
            match.matchType.includes('Survivor Series')
          );
          
          console.log('Side wrestlers:', wrestlerSlugs, 'isTagTeamMatch:', isTagTeamMatch);
          
          if (isTagTeamMatch && wrestlerSlugs.length > 1) {
            // Convert to team structure but without a name (user can add one)
            console.log('Converting to team structure without name');
            return { type: 'team', name: '', participants: wrestlerSlugs };
          } else {
            console.log('Keeping as individual structure');
            return { type: 'individual', participants: wrestlerSlugs };
          }
        }
      });
      
      console.log('Final parsed structure:', result);
      return result;
    }

    return null;
  };

  // UI rendering
  return (
    <form onSubmit={handleSave} style={{ background: '#181818', padding: 24, borderRadius: 8, maxWidth: 500 }}>
      {/* Live Match Checkbox always visible */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ color: '#C6A04F', fontWeight: 600 }}>
          <input
            type="checkbox"
            checked={isLive || false}
            onChange={e => setIsLive(e.target.checked)}
            style={{ marginRight: 8 }}
          />
          Live Match
        </label>
      </div>
      {/* Always show Match Status for all match types */}
      <div>
        <label style={labelStyle}>Match Status:</label>
        <select
          style={inputStyle}
          value={status}
          onChange={e => setStatus(e.target.value)}
        >
          <option value="upcoming">Upcoming</option>
          <option value="live">Live</option>
          <option value="completed">Completed</option>
        </select>
      </div>
      <h2 style={{ color: '#C6A04F', marginBottom: 12 }}>Edit Match</h2>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Match Type:</label>
        <select
          style={inputStyle}
          value={match.matchType}
          onChange={e => setMatch({ ...match, matchType: e.target.value })}
        >
          {MATCH_TYPE_OPTIONS.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Stipulation:</label>
        <select
          style={inputStyle}
          value={match.stipulation}
          onChange={e => setMatch({ ...match, stipulation: e.target.value, customStipulation: '' })}
        >
          {STIPULATION_OPTIONS.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
      {match.stipulation === 'Custom/Other' && (
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Custom Stipulation:</label>
          <input
            style={inputStyle}
            value={match.customStipulation || ''}
            onChange={e => setMatch({ ...match, customStipulation: e.target.value })}
          />
        </div>
      )}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Title:</label>
        <select
          style={inputStyle}
          value={match.title || ''}
          onChange={e => setMatch({ ...match, title: e.target.value })}
        >
          {TITLE_OPTIONS.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
      {isBattleRoyal ? (
        <>
          <div>
            <label style={{ color: gold, fontWeight: 600 }}>Number of Participants:</label>
            <select value={numParticipants} onChange={e => {
              const n = parseInt(e.target.value, 10);
              setNumParticipants(n);
              setBrParticipants(prev => {
                const arr = prev.slice(0, n);
                while (arr.length < n) arr.push('');
                return arr;
              });
            }} style={inputStyle}>
              {Array.from({length: 21}, (_, i) => i + 10).map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          {Array.isArray(brParticipants) && brParticipants.slice(0, numParticipants).map((slug, i) => (
            <WrestlerAutocomplete
              key={i}
              wrestlers={safeWrestlers}
              value={slug}
              onChange={val => setBrParticipants(prev => Array.isArray(prev) ? prev.map((s, idx) => idx === i ? val : s) : [])}
              placeholder={`Participant ${i+1}`}
            />
          ))}
          {status === 'completed' && brParticipants.filter(Boolean).length >= 2 && (
            <div>
              <label style={{ color: gold, fontWeight: 600 }}>Winner:</label>
              <select value={brWinner} onChange={e => setBrWinner(e.target.value)} style={inputStyle} 
                required={status === 'completed'}>
                <option value="">Select winner</option>
                {Array.isArray(brParticipants) && brParticipants.filter(Boolean).map((slug, i) => (
                  <option key={i} value={slug}>{safeWrestlers.find(w => w.id === slug)?.name || slug}</option>
                ))}
              </select>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Participant Input Toggle */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ color: gold, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={useVisualBuilder}
                onChange={e => setUseVisualBuilder(e.target.checked)}
                style={{ marginRight: 8 }}
              />
              Use Visual Match Builder
            </label>
          </div>

          {useVisualBuilder ? (
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: gold, fontWeight: 600, marginBottom: 8, display: 'block' }}>
                Participants (Visual Builder):
              </label>
              {match.matchType === 'Gauntlet Match' ? (
                <GauntletMatchBuilder
                  wrestlers={safeWrestlers}
                  value={match.participants}
                  onChange={value => {
                    console.log('GauntletMatchBuilder onChange called with value:', value);
                    const newMatch = { ...match, participants: value };
                    setMatch(newMatch);
                  }}
                  onResultChange={gauntletResult => {
                    console.log('Gauntlet result:', gauntletResult);
                    // Store the gauntlet progression data
                    const winnerName = safeWrestlers.find(w => w.id === gauntletResult.winner)?.name || gauntletResult.winner;
                    setMatch(prev => ({
                      ...prev,
                      gauntletProgression: gauntletResult.progression,
                      winner: gauntletResult.winner,
                      result: `${winnerName}` // Just the winner name
                    }));
                  }}
                />
              ) : match.matchType === '2 out of 3 Falls' ? (
                <TwoOutOfThreeFallsBuilder
                  wrestlers={safeWrestlers}
                  value={match.participants}
                  onChange={value => {
                    console.log('TwoOutOfThreeFallsBuilder onChange called with value:', value);
                    const newMatch = { ...match, participants: value };
                    setMatch(newMatch);
                  }}
                  onResultChange={fallsResult => {
                    console.log('2 out of 3 Falls result:', fallsResult);
                    // Store the falls progression data
                    setMatch(prev => ({
                      ...prev,
                      gauntletProgression: fallsResult.gauntletProgression,
                      winner: fallsResult.winner,
                      method: fallsResult.method,
                      time: fallsResult.time
                    }));
                  }}
                />
              ) : (
                <VisualMatchBuilder
                  wrestlers={safeWrestlers}
                  value={match.participants}
                  onChange={value => {
                    console.log('VisualMatchBuilder onChange called with value:', value);
                    console.log('Current match state:', match);
                    const newMatch = { ...match, participants: value };
                    console.log('New match state will be:', newMatch);
                    setMatch(newMatch);
                  }}
                  maxParticipants={30}
                  initialStructure={parseExistingMatchStructure(match) || getMatchStructureFromMatchType(match.matchType)}
                />
              )}
            </div>
          ) : (
            <div>
              <label>
                Participants:<br />
                <input
                  value={match.participants}
                  onChange={e => setMatch({ ...match, participants: e.target.value })}
                  required
                  style={{ width: '100%' }}
                />
              </label>
            </div>
          )}
        </>
      )}
      {status === 'completed' && (
        <>
          <div>
            <label>
              Result Type:<br />
              <select value={resultType} onChange={e => {
                setResultType(e.target.value);
                setWinner('');
              }} style={{ width: '100%' }} required>
                <option value="">Select result type...</option>
                <option value="Winner">Winner</option>
                <option value="No Winner">No Winner</option>
              </select>
            </label>
          </div>
          {resultType === 'Winner' && winnerOptions.length >= 2 && match.matchType !== 'Gauntlet Match' && match.matchType !== '2 out of 3 Falls' && (
            <div>
              <label>
                Winner:<br />
                <select
                  value={winner}
                  onChange={e => setWinner(e.target.value)}
                  style={{ width: '100%' }}
                  required
                >
                  <option value="">Select winner</option>
                  {Array.isArray(winnerOptions) && winnerOptions.map(side => (
                    <option key={side} value={side}>{side}</option>
                  ))}
                </select>
              </label>
            </div>
          )}
          <div>
            <label>
              Method:<br />
              <select value={match.method} onChange={e => setMatch({ ...match, method: e.target.value })} required style={{ width: '100%' }}>
                <option value="">Select method</option>
                {METHOD_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </label>
          </div>
          <div>
            <label>
              Time:<br />
              <input value={match.time} onChange={e => setMatch({ ...match, time: e.target.value })} style={{ width: '100%' }} />
            </label>
          </div>
          <div>
            <label>
              Notes (optional):<br />
              <textarea 
                value={match.notes || ''} 
                onChange={e => setMatch({ ...match, notes: e.target.value })} 
                style={{ width: '100%', minHeight: '60px', padding: '8px', backgroundColor: '#232323', color: 'white', border: '1px solid #888' }}
                placeholder="Enter any additional notes about the match..."
              />
            </label>
          </div>
        </>
      )}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>
          Special Match Winner:
        </label>
        <select
          value={match.specialWinnerType || "None"}
          onChange={e => setMatch({ ...match, specialWinnerType: e.target.value })}
          style={inputStyle}
        >
          {SPECIAL_WINNER_OPTIONS.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>
          Title Outcome:
        </label>
        <select
          value={match.titleOutcome || ""}
          onChange={e => setMatch({ ...match, titleOutcome: e.target.value })}
          style={inputStyle}
        >
          {TITLE_OUTCOME_OPTIONS.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
      {/* Commentary UI: always show if there is commentary or if live match is active */}
      {(isLive || (Array.isArray(commentary) && commentary.length > 0)) && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ color: '#C6A04F', marginBottom: 12 }}>Live Commentary</h3>
          {isLive && !liveEnd && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                value={commentaryInput}
                onChange={e => setCommentaryInput(e.target.value)}
                placeholder="Enter live commentary..."
                style={{ flex: 1, ...inputStyle, marginBottom: 0 }}
                onKeyPress={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCommentary(e);
                  }
                }}
              />
              <button type="button" onClick={handleAddCommentary}>Submit</button>
            </div>
          )}
          <div style={{ maxHeight: 200, overflowY: 'auto', background: '#181818', borderRadius: 4, padding: 8 }}>
            {(!Array.isArray(commentary) || commentary.length === 0) && <div style={{ color: '#bbb' }}>No commentary yet.</div>}
            {Array.isArray(commentary) && commentary.map((c, idx) => (
              <div key={idx} style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#C6A04F', minWidth: 32 }}>{formatCommentaryTime(c.timestamp, liveStart, commentary)}</span>
                {editingCommentIdx === idx ? (
                  <>
                    <input
                      value={editingCommentText}
                      onChange={e => setEditingCommentText(e.target.value)}
                      style={{ flex: 1, ...inputStyle, marginBottom: 0 }}
                      autoFocus
                    />
                    <button type="button" onClick={() => {
                      // Save edit
                      const updated = commentary.map((item, i) => i === idx ? { ...item, text: editingCommentText } : item);
                      setCommentary(updated);
                      setEditingCommentIdx(null);
                      setEditingCommentText("");
                      
                      // Update in real-time
                      if (onRealTimeCommentaryUpdate && eventId && matchOrder) {
                        const updatedMatch = {
                          ...match,
                          commentary: updated
                        };
                        onRealTimeCommentaryUpdate(eventId, matchOrder, updatedMatch);
                      }
                    }}>Save</button>
                    <button type="button" onClick={() => {
                      setEditingCommentIdx(null);
                      setEditingCommentText("");
                    }}>Cancel</button>
                  </>
                ) : (
                  <>
                    <span style={{ color: '#fff', flex: 1 }}>{c.text}</span>
                    <button type="button" onClick={() => {
                      setEditingCommentIdx(idx);
                      setEditingCommentText(c.text);
                    }}>Edit</button>
                  </>
                )}
              </div>
            ))}
            {liveEnd && (
              <div style={{ color: '#bbb', marginTop: 8 }}>
                Match duration: {getElapsedMinutes(liveEnd)} minute{getElapsedMinutes(liveEnd) !== 1 ? 's' : ''}
              </div>
            )}
          </div>
          {isLive && !liveEnd && (
            <button type="button" onClick={handleEndMatch} style={{ marginTop: 16, background: '#e63946', color: 'white', padding: '10px 24px', border: 'none', borderRadius: 4, fontWeight: 700 }}>
              End Match
            </button>
          )}
        </div>
      )}
      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <button type="button" onClick={onCancel} style={{ flex: 1, background: '#444', color: '#fff', border: 'none', borderRadius: 4, padding: 10 }}>Cancel</button>
        <button type="submit" style={{ flex: 1, background: '#e63946', color: '#fff', border: 'none', borderRadius: 4, padding: 10 }}>Save</button>
      </div>
    </form>
  );
} 