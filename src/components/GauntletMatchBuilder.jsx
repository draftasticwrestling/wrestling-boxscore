import React, { useState, useEffect } from 'react';
import WrestlerAutocomplete from './WrestlerAutocomplete';

const gold = '#C6A04F';
const inputStyle = {
  width: '100%',
  padding: '8px',
  borderRadius: '4px',
  border: '1px solid #444',
  background: '#222',
  color: '#fff',
  marginBottom: '12px',
};

const bracketStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  padding: '16px',
  background: '#1a1a1a',
  borderRadius: '8px',
  border: '1px solid #555',
};

const matchRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '12px',
  background: '#2a2a2a',
  borderRadius: '4px',
  border: '1px solid #444',
  flexWrap: 'wrap',
  minHeight: '60px',
};

const wrestlerCardStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '4px 8px',
  background: '#333',
  borderRadius: '4px',
  border: '1px solid #555',
  minWidth: '100px',
  flexShrink: 0,
};

const winnerStyle = {
  ...wrestlerCardStyle,
  border: `2px solid ${gold}`,
  background: '#3a3a3a',
};

const arrowStyle = {
  color: gold,
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 8px',
};

const resultStyle = {
  color: '#C6A04F',
  fontSize: '12px',
  fontWeight: 'bold',
  marginLeft: '8px',
};

