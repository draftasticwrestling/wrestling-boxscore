import React, { useState, useEffect } from 'react';
import {
  STIPULATION_OPTIONS,
  METHOD_OPTIONS,
  TITLE_OPTIONS,
  SPECIAL_WINNER_OPTIONS,
  TITLE_OUTCOME_OPTIONS
} from '../options';
import { supabase } from '../supabaseClient';

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

export default function MatchEdit({
  initialMatch = {},
  onSave,
  onCancel,
  eventStatus,
  eventDate,
  onRealTimeCommentaryUpdate,
  eventId,
  matchOrder,
}) {
  const [match, setMatch] = useState({
    participants: '',
    result: '',
    method: '',
    time: '',
    stipulation: '',
    customStipulationType: '',
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
  const [commentary, setCommentary] = useState(match.commentary || []);
  const [commentaryInput, setCommentaryInput] = useState("");
  const [liveMode, setLiveMode] = useState(isLive && (liveStart || !status || status === 'upcoming'));
  const [matchDetailsSaved, setMatchDetailsSaved] = useState(false);
  const [editingCommentIdx, setEditingCommentIdx] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState("");

  useEffect(() => {
    setMatch(m => ({ ...m, status }));
  }, [status]);

  useEffect(() => {
    if (match.participants.includes(' vs ')) {
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
      if (winnerOptions.length && initialMatch.result) {
        // Try to find the winner by matching against tag team names first, then individual names
        const { participants, tagTeams } = parseParticipantsWithTagTeams(match.participants);
        let found = null;
        
        // First try to match against tag team names
        for (let i = 0; i < participants.length; i++) {
          if (tagTeams[i] && initialMatch.result.startsWith(tagTeams[i])) {
            found = tagTeams[i];
            break;
          }
        }
        
        // If no tag team match, try individual names
        if (!found) {
          found = winnerOptions.find(w => initialMatch.result.startsWith(w));
        }
        
        if (found) setWinner(found);
      }
    }
  }, [initialMatch, winnerOptions, match.participants]);

  // Sync local match state with parent updates (especially commentary)
  useEffect(() => {
    setMatch(m => ({ ...m, ...initialMatch }));
    setCommentary(initialMatch.commentary || []);
  }, [initialMatch.commentary]);

  // Helper to check if method is required
  function isMethodRequired() {
    if (!eventDate) return true;
    const cutoff = new Date('2025-05-01');
    const d = new Date(eventDate);
    return d >= cutoff;
  }

  // Helper to get elapsed minutes
  function getElapsedMinutes(ts) {
    if (!liveStart) return 0;
    return Math.ceil((ts - liveStart) / 60000);
  }

  // Helper to format commentary time
  function formatCommentaryTime(ts, liveStart, commentary) {
    let start = liveStart;
    if (!start && commentary && commentary.length > 0) {
      // Use the last (oldest) commentary timestamp as start
      start = commentary[commentary.length - 1].timestamp;
    }
    const elapsed = Math.max(0, Math.ceil((ts - start) / 60000));
    return `${elapsed}'`;
  }

  // Save match details for live match (before commentary)
  const handleSaveMatchDetails = (e) => {
    e.preventDefault();
    setMatchDetailsSaved(true);
    if (!liveStart) {
      const now = Date.now();
      setLiveStart(now);
      const newCommentary = [{ timestamp: now, text: 'The match begins' }];
      setCommentary(newCommentary);
      
      // Update in real-time
      if (onRealTimeCommentaryUpdate && eventId && matchOrder) {
        const updatedMatch = {
          ...match,
          commentary: newCommentary,
          liveStart: now,
          isLive: true
        };
        onRealTimeCommentaryUpdate(eventId, matchOrder, updatedMatch);
      }
    }
    // Optionally, persist match details here if needed
  };

  // End match handler
  const handleEndMatch = () => {
    const confirmed = window.confirm('Are you sure you want to end match? This will close live commentary and cannot be undone.');
    if (!confirmed) return;
    const now = Date.now();
    setLiveEnd(now);
    setIsLive(false);
    setStatus('completed');
    const newCommentary = [{ timestamp: now, text: 'The match ends' }, ...commentary];
    setCommentary(newCommentary);
    
    // Update in real-time
    if (onRealTimeCommentaryUpdate && eventId && matchOrder) {
      const updatedMatch = {
        ...match,
        commentary: newCommentary,
        liveEnd: now,
        isLive: false,
        status: 'completed'
      };
      onRealTimeCommentaryUpdate(eventId, matchOrder, updatedMatch);
    }
    
    // Do NOT call onSave or exit edit mode here; let user fill in result fields and click Save
    setMatchDetailsSaved(false); // allow editing winner/method after ending
  };

  // Save handler for completed match
  const handleSave = (e) => {
    e.preventDefault();
    let finalStatus = status;
    let finalIsLive = isLive;
    // If match is not live and has a winner/result, always set status to 'completed'
    if (!isLive && (resultType === 'Winner' || resultType === 'No Winner')) {
      finalStatus = 'completed';
      finalIsLive = false;
    }
    let finalStipulation = match.stipulation === 'Custom/Other'
      ? match.customStipulation
      : match.stipulation === 'None' ? '' : match.stipulation;
    let result = '';
    if (finalStatus === 'completed' && resultType === 'Winner' && winner && winnerOptions.length >= 2) {
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
    } else if (finalStatus === 'completed' && resultType === 'No Winner') {
      result = 'No winner';
    }
    onSave({
      ...match,
      result,
      stipulation: finalStipulation,
      status: finalStatus,
      isLive: finalIsLive,
      liveStart,
      liveEnd,
      commentary,
    });
  };

  // Helper to update commentary in Supabase for a match
  async function updateMatchCommentaryInSupabase(eventId, matchOrder, newCommentary) {
    // Fetch the event
    const { data: events, error } = await supabase
      .from('events')
      .select('matches')
      .eq('id', eventId)
      .single();
    if (error) {
      console.error('Error fetching event for commentary update:', error);
      return;
    }
    if (!events || !events.matches) return;
    // Update the correct match's commentary
    const updatedMatches = events.matches.map(m =>
      String(m.order) === String(matchOrder)
        ? { ...m, commentary: newCommentary }
        : m
    );
    // Save back to Supabase
    const { error: updateError } = await supabase
      .from('events')
      .update({ matches: updatedMatches })
      .eq('id', eventId);
    if (updateError) {
      console.error('Error updating commentary in Supabase:', updateError);
    }
  }

  // Save commentary line immediately and update in real-time
  const handleAddCommentary = async (e) => {
    e.preventDefault();
    if (!commentaryInput.trim()) return;
    const now = Date.now();
    const newCommentary = [{ timestamp: now, text: commentaryInput.trim() }, ...commentary];
    setCommentary(newCommentary);
    setCommentaryInput("");
    // Update the match in real-time so commentary appears immediately on match cards and pages
    if (onRealTimeCommentaryUpdate && eventId && matchOrder) {
      const updatedMatch = {
        ...match,
        commentary: newCommentary,
        liveStart: liveStart || now
      };
      onRealTimeCommentaryUpdate(eventId, matchOrder, updatedMatch);
    }
    // Persist commentary to Supabase immediately
    if (eventId && matchOrder) {
      await updateMatchCommentaryInSupabase(eventId, matchOrder, newCommentary);
    }
  };

  function parseParticipants(input) {
    if (Array.isArray(input)) {
      // Already an array, assume it's correct
      return input;
    }
    if (typeof input === "string") {
      // Split by 'vs' for teams/sides, then by '&' for team members
      return input
        .split(/\s+vs\s+/i)
        .map(side =>
          side
            .split(/\s*&\s*/i)
            .map(slug => slug.trim())
            .filter(Boolean)
        );
    }
    return [];
  }

  function parseParticipantsWithTagTeams(input) {
    if (Array.isArray(input)) {
      // Already an array, assume it's correct
      return { participants: input, tagTeams: {} };
    }
    if (typeof input === "string") {
      const tagTeams = {};
      const participants = input
        .split(/\s+vs\s+/i)
        .map((side, sideIndex) => {
          // Check if this side has a tag team name in parentheses
          const tagTeamMatch = side.match(/^([^(]+)\s*\(([^)]+)\)$/);
          if (tagTeamMatch) {
            const tagTeamName = tagTeamMatch[1].trim();
            const wrestlers = tagTeamMatch[2].trim();
            tagTeams[sideIndex] = tagTeamName;
            
            // Split wrestlers by '&' and clean up
            return wrestlers
              .split(/\s*&\s*/i)
              .map(slug => slug.trim())
              .filter(Boolean);
          } else {
            // No tag team name, just split by '&'
            return side
              .split(/\s*&\s*/i)
              .map(slug => slug.trim())
              .filter(Boolean);
          }
        });
      
      return { participants, tagTeams };
    }
    return { participants: [], tagTeams: {} };
  }

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
      <h2 style={{ color: '#C6A04F', marginBottom: 12 }}>Edit Match</h2>
      <div>
        <label style={labelStyle}>Participants:</label>
        <input
          style={inputStyle}
          value={match.participants}
          onChange={e => setMatch({ ...match, participants: e.target.value })}
          placeholder="Wrestler 1 vs Wrestler 2 or Team Name (Wrestler 1 & Wrestler 2) vs Team Name (Wrestler 3 & Wrestler 4)"
          required={status === 'completed'}
        />
        <div style={{ fontSize: '12px', color: '#bbb', marginTop: '4px' }}>
          Examples: "brutus-creed vs montez-ford" or "American Made (brutus-creed & julius-creed) vs Street Profits (montez-ford & angelo-dawkins)"
        </div>
      </div>
      {/* Show result fields if status is completed OR (isLive and liveEnd) */}
      {(status === 'completed' || (isLive && liveEnd)) && (
        <>
          <div>
            <label style={labelStyle}>Result Type:</label>
            <select
              style={inputStyle}
              value={resultType}
              onChange={e => setResultType(e.target.value)}
              required
            >
              <option value="">Select result type</option>
              <option value="Winner">Winner</option>
              <option value="No Winner">No Winner</option>
            </select>
          </div>
          {resultType === 'Winner' && winnerOptions.length >= 2 && (
            <div>
              <label style={labelStyle}>Winner:</label>
              <select
                style={inputStyle}
                value={winner}
                onChange={e => setWinner(e.target.value)}
                required
              >
                <option value="">Select winner</option>
                {winnerOptions.map(side => (
                  <option key={side} value={side}>{side}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label style={labelStyle}>Method:</label>
            <select
              style={inputStyle}
              value={match.method}
              onChange={e => setMatch({ ...match, method: e.target.value })}
              required={isMethodRequired()}
            >
              <option value="">Select method</option>
              {METHOD_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Time:</label>
            <input
              style={inputStyle}
              value={match.time}
              onChange={e => setMatch({ ...match, time: e.target.value })}
              placeholder="Match time (e.g. 12:34)"
            />
          </div>
        </>
      )}
      <div>
        <label style={labelStyle}>Stipulation:</label>
        <select
          style={inputStyle}
          value={match.stipulation}
          onChange={e => setMatch({ ...match, stipulation: e.target.value, customStipulationType: '', customStipulation: '' })}
        >
          {STIPULATION_OPTIONS.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
      {match.stipulation === 'Custom/Other' && (
        <div>
          <label style={labelStyle}>Custom Stipulation:</label>
          <input
            style={inputStyle}
            value={match.customStipulation || ''}
            onChange={e => setMatch({ ...match, customStipulation: e.target.value })}
          />
        </div>
      )}
      <div>
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
      <div>
        <label style={labelStyle}>Special Match Winner:</label>
        <select
          style={inputStyle}
          value={match.specialWinnerType || 'None'}
          onChange={e => setMatch({ ...match, specialWinnerType: e.target.value })}
        >
          {SPECIAL_WINNER_OPTIONS.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
      <div>
        <label style={labelStyle}>Title Outcome:</label>
        <select
          style={inputStyle}
          value={match.titleOutcome || ''}
          onChange={e => setMatch({ ...match, titleOutcome: e.target.value })}
        >
          {TITLE_OUTCOME_OPTIONS.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
      <div>
        <label style={labelStyle}>Notes (optional):</label>
        <textarea
          style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
          value={match.notes || ''}
          onChange={e => setMatch({ ...match, notes: e.target.value })}
          placeholder="Enter any additional notes about the match..."
        />
      </div>
      {/* Commentary UI: always show if there is commentary or if live match is active */}
      {(isLive || commentary.length > 0) && (
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
            {commentary.length === 0 && <div style={{ color: '#bbb' }}>No commentary yet.</div>}
            {commentary.map((c, idx) => (
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