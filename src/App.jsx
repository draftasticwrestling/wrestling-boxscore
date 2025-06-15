import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';
import { events as initialEvents } from './events';
import { supabase } from './supabaseClient';

// Place these at the top level, after imports
const STIPULATION_OPTIONS = [
  "None",
  "Undisputed WWE Championship",
  "World Heavyweight Championship",
  "Men's IC Championship",
  "Men's U.S. Championship",
  "Raw Tag Team Championship",
  "SmackDown Tag Team Championship",
  "Men's Speed Championship",
  "WWE Women's Championship",
  "World Women's Championship",
  "Women's IC Championship",
  "Women's U.S. Championship",
  "Women's Tag Team Championship",
  "Women's Speed Championship",
  "Custom/Other"
];
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
  "Points / Decision"
];
const TITLE_OUTCOME_OPTIONS = [
  "None",
  "Successful Defense",
  "New Champion"
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
  "Women's Ultimate Survivor"
];
const CUSTOM_STIPULATION_OPTIONS = [
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
  "Custom/Other"
];

// Add a gold/black theme style at the top level
const appBackground = {
  minHeight: '100vh',
  background: 'radial-gradient(ellipse at center, #222 60%, #000 100%)',
  color: '#f5e7b4',
  fontFamily: 'Arial, sans-serif',
};
const gold = '#FFD700';
const goldTextShadow = '0 0 16px #FFD700, 0 0 32px #FFD70044';

// Add theme styles for reuse
const sectionStyle = {
  background: 'rgba(20, 20, 20, 0.98)',
  borderRadius: 12,
  boxShadow: '0 0 24px #FFD70022',
  padding: 24,
  margin: '24px auto',
  maxWidth: 900,
};
const tableStyle = {
  width: '100%',
  background: 'rgba(34, 34, 34, 0.98)',
  color: '#ffe082',
  borderCollapse: 'collapse',
  boxShadow: '0 0 12px #FFD70022',
};
const thStyle = {
  background: '#222',
  color: gold,
  fontWeight: 700,
  textShadow: goldTextShadow,
  borderBottom: '2px solid #FFD700',
  padding: 10,
};
const tdStyle = {
  background: 'rgba(34, 34, 34, 0.98)',
  color: '#f5e7b4',
  borderBottom: '1px solid #444',
  padding: 10,
};
const inputStyle = {
  width: '100%',
  padding: 10,
  fontSize: '15px',
  border: '1px solid #FFD700',
  borderRadius: 4,
  backgroundColor: '#232323',
  color: '#ffe082',
  marginBottom: 12,
};
const labelStyle = {
  color: gold,
  fontWeight: 600,
  marginBottom: 6,
  display: 'block',
};
const buttonStyle = {
  padding: '10px 24px',
  fontSize: '16px',
  backgroundColor: gold,
  color: '#232323',
  border: 'none',
  borderRadius: 4,
  fontWeight: 700,
  cursor: 'pointer',
  boxShadow: '0 0 8px #FFD70044',
  marginRight: 8,
  marginTop: 8,
  transition: 'background 0.2s, color 0.2s',
};

const participantsTdStyle = {
  ...tdStyle,
  minWidth: 220,
  maxWidth: 400,
  wordBreak: 'break-word',
  fontSize: '1.08em',
};

