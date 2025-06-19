import React, { useState, useEffect } from 'react';

// These should be imported or passed as props in a real app, but for now, define them here:
const METHOD_OPTIONS = [
  "Pinfall",
  "Submission",
  "DQ",
  "Count out",
  "No Contest",
  "Draw",
  "Unhook the prize",
  "Escape",
  "Elimination",
  "KO / Last Man Standing",
  "Enclosure win",
  "Points / Decision",
  "Forfeit",
  "Referee Decision"
];
const STIPULATION_OPTIONS = [
  "None",
  "Cage Match",
  "Hell in a Cell",
  "Street Fight",
  "Bloodline Rules",
  "Bakersfield Brawl",
  "King of the Ring qualifier",
  "Queen of the Ring qualifier",
  "Men's Elimination Chamber qualifier",
  "Women's Elimination Chamber qualifier",
  "Men's Money in the Bank qualifier",
  "Women's Money in the Bank qualifier",
  "Men's Survivor Series Qualifier",
  "Women's Survivor Series qualifier",
  "King of the Ring finalist",
  "Queen of the Ring finalist",
  "Triple Threat match",
  "Fatal Four-way match",
  "Unsanctioned Match",
  "Custom/Other"
];
const TITLE_OPTIONS = [
  "None",
  "Undisputed WWE Championship",
  "World Heavyweight Championship",
  "Men's IC Championship",
  "Men's U.S. Championship",
  "Raw Tag Team Championship",
  "SmackDown Tag Team Championship",
  "Men's Speed Championship",
  "WWE Women's Championship",
  "Women's World Championship",
  "Women's IC Championship",
  "Women's U.S. Championship",
  "Women's Tag Team Championship",
  "Women's Speed Championship"
];
const SPECIAL_WINNER_OPTIONS = [
  "None",
  "Women's Money in the Bank winner",
  "Men's Money in the Bank winner",
  "Men's Royal Rumble winner",
  "Women's Royal Rumble winner",
  "Men's Elimination Chamber winner",
  "Women's Elimination Chamber winner",
  "King of the Ring winner",
  "Queen of the Ring winner",
  "Men's Ultimate Survivor",
  "Women's Ultimate Survivor",
  "Men's War Games winner",
  "Women's War Games winner"
];
const TITLE_OUTCOME_OPTIONS = [
  "None",
  "Successful Defense",
  "New Champion"
];

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

  useEffect(() => {
    setMatch(m => ({ ...m, status }));
  }, [status]);

  useEffect(() => {
    if (match.participants.includes(' vs ')) {
      setWinnerOptions(match.participants.split(' vs ').map(s => s.trim()).filter(Boolean));
    } else {
      setWinnerOptions([]);
    }
  }, [match.participants]);

  useEffect(() => {
    if (initialMatch && initialMatch.result) {
      setResultType(initialMatch.result.includes('def.') ? 'Winner' : 'No Winner');
      if (winnerOptions.length && initialMatch.result) {
        const found = winnerOptions.find(w => initialMatch.result.startsWith(w));
        if (found) setWinner(found);
      }
    }
  }, [initialMatch, winnerOptions]);

  // Helper to check if method is required
  function isMethodRequired() {
    if (!eventDate) return true;
    const cutoff = new Date('2025-05-01');
    const d = new Date(eventDate);
    return d >= cutoff;
  }

  const handleSave = (e) => {
    e.preventDefault();
    let finalStipulation = match.stipulation === 'Custom/Other'
      ? match.customStipulation
      : match.stipulation === 'None' ? '' : match.stipulation;
    
    // Add special winner to stipulation if selected
    if (match.specialWinnerType && match.specialWinnerType !== 'None') {
      finalStipulation = finalStipulation ? `${finalStipulation} - ${match.specialWinnerType}` : match.specialWinnerType;
    }
    
    let result = '';
    if (status === 'completed' && resultType === 'Winner' && winner && winnerOptions.length >= 2) {
      const others = winnerOptions.filter(name => name !== winner);
      result = `${winner} def. ${others.join(' & ')}`;
    } else if (status === 'completed' && resultType === 'No Winner') {
      result = 'No winner';
    }
    onSave({ ...match, result, stipulation: finalStipulation, status });
  };

  return (
    <form onSubmit={handleSave} style={{ background: '#181818', padding: 24, borderRadius: 8, maxWidth: 500 }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => setStatus('upcoming')}
          style={{
            padding: '8px 16px',
            background: status === 'upcoming' ? '#4a90e2' : '#232323',
            color: status === 'upcoming' ? 'white' : '#bbb',
            border: '1px solid #888',
            borderRadius: 4,
            cursor: 'pointer',
            fontWeight: status === 'upcoming' ? 'bold' : 'normal'
          }}
        >
          Upcoming
        </button>
        <button
          type="button"
          onClick={() => setStatus('completed')}
          style={{
            padding: '8px 16px',
            background: status === 'completed' ? '#4a90e2' : '#232323',
            color: status === 'completed' ? 'white' : '#bbb',
            border: '1px solid #888',
            borderRadius: 4,
            cursor: 'pointer',
            fontWeight: status === 'completed' ? 'bold' : 'normal'
          }}
        >
          Completed
        </button>
      </div>
      <div>
        <label style={labelStyle}>Participants:</label>
        <input
          style={inputStyle}
          value={match.participants}
          onChange={e => setMatch({ ...match, participants: e.target.value })}
          placeholder="Wrestler 1 vs Wrestler 2"
          required={status === 'completed'}
        />
      </div>
      {status === 'completed' && (
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
      {status === 'completed' && (
        <div>
          <label style={labelStyle}>Notes (optional):</label>
          <textarea
            style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
            value={match.notes || ''}
            onChange={e => setMatch({ ...match, notes: e.target.value })}
            placeholder="Enter any additional notes about the match..."
          />
        </div>
      )}
      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <button type="button" onClick={onCancel} style={{ flex: 1, background: '#444', color: '#fff', border: 'none', borderRadius: 4, padding: 10 }}>Cancel</button>
        <button type="submit" style={{ flex: 1, background: '#e63946', color: '#fff', border: 'none', borderRadius: 4, padding: 10 }}>Save</button>
      </div>
    </form>
  );
} 