export default function GauntletMatchBuilder({ 
  wrestlers = [], 
  value, 
  onChange, 
  onResultChange,
  /** When editing an existing gauntlet, pass stored progression so we don't overwrite with empty results */
  initialProgression = null
}) {
  // Ensure wrestlers is always an array
  const safeWrestlers = Array.isArray(wrestlers) ? wrestlers : [];
  const [participants, setParticipants] = useState([]);
  const [matchResults, setMatchResults] = useState([]);
  const [currentWinner, setCurrentWinner] = useState('');

  // Parse initial value and optionally hydrate from existing gauntletProgression
  useEffect(() => {
    if (value && typeof value === 'string') {
      const parts = value.split(' → ').map(p => p.trim()).filter(Boolean);
      setParticipants(parts);
      
      const expectedResultsLength = parts.length >= 2 ? parts.length - 1 : 0;
      const hasValidProgression = Array.isArray(initialProgression) && 
        initialProgression.length === expectedResultsLength &&
        initialProgression.every(p => p && (p.participant1 != null || p.participant2 != null));

      if (hasValidProgression) {
        const results = initialProgression.map((p, i) => ({
          match: (p.match ?? p.order ?? i + 1),
          participant1: p.participant1 ?? parts[i],
          participant2: p.participant2 ?? parts[i + 1],
          winner: p.winner ?? '',
          method: p.method ?? '',
          time: p.time ?? ''
        }));
        setMatchResults(results);
        const lastWinner = initialProgression[initialProgression.length - 1]?.winner;
        setCurrentWinner(lastWinner ?? parts[0]);
      } else {
        const results = [];
        let winner = parts[0];
        for (let i = 1; i < parts.length; i++) {
          results.push({
            match: i,
            participant1: winner,
            participant2: parts[i],
            winner: '',
            method: '',
            time: ''
          });
        }
        setMatchResults(results);
        setCurrentWinner(parts[0]);
      }
    }
  }, [value, initialProgression]);

  // Update parent when participants change
  useEffect(() => {
    if (participants.length > 0) {
      // Filter out empty participants and join with arrows
      const validParticipants = participants.filter(p => p.trim() !== '');
      const participantString = validParticipants.join(' → ');
      
      // Only call onChange if the value has actually changed and we have valid participants
      if (participantString !== value && participantString.trim() !== '') {
        onChange(participantString, 'Gauntlet Match');
      }
    }
  }, [participants, value]);

  // Update parent when results change
  useEffect(() => {
    if (matchResults.length > 0) {
      const finalWinner = matchResults[matchResults.length - 1]?.winner || currentWinner;
      if (finalWinner) {
        // Filter out empty participants for the result data
        const validParticipants = participants.filter(p => p.trim() !== '');
        const resultData = {
          participants: validParticipants.join(' → '),
          winner: finalWinner,
          progression: matchResults.map(result => ({
            match: result.match,
            participant1: result.participant1,
            participant2: result.participant2,
            winner: result.winner,
            method: result.method,
            time: result.time
          }))
        };
        // Call onResultChange whenever we have a winner, even if method isn't filled yet
        onResultChange(resultData);
      }
    }
  }, [matchResults, currentWinner, participants]);

  const updateParticipant = (index, newParticipant) => {
    const newParticipants = [...participants];
    newParticipants[index] = newParticipant;
    setParticipants(newParticipants);
    
    // Recalculate match results
    const results = [];
    let winner = newParticipants[0];
    for (let i = 1; i < newParticipants.length; i++) {
      results.push({
        match: i,
        participant1: winner,
        participant2: newParticipants[i],
        winner: '',
        method: '',
        time: ''
      });
    }
    setMatchResults(results);
    setCurrentWinner(newParticipants[0]);
  };

  const updateMatchResult = (matchIndex, field, value) => {
    const newResults = [...matchResults];
    newResults[matchIndex] = { ...newResults[matchIndex], [field]: value };
    
    // Update current winner for next match
    if (field === 'winner' && value) {
      setCurrentWinner(value);
      // Update subsequent matches
      for (let i = matchIndex + 1; i < newResults.length; i++) {
        newResults[i] = {
          ...newResults[i],
          participant1: value
        };
      }
    }
    
    setMatchResults(newResults);
  };

  const getWrestlerName = (slug) => {
    const wrestler = safeWrestlers.find(w => w.id === slug);
    return wrestler ? wrestler.name : slug;
  };

  const getWrestlerImage = (slug) => {
    const wrestler = safeWrestlers.find(w => w.id === slug);
    return wrestler ? wrestler.image_url : null;
  };

  const addParticipant = () => {
    setParticipants([...participants, '']);
  };

  const removeParticipant = (index) => {
    const newParticipants = participants.filter((_, i) => i !== index);
    setParticipants(newParticipants);
  };

  return (
    <div style={bracketStyle}>
      <div style={{ color: gold, fontWeight: 'bold', marginBottom: '12px' }}>
        Gauntlet Match Participants (in order of entry)
      </div>
      
      {/* Participant Selection */}
      <div style={{ marginBottom: '16px' }}>
        {participants.map((participant, index) => (
          <div key={index} style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#fff', minWidth: '60px' }}>#{index + 1}:</span>
            <WrestlerAutocomplete
              wrestlers={safeWrestlers}
              value={participant}
              onChange={(value) => updateParticipant(index, value)}
              placeholder={`Participant ${index + 1}`}
            />
            {participants.length > 2 && (
              <button
                type="button"
                onClick={() => removeParticipant(index)}
                style={{
                  background: '#d32f2f',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addParticipant}
          style={{
            background: gold,
            color: '#232323',
            border: 'none',
            borderRadius: '4px',
            padding: '8px 16px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          + Add Participant
        </button>
      </div>

      {/* Match Bracket */}
      {participants.length >= 2 && (
        <div>
          <div style={{ color: gold, fontWeight: 'bold', marginBottom: '12px' }}>
            Match Progression
          </div>
          
          {/* First participant (starts the gauntlet) */}
          <div style={matchRowStyle}>
            <div style={wrestlerCardStyle}>
              <img
                src={getWrestlerImage(participants[0]) || '/images/placeholder.png'}
                alt={getWrestlerName(participants[0])}
                style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <span>{getWrestlerName(participants[0])}</span>
            </div>
            <span style={arrowStyle}>→</span>
            <span style={{ color: '#888', fontSize: '12px' }}>Starts the gauntlet</span>
          </div>

          {/* Individual matches */}
          {matchResults.map((result, index) => (
            <div key={index} style={matchRowStyle}>
              <div style={result.winner === result.participant1 ? winnerStyle : wrestlerCardStyle}>
                <img
                  src={getWrestlerImage(result.participant1) || '/images/placeholder.png'}
                  alt={getWrestlerName(result.participant1)}
                  style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <span>{getWrestlerName(result.participant1)}</span>
              </div>
              
              <span style={{ color: '#fff', fontSize: '14px' }}>vs</span>
              
              <div style={result.winner === result.participant2 ? winnerStyle : wrestlerCardStyle}>
                <img
                  src={getWrestlerImage(result.participant2) || '/images/placeholder.png'}
                  alt={getWrestlerName(result.participant2)}
                  style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <span>{getWrestlerName(result.participant2)}</span>
              </div>

              <span style={arrowStyle}>→</span>

              {/* Match result controls */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                <select
                  value={result.winner}
                  onChange={(e) => updateMatchResult(index, 'winner', e.target.value)}
                  style={{ 
                    padding: '4px 6px', 
                    borderRadius: '3px', 
                    border: '1px solid #444', 
                    background: '#222', 
                    color: '#fff', 
                    fontSize: '12px',
                    width: '110px', 
                    marginBottom: '0' 
                  }}
                >
                  <option value="">Select winn</option>
                  <option value={result.participant1}>{getWrestlerName(result.participant1)}</option>
                  <option value={result.participant2}>{getWrestlerName(result.participant2)}</option>
                </select>
                
                <select
                  value={result.method}
                  onChange={(e) => updateMatchResult(index, 'method', e.target.value)}
                  style={{ 
                    padding: '4px 6px', 
                    borderRadius: '3px', 
                    border: '1px solid #444', 
                    background: '#222', 
                    color: '#fff', 
                    fontSize: '12px',
                    width: '90px', 
                    marginBottom: '0' 
                  }}
                >
                  <option value="">Method</option>
                  <option value="Pinfall">Pinfall</option>
                  <option value="Submission">Submission</option>
                  <option value="DQ">DQ</option>
                  <option value="Count out">Count out</option>
                </select>
                
                <input
                  type="text"
                  value={result.time}
                  onChange={(e) => updateMatchResult(index, 'time', e.target.value)}
                  placeholder="Time"
                  style={{ 
                    padding: '4px 6px', 
                    borderRadius: '3px', 
                    border: '1px solid #444', 
                    background: '#222', 
                    color: '#fff', 
                    fontSize: '12px',
                    width: '70px', 
                    marginBottom: '0' 
                  }}
                />
              </div>

              {result.winner && (
                <div style={resultStyle}>
                  {getWrestlerName(result.winner)} wins
                </div>
              )}
            </div>
          ))}

          {/* Final winner display */}
          {matchResults.length > 0 && matchResults[matchResults.length - 1]?.winner && (
            <div style={{ 
              marginTop: '16px', 
              padding: '12px', 
              background: '#3a3a3a', 
              borderRadius: '4px', 
              border: `2px solid ${gold}`,
              textAlign: 'center'
            }}>
              <div style={{ color: gold, fontWeight: 'bold', fontSize: '16px' }}>
                🏆 Final Winner: {getWrestlerName(matchResults[matchResults.length - 1].winner)} 🏆
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 