// Event List Component
function EventList({ events }) {
  return (
    <div style={appBackground}>
      <img src="/images/banner.png" alt="Wrestling Boxscore Banner" style={{
        display: 'block',
        margin: '0 auto 32px auto',
        maxWidth: 480,
        width: '100%',
        filter: 'drop-shadow(0 0 32px #FFD70088)',
      }} />
      <h1 style={{
        textAlign: 'center',
        color: gold,
        textShadow: goldTextShadow,
        fontSize: 40,
        marginBottom: 8,
        marginTop: 0
      }}>WWE Event Results</h1>
      <Link to="/add-event" style={{
        display: 'inline-block',
        marginBottom: 16,
        color: gold,
        border: `1px solid ${gold}`,
        borderRadius: 4,
        padding: '6px 18px',
        background: 'rgba(34,34,34,0.8)',
        textDecoration: 'none',
        fontWeight: 600,
        boxShadow: '0 0 8px #FFD70044',
        transition: 'background 0.2s, color 0.2s',
      }}>+ Add Event</Link>
      <ul style={{ marginTop: 24 }}>
        {events.map(event => (
          <li key={event.id} style={{ marginBottom: 16 }}>
            <Link to={`/event/${event.id}`} style={{ color: gold, textShadow: goldTextShadow }}>
              <strong>{event.name}{event.status === 'upcoming' ? ' (upcoming)' : ''}</strong>
            </Link>
            <br />
            <span style={{ color: '#ffe082' }}>{event.date}</span> — <span style={{ color: '#ffe082' }}>{event.location}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Event Box Score Component (with discreet Edit/Delete below the match card)
function EventBoxScore({ events, onDelete, onEditMatch }) {
  const { eventId } = useParams();
  const event = events.find(e => e.id === eventId);
  const navigate = useNavigate();
  const [isEditingMatch, setIsEditingMatch] = useState(false);
  const [editingMatchIndex, setEditingMatchIndex] = useState(null);
  const [editedMatch, setEditedMatch] = useState(null);
  const [resultType, setResultType] = useState('');
  const [winner, setWinner] = useState('');

  if (!event) {
    return <div style={{ padding: 24 }}>Event not found.</div>;
  }

  // Add winner options based on participants
  const winnerOptions = editedMatch?.participants?.includes(' vs ')
    ? editedMatch.participants.split(' vs ').map(side => side.trim())
    : [];

  const handleMoveMatch = (index, direction) => {
    const updatedMatches = [...event.matches];
    const newIndex = index + direction;
    
    if (newIndex >= 0 && newIndex < updatedMatches.length) {
      // Swap the matches
      [updatedMatches[index], updatedMatches[newIndex]] = 
      [updatedMatches[newIndex], updatedMatches[index]];
      
      // Update the order numbers
      updatedMatches.forEach((match, idx) => {
        match.order = idx + 1;
      });
      
      onEditMatch(event.id, updatedMatches);
    }
  };

  const handleEditMatch = (match, index) => {
    setEditingMatchIndex(index);
    // Parse the result to set initial resultType and winner
    let initialResultType = 'No Winner';
    let initialWinner = '';
    if (match.result && match.result.includes(' def. ')) {
      initialResultType = 'Winner';
      initialWinner = match.result.split(' def. ')[0];
    }
    setResultType(initialResultType);
    setWinner(initialWinner);
    
    // Parse the stipulation to set initial customStipulationType
    let initialCustomStipulationType = '';
    let initialCustomStipulation = '';
    if (match.stipulation && !STIPULATION_OPTIONS.includes(match.stipulation)) {
      if (CUSTOM_STIPULATION_OPTIONS.includes(match.stipulation)) {
        initialCustomStipulationType = match.stipulation;
      } else {
        initialCustomStipulationType = "Custom/Other";
        initialCustomStipulation = match.stipulation;
      }
    }
    
    setEditedMatch({
      ...match,
      customStipulationType: initialCustomStipulationType,
      customStipulation: initialCustomStipulation
    });
    setIsEditingMatch(true);
  };

  const handleSaveMatch = () => {
    let result = '';
    if (resultType === 'Winner' && winner && winnerOptions.length === 2) {
      const [sideA, sideB] = winnerOptions;
      const loser = winner === sideA ? sideB : sideA;
      result = `${winner} def. ${loser}`;
    }
    
    let finalStipulation = editedMatch.stipulation === "Custom/Other"
      ? (editedMatch.customStipulationType === "Custom/Other" ? editedMatch.customStipulation : editedMatch.customStipulationType)
      : editedMatch.stipulation === "None" ? "" : editedMatch.stipulation;
    
    const updatedMatch = {
      ...editedMatch,
      result,
      stipulation: finalStipulation
    };

    const updatedMatches = [...event.matches];
    updatedMatches[editingMatchIndex] = updatedMatch;
    onEditMatch(event.id, updatedMatches);
    setIsEditingMatch(false);
    setEditingMatchIndex(null);
    setEditedMatch(null);
    setResultType('');
    setWinner('');
  };

  const handleCancelEditMatch = () => {
    setIsEditingMatch(false);
    setEditingMatchIndex(null);
    setEditedMatch(null);
    setResultType('');
    setWinner('');
  };

  const matchesWithCardType = event.matches.map((match, idx, arr) => ({
    ...match,
    cardType: idx === arr.length - 1 ? "Main Event" : "Undercard"
  }));

  if (isEditingMatch) {
    return (
      <div style={appBackground}>
        <div style={sectionStyle}>
          <Link to="/" style={{ color: gold, textShadow: goldTextShadow }}>← Back to Events</Link>
          <h2 style={{ color: gold, textShadow: goldTextShadow, marginTop: 24 }}>Edit Match</h2>
          <form style={{ 
            marginTop: 16, 
            padding: 0, 
            border: '1px solid #888', 
            borderRadius: 4,
            backgroundColor: 'transparent',
            maxWidth: 400,
            margin: '0 auto'
          }}>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>
                Participants:
              </label>
              <input 
                value={editedMatch.participants} 
                onChange={e => {
                  const newParticipants = e.target.value;
                  const newOptions = newParticipants.includes(' vs ')
                    ? newParticipants.split(' vs ').map(side => side.trim())
                    : [];
                  if (!newOptions.includes(winner)) setWinner('');
                  setEditedMatch({...editedMatch, participants: newParticipants});
                }} 
                style={inputStyle}
              />
            </div>
            {event.status !== 'upcoming' && (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>
                    Result Type:
                  </label>
                  <select
                    value={resultType}
                    onChange={e => {
                      setResultType(e.target.value);
                      setWinner('');
                    }}
                    style={inputStyle}
                    required
                  >
                    <option value="">Select result type...</option>
                    <option value="Winner">Winner</option>
                    <option value="No Winner">No Winner</option>
                  </select>
                </div>
                {resultType === 'Winner' && winnerOptions.length === 2 && (
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>
                      Winner:
                    </label>
                    <select
                      value={winner}
                      onChange={e => setWinner(e.target.value)}
                      style={inputStyle}
                      required
                    >
                      <option value="">Select winner</option>
                      {winnerOptions.map(side => (
                        <option key={side} value={side}>{side}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>
                    Method:
                  </label>
                  <select
                    value={editedMatch.method}
                    onChange={e => setEditedMatch({ ...editedMatch, method: e.target.value })}
                    style={inputStyle}
                    required
                  >
                    <option value="">Select method</option>
                    {METHOD_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>
                    Time:
                  </label>
                  <input 
                    value={editedMatch.time} 
                    onChange={e => setEditedMatch({...editedMatch, time: e.target.value})} 
                    style={inputStyle}
                  />
                </div>
              </>
            )}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>
                Stipulation:
              </label>
              <select
                value={editedMatch.stipulation}
                onChange={e => setEditedMatch({ ...editedMatch, stipulation: e.target.value, customStipulationType: '', customStipulation: '' })}
                style={inputStyle}
              >
                {STIPULATION_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            {editedMatch.stipulation === "Custom/Other" && (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>
                    Custom Stipulation Type:
                  </label>
                  <select
                    value={editedMatch.customStipulationType || ""}
                    onChange={e => setEditedMatch({ ...editedMatch, customStipulationType: e.target.value, customStipulation: '' })}
                    style={inputStyle}
                  >
                    <option value="">Select custom stipulation type...</option>
                    {CUSTOM_STIPULATION_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                {editedMatch.customStipulationType === "Custom/Other" && (
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>
                      Custom Stipulation:
                    </label>
                    <input
                      value={editedMatch.customStipulation || ''}
                      onChange={e => setEditedMatch({ ...editedMatch, customStipulation: e.target.value })}
                      required={(!editedMatch.specialWinnerType || editedMatch.specialWinnerType === "None")}
                      style={inputStyle}
                    />
                  </div>
                )}
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>
                    Special Match Winner:
                  </label>
                  <select
                    value={editedMatch.specialWinnerType || "None"}
                    onChange={e => setEditedMatch({ ...editedMatch, specialWinnerType: e.target.value })}
                    style={inputStyle}
                  >
                    {SPECIAL_WINNER_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>
                Title Outcome:
              </label>
              <select
                value={editedMatch.titleOutcome || ""}
                onChange={e => setEditedMatch({ ...editedMatch, titleOutcome: e.target.value })}
                style={inputStyle}
              >
                {TITLE_OUTCOME_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button 
                type="button"
                onClick={handleCancelEditMatch}
                style={{ ...buttonStyle, backgroundColor: '#232323', color: '#bbb' }}
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleSaveMatch} 
                style={{ ...buttonStyle, backgroundColor: '#2ecc40', color: 'white' }}
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={appBackground}>
      <div style={sectionStyle}>
        <Link to="/" style={{ color: gold, textShadow: goldTextShadow }}>← Back to Events</Link>
        <h2 style={{ color: gold, textShadow: goldTextShadow, marginTop: 24 }}>{event.name}</h2>
        <div style={{ color: '#ffe082', marginBottom: 8 }}>
          <strong>{event.date}</strong> — {event.location}
        </div>
        {event.specialWinner && (
          <div style={{ marginBottom: 16, padding: 8, backgroundColor: '#f0f0f0', borderRadius: 4 }}>
            <p style={{ margin: 0 }}>
              <strong>{event.specialWinner.type}:</strong> {event.specialWinner.name}
            </p>
          </div>
        )}
        <h3 style={{ marginTop: 24, color: gold, textShadow: goldTextShadow }}>Match Results</h3>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>#</th>
              <th style={thStyle}>Card</th>
              <th style={thStyle}>Match</th>
              <th style={thStyle}>Winner</th>
              <th style={thStyle}>Method</th>
              <th style={thStyle}>Time</th>
              <th style={thStyle}>Stipulation</th>
              <th style={thStyle}>Title Outcome</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {matchesWithCardType.map((match, index) => (
              <tr key={match.order}>
                <td style={tdStyle}>{match.order}</td>
                <td style={tdStyle}>{match.cardType}</td>
                <td style={participantsTdStyle}>{match.participants}</td>
                <td style={tdStyle}>{
                  match.result && match.result.includes(' def. ')
                    ? match.result.split(' def. ')[0]
                    : (match.result ? match.result : 'None')
                }</td>
                <td style={tdStyle}>{match.method}</td>
                <td style={tdStyle}>{match.time}</td>
                <td style={tdStyle}>{
                  match.stipulation === "Custom/Other" && match.customStipulation
                    ? match.customStipulation
                    : match.stipulation
                }</td>
                <td style={tdStyle}>{match.titleOutcome || ""}</td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button 
                      onClick={() => handleEditMatch(match, index)}
                      style={{ ...buttonStyle, backgroundColor: '#4a90e2', color: 'white', marginRight: 0 }}
                    >Edit</button>
                    <button 
                      onClick={() => handleMoveMatch(index, -1)}
                      style={{ ...buttonStyle, backgroundColor: gold, color: '#232323', marginRight: 0 }}
                      disabled={index === 0}
                    >↑</button>
                    <button 
                      onClick={() => handleMoveMatch(index, 1)}
                      style={{ ...buttonStyle, backgroundColor: gold, color: '#232323', marginRight: 0 }}
                      disabled={index === event.matches.length - 1}
                    >↓</button>
                    <button 
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this match?')) {
                          const updatedMatches = [...event.matches];
                          updatedMatches.splice(index, 1);
                          updatedMatches.forEach((match, idx) => {
                            match.order = idx + 1;
                          });
                          onEditMatch(event.id, updatedMatches);
                        }
                      }}
                      style={{ ...buttonStyle, backgroundColor: '#e24a4a', color: 'white', marginRight: 0 }}
                    >×</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{
          display: 'flex',
          gap: 12,
          marginTop: 24,
          justifyContent: 'flex-end'
        }}>
          <Link
            to={`/edit-event/${event.id}`}
            style={{
              fontSize: 14,
              padding: '4px 12px',
              border: '1px solid #bbb',
              borderRadius: 4,
              background: '#f8f8f8',
              color: '#333',
              textDecoration: 'none',
              transition: 'background 0.2s',
            }}
            onMouseOver={e => e.currentTarget.style.background = '#eee'}
            onMouseOut={e => e.currentTarget.style.background = '#f8f8f8'}
          >
            Edit
          </Link>
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to delete this event?')) {
                onDelete(event.id);
                navigate('/');
              }
            }}
            style={{
              fontSize: 14,
              padding: '4px 12px',
              border: '1px solid #f5c2c7',
              borderRadius: 4,
              background: '#fff',
              color: '#b02a37',
              cursor: 'pointer',
              transition: 'background 0.2s',
              opacity: 0.7
            }}
            onMouseOver={e => {
              e.currentTarget.style.background = '#f8d7da';
              e.currentTarget.style.opacity = '1';
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = '#fff';
              e.currentTarget.style.opacity = '0.7';
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// Add Event Form Component (separate forms for event and match)
function AddEvent({ addEvent }) {
  const EVENT_TYPES = [
    "RAW",
    "SmackDown",
    "Backlash",
    "Bad Blood",
    "Clash in Paris",
    "Crown Jewel",
    "Elimination Chamber",
    "Evolution",
    "Money in the Bank",
    "Night of Champions",
    "Royal Rumble",
    "Saturday Night's Main Event",
    "Summer Slam night 1",
    "Summer Slam night 2",
    "Survivor Series",
    "WrestleMania night 1",
    "WrestleMania night 2"
  ];

  const [name, setName] = useState('');
  const [eventType, setEventType] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [matches, setMatches] = useState([]);
  const [match, setMatch] = useState({
    participants: '',
    result: '',
    method: '',
    time: '',
    stipulation: '',
    customStipulation: '',
    titleOutcome: ''
  });
  const [specialWinnerType, setSpecialWinnerType] = useState("None");
  const [specialWinnerName, setSpecialWinnerName] = useState('');
  const navigate = useNavigate();
  const [resultType, setResultType] = useState('');
  const [winner, setWinner] = useState('');
  const [eventStatus, setEventStatus] = useState('completed'); // 'upcoming' or 'completed'

  // Add a derived value for winner options
  const winnerOptions = match.participants.includes(' vs ')
    ? match.participants.split(' vs ').map(side => side.trim())
    : [];

  // Add a match to the matches list
  const handleAddMatch = (e) => {
    e.preventDefault();
    if (eventStatus === 'upcoming') {
      if (!match.participants) {
        alert('Please enter participants.');
        return;
      }
    } else {
      if (!match.participants || !resultType || (resultType === 'Winner' && !winner) || !match.method) {
        alert('Please fill out all required match fields.');
        return;
      }
    }
    let finalStipulation = match.stipulation === "Custom/Other" 
      ? (match.customStipulationType === "Custom/Other" ? match.customStipulation : match.customStipulationType)
      : match.stipulation === "None" ? "" : match.stipulation;
    let result = '';
    if (eventStatus === 'completed' && resultType === 'Winner' && winner && winnerOptions.length === 2) {
      const [sideA, sideB] = winnerOptions;
      const loser = winner === sideA ? sideB : sideA;
      result = `${winner} def. ${loser}`;
    }
    setMatches([
      ...matches,
      { ...match, result, stipulation: finalStipulation, order: matches.length + 1 }
    ]);
    setMatch({
      participants: '',
      result: '',
      method: '',
      time: '',
      stipulation: '',
      customStipulation: '',
      titleOutcome: ''
    });
    setResultType('');
    setWinner('');
  };

  // Save the event
  const handleSaveEvent = (e) => {
    e.preventDefault();
    if (!eventType || !date || !location || matches.length === 0) {
      alert('Please fill out all event fields and add at least one match.');
      return;
    }
    // For completed events, require at least one match with all required fields
    if (eventStatus === 'completed') {
      const invalidMatch = matches.some(m => !m.participants || !m.method || !m.resultType || (m.resultType === 'Winner' && !m.winner));
      if (invalidMatch) {
        alert('Please fill out all required match fields for completed events.');
        return;
      }
    }
    const id = eventType.toLowerCase().replace(/\s+/g, '-') + '-' + date.replace(/[^0-9]/g, '');
    const eventData = {
      id,
      name: eventType,
      date,
      location,
      matches,
      status: eventStatus
    };
    if (specialWinnerType !== "None" && specialWinnerName.trim() !== "") {
      eventData.specialWinner = {
        type: specialWinnerType,
        name: specialWinnerName
      };
    }
    addEvent(eventData);
    navigate('/');
  };

  return (
    <div style={appBackground}>
      <div style={sectionStyle}>
        <Link to="/">← Back to Events</Link>
        <h2>Add New Event</h2>
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <button
            type="button"
            onClick={() => setEventStatus('upcoming')}
            style={{
              padding: '8px 16px',
              background: eventStatus === 'upcoming' ? '#4a90e2' : '#232323',
              color: eventStatus === 'upcoming' ? 'white' : '#bbb',
              border: '1px solid #888',
              borderRadius: 4,
              cursor: 'pointer',
              fontWeight: eventStatus === 'upcoming' ? 'bold' : 'normal'
            }}
          >
            Upcoming Event
          </button>
          <button
            type="button"
            onClick={() => setEventStatus('completed')}
            style={{
              padding: '8px 16px',
              background: eventStatus === 'completed' ? '#4a90e2' : '#232323',
              color: eventStatus === 'completed' ? 'white' : '#bbb',
              border: '1px solid #888',
              borderRadius: 4,
              cursor: 'pointer',
              fontWeight: eventStatus === 'completed' ? 'bold' : 'normal'
            }}
          >
            Completed Event
          </button>
        </div>
        <form>
          <div>
            <label>
              Event Type:<br />
              <select 
                value={eventType} 
                onChange={e => setEventType(e.target.value)} 
                required 
                style={{ width: '100%', marginBottom: 16 }}
              >
                <option value="">Select an event type</option>
                {EVENT_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>
          </div>
          <div>
            <label>
              Date:<br />
              <input value={date} onChange={e => setDate(e.target.value)} required placeholder="e.g. June 9, 2025" style={{ width: '100%' }} />
            </label>
          </div>
          <div>
            <label>
              Location:<br />
              <input value={location} onChange={e => setLocation(e.target.value)} required style={{ width: '100%' }} />
            </label>
          </div>
          <h3 style={{ marginTop: 24 }}>Add Matches</h3>
          {matches.length > 0 && (
            <ol>
              {matches.map((m, idx) => (
                <li key={idx}>
                  <strong>{m.participants}</strong> — {m.result} ({m.stipulation})
                </li>
              ))}
            </ol>
          )}
        </form>
        <form onSubmit={handleAddMatch} style={{ border: '1px solid #ccc', padding: 12, marginTop: 12 }}>
          <div>
            <label>
              Participants:<br />
              <input value={match.participants} onChange={e => {
                const newParticipants = e.target.value;
                const newOptions = newParticipants.includes(' vs ')
                  ? newParticipants.split(' vs ').map(side => side.trim())
                  : [];
                if (!newOptions.includes(winner)) setWinner('');
                setMatch({ ...match, participants: newParticipants });
              }} required style={{ width: '100%' }} />
            </label>
          </div>
          {eventStatus === 'completed' && (
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
              {resultType === 'Winner' && winnerOptions.length === 2 && (
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
                      {winnerOptions.map(side => (
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
            </>
          )}
          <div>
            <label>
              Stipulation:<br />
              <select
                value={match.stipulation}
                onChange={e => setMatch({ ...match, stipulation: e.target.value, customStipulationType: '', customStipulation: '' })}
                style={{ width: '100%' }}
              >
                {STIPULATION_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </label>
          </div>
          {match.stipulation === "Custom/Other" && (
            <>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, color: 'white' }}>
                  Custom Stipulation Type:
                </label>
                <select
                  value={match.customStipulationType || ""}
                  onChange={e => setMatch({ ...match, customStipulationType: e.target.value, customStipulation: '' })}
                  style={{
                    width: '100%',
                    padding: 8,
                    fontSize: '15px',
                    border: '1px solid #888',
                    borderRadius: 3,
                    backgroundColor: '#232323',
                    color: 'white',
                    marginBottom: 8
                  }}
                >
                  <option value="">Select custom stipulation type...</option>
                  {CUSTOM_STIPULATION_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              {match.customStipulationType === "Custom/Other" && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 6, color: 'white' }}>
                    Custom Stipulation:
                  </label>
                  <input
                    value={match.customStipulation || ''}
                    onChange={e => setMatch({ ...match, customStipulation: e.target.value })}
                    required={(!match.specialWinnerType || match.specialWinnerType === "None")}
                    style={{
                      width: '100%',
                      padding: 8,
                      fontSize: '15px',
                      border: '1px solid #888',
                      borderRadius: 3,
                      backgroundColor: '#232323',
                      color: 'white',
                      marginBottom: 8
                    }}
                  />
                </div>
              )}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, color: 'white' }}>
                  Special Match Winner:
                </label>
                <select
                  value={match.specialWinnerType || "None"}
                  onChange={e => setMatch({ ...match, specialWinnerType: e.target.value })}
                  style={{
                    width: '100%',
                    padding: 8,
                    fontSize: '15px',
                    border: '1px solid #888',
                    borderRadius: 3,
                    backgroundColor: '#232323',
                    color: 'white',
                    marginBottom: 8
                  }}
                >
                  {SPECIAL_WINNER_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </>
          )}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, color: 'white' }}>
              Title Outcome:
            </label>
            <select
              value={match.titleOutcome || ""}
              onChange={e => setMatch({ ...match, titleOutcome: e.target.value })}
              style={{
                width: '100%',
                padding: 8,
                fontSize: '15px',
                border: '1px solid #888',
                borderRadius: 3,
                backgroundColor: '#232323',
                color: 'white',
                marginBottom: 8
              }}
            >
              {TITLE_OUTCOME_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <button type="submit" style={{ marginTop: 8 }}>Add Match</button>
        </form>
        <button
          type="button"
          style={{ marginTop: 24 }}
          disabled={
            !eventType || !date || !location || matches.length === 0 ||
            (eventStatus === 'completed' && matches.some(m => !m.participants || !m.method || !m.resultType || (m.resultType === 'Winner' && !m.winner)))
          }
          onClick={handleSaveEvent}
        >
          Save Event
        </button>
      </div>
    </div>
  );
}

// Edit Event Form Component
function EditEvent({ events, updateEvent }) {
  const { eventId } = useParams();
  const event = events.find(e => e.id === eventId);
  const navigate = useNavigate();

  if (!event) {
    return <div style={{ padding: 24 }}>Event not found.</div>;
  }

  const [name, setName] = useState(event.name);
  const [date, setDate] = useState(event.date);
  const [location, setLocation] = useState(event.location);
  const [matches, setMatches] = useState(event.matches);
  const [match, setMatch] = useState({
    participants: '',
    result: '',
    method: '',
    time: '',
    stipulation: '',
    customStipulationType: '',
    customStipulation: '',
    titleOutcome: ''
  });
  const [resultType, setResultType] = useState('');
  const [winner, setWinner] = useState('');
  const eventStatus = event.status || 'completed';

  // Winner options based on participants
  const winnerOptions = match.participants.includes(' vs ')
    ? match.participants.split(' vs ').map(side => side.trim())
    : [];

  // Add a match to the matches list
  const handleAddMatch = (e) => {
    e.preventDefault();
    let finalStipulation = match.stipulation === "Custom/Other"
      ? (match.customStipulationType === "Custom/Other" ? match.customStipulation : match.customStipulationType)
      : match.stipulation === "None" ? "" : match.stipulation;
    
    setMatches([
      ...matches,
      { ...match, stipulation: finalStipulation, order: matches.length + 1 }
    ]);
    setMatch({
      participants: '',
      result: '',
      method: '',
      time: '',
      stipulation: '',
      customStipulationType: '',
      customStipulation: '',
      titleOutcome: ''
    });
  };

  // Save the edited event
  const handleSaveEvent = (e) => {
    e.preventDefault();
    if (!name || !date || !location || matches.length === 0) {
      alert('Please fill out all event fields and add at least one match.');
      return;
    }
    updateEvent({
      id: event.id,
      name,
      date,
      location,
      matches
    });
    navigate('/');
  };

  return (
    <div style={appBackground}>
      <div style={sectionStyle}>
        <Link to="/">← Back to Events</Link>
        <h2>Edit Event</h2>
        <form>
          <div>
            <label>
              Event Name:<br />
              <input value={name} onChange={e => setName(e.target.value)} required style={{ width: '100%' }} />
            </label>
          </div>
          <div>
            <label>
              Date:<br />
              <input value={date} onChange={e => setDate(e.target.value)} required placeholder="e.g. June 9, 2025" style={{ width: '100%' }} />
            </label>
          </div>
          <div>
            <label>
              Location:<br />
              <input value={location} onChange={e => setLocation(e.target.value)} required style={{ width: '100%' }} />
            </label>
          </div>
          <h3 style={{ marginTop: 24 }}>Matches</h3>
          {matches.length > 0 && (
            <ol>
              {matches.map((m, idx) => (
                <li key={idx}>
                  <strong>{m.participants}</strong> — {m.result} ({m.stipulation})
                  <button type="button" onClick={() => {
                    const updatedMatches = matches.filter(match => match.order !== m.order);
                    updatedMatches.forEach((match, idx) => {
                      match.order = idx + 1;
                    });
                    setMatches(updatedMatches);
                  }} style={{ color: 'red', marginLeft: 8 }}>Delete</button>
                </li>
              ))}
            </ol>
          )}
        </form>
        <form onSubmit={handleAddMatch} style={{ border: '1px solid #ccc', padding: 12, marginTop: 12 }}>
          <div>
            <label>
              Participants:<br />
              <input value={match.participants} onChange={e => {
                const newParticipants = e.target.value;
                const newOptions = newParticipants.includes(' vs ')
                  ? newParticipants.split(' vs ').map(side => side.trim())
                  : [];
                if (!newOptions.includes(winner)) setWinner('');
                setMatch({ ...match, participants: newParticipants });
              }} required style={{ width: '100%' }} />
            </label>
          </div>
          {eventStatus === 'completed' && (
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
              {resultType === 'Winner' && winnerOptions.length === 2 && (
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
                      {winnerOptions.map(side => (
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
            </>
          )}
          <div>
            <label>
              Stipulation:<br />
              <select
                value={match.stipulation}
                onChange={e => setMatch({ ...match, stipulation: e.target.value, customStipulationType: '', customStipulation: '' })}
                style={{ width: '100%' }}
              >
                {STIPULATION_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </label>
          </div>
          {match.stipulation === "Custom/Other" && (
            <>
              <div>
                <label>
                  Custom Stipulation Type:<br />
                  <select
                    value={match.customStipulationType || ""}
                    onChange={e => setMatch({ ...match, customStipulationType: e.target.value, customStipulation: '' })}
                    style={{ width: '100%' }}
                  >
                    <option value="">Select custom stipulation type...</option>
                    {CUSTOM_STIPULATION_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </label>
              </div>
              {match.customStipulationType === "Custom/Other" && (
                <div>
                  <label>
                    Custom Stipulation:<br />
                    <input
                      value={match.customStipulation || ''}
                      onChange={e => setMatch({ ...match, customStipulation: e.target.value })}
                      required={(!match.specialWinnerType || match.specialWinnerType === "None")}
                      style={{ width: '100%' }}
                    />
                  </label>
                </div>
              )}
            </>
          )}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, color: 'white' }}>
              Special Match Winner:
            </label>
            <select
              value={match.specialWinnerType || "None"}
              onChange={e => setMatch({ ...match, specialWinnerType: e.target.value })}
              style={{
                width: '100%',
                padding: 8,
                fontSize: '15px',
                border: '1px solid #888',
                borderRadius: 3,
                backgroundColor: '#232323',
                color: 'white',
                marginBottom: 8
              }}
            >
              {SPECIAL_WINNER_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, color: 'white' }}>
              Title Outcome:
            </label>
            <select
              value={match.titleOutcome || ""}
              onChange={e => setMatch({ ...match, titleOutcome: e.target.value })}
              style={{
                width: '100%',
                padding: 8,
                fontSize: '15px',
                border: '1px solid #888',
                borderRadius: 3,
                backgroundColor: '#232323',
                color: 'white',
                marginBottom: 8
              }}
            >
              {TITLE_OUTCOME_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <button type="submit" style={{ marginTop: 8 }}>Add Match</button>
        </form>
        <button
          type="button"
          style={{ marginTop: 24 }}
          disabled={matches.length === 0}
          onClick={handleSaveEvent}
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}

// Main App with Routing and Supabase persistence
function App() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load events from Supabase
  useEffect(() => {
    console.log('App mounted, fetching events...');
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      console.log('Attempting to fetch from Supabase...');
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Fetched data:', data);
      if (!data || data.length === 0) {
        console.log('No data returned from Supabase, using initial events');
        setEvents(initialEvents);
      } else {
        // Sort events by date (newest first)
        const sortedEvents = data.sort((a, b) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return dateB - dateA;
        });
        setEvents(sortedEvents);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      setError(error.message);
      console.log('Falling back to initial events');
      setEvents(initialEvents);
    } finally {
      setLoading(false);
    }
  };

  // Add new event to Supabase
  const addEvent = async (event) => {
    try {
      console.log('Attempting to add event to Supabase:', event);
      const { data, error } = await supabase
        .from('events')
        .insert([event])
        .select();

      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }

      console.log('Successfully added event:', data);
      setEvents([data[0], ...events]);
    } catch (error) {
      console.error('Error adding event:', error);
      alert('Failed to add event. Please try again.');
      // Fallback to local state update if Supabase fails
      setEvents([event, ...events]);
    }
  };

  // Delete event from Supabase
  const deleteEvent = async (id) => {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setEvents(events.filter(e => e.id !== id));
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event. Please try again.');
    }
  };

  // Update event in Supabase
  const updateEvent = async (updatedEvent) => {
    try {
      const { data, error } = await supabase
        .from('events')
        .update(updatedEvent)
        .eq('id', updatedEvent.id)
        .select();

      if (error) throw error;
      setEvents(events.map(e => e.id === updatedEvent.id ? data[0] : e));
    } catch (error) {
      console.error('Error updating event:', error);
      alert('Failed to update event. Please try again.');
    }
  };

  const handleEditMatch = (eventId, updatedMatches) => {
    setEvents(events.map(event => 
      event.id === eventId 
        ? { ...event, matches: updatedMatches }
        : event
    ));
    // Persist the updated matches to Supabase
    const eventToUpdate = events.find(event => event.id === eventId);
    if (eventToUpdate) {
      updateEvent({ ...eventToUpdate, matches: updatedMatches });
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 24, fontFamily: 'Arial, sans-serif' }}>
        <h2>Loading events...</h2>
        <p>Please wait while we fetch the latest events.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24, fontFamily: 'Arial, sans-serif' }}>
        <h2>Error loading events</h2>
        <p>{error}</p>
        <button 
          onClick={fetchEvents}
          style={{
            padding: '8px 16px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<EventList events={events} />} />
        <Route path="/event/:eventId" element={<EventBoxScore events={events} onDelete={deleteEvent} onEditMatch={handleEditMatch} />} />
        <Route path="/add-event" element={<AddEvent addEvent={addEvent} />} />
        <Route path="/edit-event/:eventId" element={<EditEvent events={events} updateEvent={updateEvent} />} />
      </Routes>
    </Router>
  );
}

export default App;