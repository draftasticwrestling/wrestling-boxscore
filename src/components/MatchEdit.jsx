import React, { useState, useEffect } from 'react';

// These should be imported or passed as props in a real app, but for now, define them here:
const METHOD_OPTIONS = [
  'Pinfall', 'Submission', 'KO', 'Countout', 'DQ', 'No Contest', 'Draw', 'Other', 'Forfeit', 'Referee Decision'
];
const STIPULATION_OPTIONS = [
  'None', 'Steel Cage', 'Ladder', 'Tables', 'TLC', 'No DQ', 'Falls Count Anywhere', 'Iron Man', 'Custom/Other'
];
const CUSTOM_STIPULATION_OPTIONS = [
  'Handicap', 'Gauntlet', 'Elimination', 'Custom/Other'
];
const SPECIAL_WINNER_OPTIONS = [
  'None', 'Money in the Bank', 'Royal Rumble', 'Elimination Chamber', 'Other'
];
const TITLE_OUTCOME_OPTIONS = [
  'None', 'Retained', 'New Champion', 'Vacant', 'Other'
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
    specialWinnerType: '',
    titleOutcome: '',
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
      ? (match.customStipulationType === 'Custom/Other' ? match.customStipulation : match.customStipulationType)
      : match.stipulation === 'None' ? '' : match.stipulation;
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
        <>
          <div>
            <label style={labelStyle}>Custom Stipulation Type:</label>
            <select
              style={inputStyle}
              value={match.customStipulationType || ''}
              onChange={e => setMatch({ ...match, customStipulationType: e.target.value, customStipulation: '' })}
            >
              <option value="">Select custom stipulation type...</option>
              {CUSTOM_STIPULATION_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          {match.customStipulationType === 'Custom/Other' && (
            <div>
              <label style={labelStyle}>Custom Stipulation:</label>
              <input
                style={inputStyle}
                value={match.customStipulation || ''}
                onChange={e => setMatch({ ...match, customStipulation: e.target.value })}
                required={(!match.specialWinnerType || match.specialWinnerType === 'None')}
              />
            </div>
          )}
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
        </>
      )}
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
      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <button type="button" onClick={onCancel} style={{ flex: 1, background: '#444', color: '#fff', border: 'none', borderRadius: 4, padding: 10 }}>Cancel</button>
        <button type="submit" style={{ flex: 1, background: '#e63946', color: '#fff', border: 'none', borderRadius: 4, padding: 10 }}>Save</button>
      </div>
    </form>
  );
} 