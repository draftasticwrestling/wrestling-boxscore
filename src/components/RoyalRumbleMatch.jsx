import React, { useState, useEffect } from 'react';

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
const buttonStyle = {
  padding: '8px 16px',
  fontSize: '14px',
  backgroundColor: '#C6A04F',
  color: '#232323',
  border: 'none',
  borderRadius: '4px',
  fontWeight: 600,
  cursor: 'pointer',
  marginRight: '8px',
  marginBottom: '8px',
};
const sectionStyle = {
  background: 'rgba(34, 34, 34, 0.98)',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '16px',
  border: '1px solid #444',
};

export default function RoyalRumbleMatch({
  initialMatch = {},
  onSave,
  onCancel,
  eventStatus,
  eventDate,
}) {
  const [participants, setParticipants] = useState(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
  const [eliminations, setEliminations] = useState([]);
  const [currentElimination, setCurrentElimination] = useState({ eliminated: '', eliminatedBy: '' });
  const [winner, setWinner] = useState('');
  const [matchTime, setMatchTime] = useState('');
  const [isMen, setIsMen] = useState(true);

  // Auto-calculate stats
  const [ironMan, setIronMan] = useState('');
  const [mostEliminations, setMostEliminations] = useState('');

  // Generate entry times (every 60 seconds)
  const generateEntryTimes = () => {
    return participants.map((_, index) => {
      const minutes = Math.floor(index / 60);
      const seconds = index % 60;
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    });
  };

  // Calculate iron man (longest time in ring)
  const calculateIronMan = () => {
    if (!eliminations.length || !winner) return '';

    const entryTimes = generateEntryTimes();
    const participantStats = participants.map((name, index) => {
      if (!name) return { name: '', timeInRing: 0 };
      
      const entryTime = entryTimes[index];
      let eliminationTime = null;
      
      // Find when this person was eliminated
      const elimination = eliminations.find(e => e.eliminated === name);
      if (elimination) {
        const eliminationIndex = eliminations.indexOf(elimination);
        eliminationTime = `${Math.floor((eliminationIndex + 1) / 60)}:${((eliminationIndex + 1) % 60).toString().padStart(2, '0')}`;
      } else if (name === winner) {
        // Winner stays until the end
        eliminationTime = matchTime || '1:00:00';
      }

      if (!eliminationTime) return { name, timeInRing: 0 };

      // Calculate time in ring
      const entryMinutes = parseInt(entryTime.split(':')[0]);
      const entrySeconds = parseInt(entryTime.split(':')[1]);
      const elimMinutes = parseInt(eliminationTime.split(':')[0]);
      const elimSeconds = parseInt(eliminationTime.split(':')[1]);
      
      const timeInRing = (elimMinutes * 60 + elimSeconds) - (entryMinutes * 60 + entrySeconds);
      
      return { name, timeInRing };
    });

    const longestTime = Math.max(...participantStats.map(p => p.timeInRing));
    const ironMan = participantStats.find(p => p.timeInRing === longestTime);
    return ironMan ? ironMan.name : '';
  };

  // Calculate most eliminations
  const calculateMostEliminations = () => {
    if (!eliminations.length) return '';

    const eliminationCounts = {};
    eliminations.forEach(elim => {
      if (elim.eliminatedBy) {
        eliminationCounts[elim.eliminatedBy] = (eliminationCounts[elim.eliminatedBy] || 0) + 1;
      }
    });

    const maxEliminations = Math.max(...Object.values(eliminationCounts));
    const mostEliminations = Object.keys(eliminationCounts).find(name => 
      eliminationCounts[name] === maxEliminations
    );
    
    return mostEliminations || '';
  };

  // Update stats when eliminations or winner changes
  useEffect(() => {
    setIronMan(calculateIronMan());
    setMostEliminations(calculateMostEliminations());
  }, [eliminations, winner, matchTime]);

  // Add elimination
  const addElimination = () => {
    if (!currentElimination.eliminated || !currentElimination.eliminatedBy) {
      alert('Please enter both the eliminated wrestler and who eliminated them.');
      return;
    }
    
    if (!participants.includes(currentElimination.eliminated)) {
      alert('Eliminated wrestler must be one of the 30 participants.');
      return;
    }
    
    if (!participants.includes(currentElimination.eliminatedBy)) {
      alert('Eliminator must be one of the 30 participants.');
      return;
    }

    setEliminations([...eliminations, { ...currentElimination }]);
    setCurrentElimination({ eliminated: '', eliminatedBy: '' });
  };

  // Remove elimination
  const removeElimination = (index) => {
    setEliminations(eliminations.filter((_, i) => i !== index));
  };

  // Handle save
  const handleSave = () => {
    if (participants.filter(p => p.trim()).length !== 30) {
      alert('Please enter exactly 30 participants.');
      return;
    }

    if (eliminations.length !== 29) {
      alert('Please enter exactly 29 eliminations (30 participants - 1 winner).');
      return;
    }

    if (!winner) {
      alert('Please select the winner.');
      return;
    }

    if (!matchTime) {
      alert('Please enter the total match time.');
      return;
    }

    // Build the royal rumble data
    const entryTimes = generateEntryTimes();
    const royalRumbleData = {
      participants: participants.map((name, index) => {
        const elimination = eliminations.find(e => e.eliminated === name);
        const eliminationIndex = elimination ? eliminations.indexOf(elimination) : null;
        const eliminationTime = eliminationIndex !== null ? 
          `${Math.floor((eliminationIndex + 1) / 60)}:${((eliminationIndex + 1) % 60).toString().padStart(2, '0')}` : null;
        
        const eliminations = eliminations.filter(e => e.eliminatedBy === name).length;
        
        return {
          name,
          entryNumber: index + 1,
          entryTime: entryTimes[index],
          eliminationTime,
          eliminatedBy: elimination ? elimination.eliminatedBy : null,
          eliminations,
          timeInRing: eliminationTime ? 
            (parseInt(eliminationTime.split(':')[0]) * 60 + parseInt(eliminationTime.split(':')[1])) - 
            (parseInt(entryTimes[index].split(':')[0]) * 60 + parseInt(entryTimes[index].split(':')[1])) :
            (parseInt(matchTime.split(':')[0]) * 60 + parseInt(matchTime.split(':')[1])) - 
            (parseInt(entryTimes[index].split(':')[0]) * 60 + parseInt(entryTimes[index].split(':')[1]))
        };
      }),
      ironMan,
      mostEliminations,
      winner
    };

    const matchData = {
      participants: `${isMen ? "Men's" : "Women's"} Royal Rumble`,
      result: `${winner} wins the ${isMen ? "Men's" : "Women's"} Royal Rumble`,
      method: "Elimination",
      time: matchTime,
      stipulation: `${isMen ? "Men's" : "Women's"} Royal Rumble`,
      title: "None",
      titleOutcome: "",
      specialWinnerType: `${isMen ? "Men's" : "Women's"} Royal Rumble winner`,
      royalRumbleData
    };

    onSave(matchData);
  };

  return (
    <div style={{ color: '#fff' }}>
      <h3 style={{ color: '#C6A04F', marginBottom: '16px' }}>
        {isMen ? "Men's" : "Women's"} Royal Rumble Match
      </h3>

      {/* Gender Selection */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Royal Rumble Type:</label>
        <div style={{ display: 'flex', gap: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="radio"
              checked={isMen}
              onChange={() => setIsMen(true)}
              style={{ marginRight: '8px' }}
            />
            Men's Royal Rumble
          </label>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="radio"
              checked={!isMen}
              onChange={() => setIsMen(false)}
              style={{ marginRight: '8px' }}
            />
            Women's Royal Rumble
          </label>
        </div>
      </div>

      {/* Participants Entry */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Participants (in entry order):</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {participants.map((participant, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ color: '#C6A04F', fontWeight: 600, marginRight: '8px', minWidth: '20px' }}>
                {index + 1}.
              </span>
              <input
                style={{ ...inputStyle, marginBottom: '4px' }}
                value={participant}
                onChange={(e) => {
                  const newParticipants = [...participants];
                  newParticipants[index] = e.target.value;
                  setParticipants(newParticipants);
                }}
                placeholder={`Participant ${index + 1}`}
              />
            </div>
          ))}
        </div>
        <div style={{ marginTop: '8px', color: '#bbb', fontSize: '14px' }}>
          Entry times will be auto-generated: #1 at 00:00, #2 at 00:01, #3 at 00:02, etc.
        </div>
      </div>

      {/* Eliminations Entry */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Eliminations (in order):</label>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input
            style={{ ...inputStyle, flex: 1 }}
            value={currentElimination.eliminated}
            onChange={(e) => setCurrentElimination({ ...currentElimination, eliminated: e.target.value })}
            placeholder="Eliminated wrestler"
          />
          <span style={{ color: '#C6A04F', alignSelf: 'center' }}>eliminated by</span>
          <input
            style={{ ...inputStyle, flex: 1 }}
            value={currentElimination.eliminatedBy}
            onChange={(e) => setCurrentElimination({ ...currentElimination, eliminatedBy: e.target.value })}
            placeholder="Eliminator"
          />
          <button type="button" style={buttonStyle} onClick={addElimination}>
            Add
          </button>
        </div>

        {/* Eliminations List */}
        <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #444', borderRadius: '4px', padding: '8px' }}>
          {eliminations.map((elim, index) => (
            <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid #333' }}>
              <span>
                {index + 1}. <strong>{elim.eliminatedBy}</strong> eliminates <strong>{elim.eliminated}</strong>
              </span>
              <button
                style={{ ...buttonStyle, padding: '4px 8px', fontSize: '12px', backgroundColor: '#D32F2F' }}
                onClick={() => removeElimination(index)}
              >
                Remove
              </button>
            </div>
          ))}
          {eliminations.length === 0 && (
            <div style={{ color: '#666', fontStyle: 'italic' }}>No eliminations added yet</div>
          )}
        </div>
        <div style={{ marginTop: '8px', color: '#bbb', fontSize: '14px' }}>
          {eliminations.length}/29 eliminations entered
        </div>
      </div>

      {/* Winner Selection */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Winner:</label>
        <select
          style={inputStyle}
          value={winner}
          onChange={(e) => setWinner(e.target.value)}
        >
          <option value="">Select winner</option>
          {participants.filter(p => p.trim()).map(participant => (
            <option key={participant} value={participant}>{participant}</option>
          ))}
        </select>
      </div>

      {/* Match Time */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Total Match Time:</label>
        <input
          style={inputStyle}
          value={matchTime}
          onChange={(e) => setMatchTime(e.target.value)}
          placeholder="1:05:23"
        />
      </div>

      {/* Auto-calculated Stats */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Auto-calculated Stats:</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <strong style={{ color: '#C6A04F' }}>Iron Man:</strong> {ironMan || 'Calculating...'}
          </div>
          <div>
            <strong style={{ color: '#C6A04F' }}>Most Eliminations:</strong> {mostEliminations || 'Calculating...'}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
        <button style={buttonStyle} onClick={handleSave}>
          Save Royal Rumble Match
        </button>
        <button
          style={{ ...buttonStyle, backgroundColor: '#666' }}
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
} 