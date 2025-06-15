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

// Event List Component
function EventList({ events }) {
  return (
    <div style={{ padding: 24, fontFamily: 'Arial, sans-serif' }}>
      <h1>WWE Event Results</h1>
      <Link to="/add-event" style={{ display: 'inline-block', marginBottom: 16 }}>+ Add Event</Link>
      <ul>
        {events.map(event => (
          <li key={event.id} style={{ marginBottom: 16 }}>
            <Link to={`/event/${event.id}`}>
              <strong>{event.name}</strong>
            </Link>
            <br />
            {event.date} — {event.location}
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

  if (!event) {
    return <div style={{ padding: 24 }}>Event not found.</div>;
  }

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
    setEditedMatch(match);
    setIsEditingMatch(true);
  };

  const handleSaveMatch = () => {
    const updatedMatches = [...event.matches];
    updatedMatches[editingMatchIndex] = editedMatch;
    onEditMatch(event.id, updatedMatches);
    setIsEditingMatch(false);
    setEditingMatchIndex(null);
    setEditedMatch(null);
  };

  const handleCancelEditMatch = () => {
    setIsEditingMatch(false);
    setEditingMatchIndex(null);
    setEditedMatch(null);
  };

  const matchesWithCardType = event.matches.map((match, idx, arr) => ({
    ...match,
    cardType: idx === arr.length - 1 ? "Main Event" : "Undercard"
  }));

  if (isEditingMatch) {
    return (
      <div style={{ padding: 24, fontFamily: 'Arial, sans-serif', background: '#232323', minHeight: '100vh' }}>
        <Link to="/" style={{ color: '#6fa1ff' }}>← Back to Events</Link>
        <h2 style={{ color: 'white', marginTop: 24 }}>Edit Match</h2>
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
            <label style={{ display: 'block', marginBottom: 6, color: 'white' }}>
              Participants:
            </label>
            <input 
              value={editedMatch.participants} 
              onChange={e => setEditedMatch({...editedMatch, participants: e.target.value})} 
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
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, color: 'white' }}>
              Result:
            </label>
            <input 
              value={editedMatch.result} 
              onChange={e => setEditedMatch({...editedMatch, result: e.target.value})} 
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
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, color: 'white' }}>
              Method:
            </label>
            <select
              value={editedMatch.method}
              onChange={e => setEditedMatch({ ...editedMatch, method: e.target.value })}
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
              required
            >
              <option value="">Select method</option>
              {METHOD_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, color: 'white' }}>
              Time:
            </label>
            <input 
              value={editedMatch.time} 
              onChange={e => setEditedMatch({...editedMatch, time: e.target.value})} 
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
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, color: 'white' }}>
              Stipulation:
            </label>
            <select
              value={editedMatch.stipulation}
              onChange={e => setEditedMatch({ ...editedMatch, stipulation: e.target.value, customStipulation: '', specialWinnerType: 'None' })}
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
              {STIPULATION_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          {editedMatch.stipulation === "Custom/Other" && (
            <>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, color: 'white' }}>
                  Custom Stipulation:
                </label>
                <input
                  value={editedMatch.customStipulation || ''}
                  onChange={e => setEditedMatch({ ...editedMatch, customStipulation: e.target.value })}
                  required={(!editedMatch.specialWinnerType || editedMatch.specialWinnerType === "None")}
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
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, color: 'white' }}>
                  Special Match Winner:
                </label>
                <select
                  value={editedMatch.specialWinnerType || "None"}
                  onChange={e => setEditedMatch({ ...editedMatch, specialWinnerType: e.target.value })}
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
              value={editedMatch.titleOutcome || "None"}
              onChange={e => setEditedMatch({ ...editedMatch, titleOutcome: e.target.value === "None" ? "" : e.target.value })}
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
          <div style={{ 
            marginTop: 24,
            display: 'flex',
            gap: 12,
            justifyContent: 'flex-end'
          }}>
            <button 
              type="button"
              onClick={handleCancelEditMatch}
              style={{ 
                padding: '10px 20px',
                fontSize: '15px',
                backgroundColor: '#232323',
                color: '#bbb',
                border: '1px solid #888',
                borderRadius: 3,
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = '#333'}
              onMouseOut={e => e.currentTarget.style.backgroundColor = '#232323'}
            >
              Cancel
            </button>
            <button 
              type="button"
              onClick={handleSaveMatch} 
              style={{ 
                padding: '10px 20px',
                fontSize: '15px',
                backgroundColor: '#2ecc40',
                color: 'white',
                border: 'none',
                borderRadius: 3,
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = '#27ae38'}
              onMouseOut={e => e.currentTarget.style.backgroundColor = '#2ecc40'}
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, fontFamily: 'Arial, sans-serif' }}>
      <Link to="/">← Back to Events</Link>
      <h2>{event.name}</h2>
      <div>
        <strong>{event.date}</strong> — {event.location}
      </div>
      {event.specialWinner && (
        <div style={{ marginBottom: 16, padding: 8, backgroundColor: '#f0f0f0', borderRadius: 4 }}>
          <p style={{ margin: 0 }}>
            <strong>{event.specialWinner.type}:</strong> {event.specialWinner.name}
          </p>
        </div>
      )}
      <h3 style={{ marginTop: 24 }}>Match Results</h3>
      <table border="1" cellPadding="8" cellSpacing="0" style={{ borderCollapse: 'collapse', width: '100%', marginTop: 12 }}>
        <thead>
          <tr>
            <th>#</th>
            <th>Card</th>
            <th>Match</th>
            <th>Result</th>
            <th>Method</th>
            <th>Time</th>
            <th>Stipulation</th>
            <th>Title Outcome</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {matchesWithCardType.map((match, index) => (
            <tr key={match.order}>
              <td>{match.order}</td>
              <td>{match.cardType}</td>
              <td>{match.participants}</td>
              <td>{match.result}</td>
              <td>{match.method}</td>
              <td>{match.time}</td>
              <td>{
                match.stipulation === "Custom/Other" && match.customStipulation
                  ? match.customStipulation
                  : match.stipulation
              }</td>
              <td>{match.titleOutcome || ""}</td>
              <td>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button 
                    onClick={() => handleEditMatch(match, index)}
                    style={{ 
                      padding: '2px 6px',
                      fontSize: '12px',
                      backgroundColor: '#4a90e2',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      opacity: 0.7,
                      transition: 'opacity 0.2s'
                    }}
                    onMouseOver={e => e.currentTarget.style.opacity = '1'}
                    onMouseOut={e => e.currentTarget.style.opacity = '0.7'}
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleMoveMatch(index, -1)}
                    disabled={index === 0}
                    style={{ 
                      padding: '2px 6px',
                      fontSize: '12px',
                      backgroundColor: index === 0 ? '#ccc' : '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: index === 0 ? 'not-allowed' : 'pointer',
                      opacity: index === 0 ? 0.5 : 0.7,
                      transition: 'opacity 0.2s'
                    }}
                    onMouseOver={e => e.currentTarget.style.opacity = index === 0 ? '0.5' : '1'}
                    onMouseOut={e => e.currentTarget.style.opacity = index === 0 ? '0.5' : '0.7'}
                  >
                    ↑
                  </button>
                  <button 
                    onClick={() => handleMoveMatch(index, 1)}
                    disabled={index === event.matches.length - 1}
                    style={{ 
                      padding: '2px 6px',
                      fontSize: '12px',
                      backgroundColor: index === event.matches.length - 1 ? '#ccc' : '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: index === event.matches.length - 1 ? 'not-allowed' : 'pointer',
                      opacity: index === event.matches.length - 1 ? 0.5 : 0.7,
                      transition: 'opacity 0.2s'
                    }}
                    onMouseOver={e => e.currentTarget.style.opacity = index === event.matches.length - 1 ? '0.5' : '1'}
                    onMouseOut={e => e.currentTarget.style.opacity = index === event.matches.length - 1 ? '0.5' : '0.7'}
                  >
                    ↓
                  </button>
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
                    style={{ 
                      padding: '2px 6px',
                      fontSize: '12px',
                      backgroundColor: '#e24a4a',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      opacity: 0.7,
                      transition: 'opacity 0.2s'
                    }}
                    onMouseOver={e => e.currentTarget.style.opacity = '1'}
                    onMouseOut={e => e.currentTarget.style.opacity = '0.7'}
                  >
                    ×
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Discreet Edit/Delete buttons below the match card */}
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
    "Summer Slam",
    "Survivor Series"
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
  const [resultType, setResultType] = useState('Winner');
  const [winner, setWinner] = useState('');

  // Add a match to the matches list
  const handleAddMatch = (e) => {
    e.preventDefault();
    let finalStipulation = match.stipulation === "Custom/Other" ? match.customStipulation : 
                          match.stipulation === "None" ? "" : match.stipulation;
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
      customStipulation: '',
      titleOutcome: ''
    });
  };

  // Save the event
  const handleSaveEvent = (e) => {
    e.preventDefault();
    if (!eventType || !date || !location || matches.length === 0) {
      alert('Please fill out all event fields and add at least one match.');
      return;
    }
    const id = eventType.toLowerCase().replace(/\s+/g, '-') + '-' + date.replace(/[^0-9]/g, '');
    const eventData = {
      id,
      name: eventType,
      date,
      location,
      matches
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
    <div style={{ padding: 24, fontFamily: 'Arial, sans-serif', maxWidth: 600 }}>
      <Link to="/">← Back to Events</Link>
      <h2>Add New Event</h2>
      {/* Event fields form */}
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
      {/* Match fields form */}
      <form onSubmit={handleAddMatch} style={{ border: '1px solid #ccc', padding: 12, marginTop: 12 }}>
        <div>
          <label>
            Participants:<br />
            <input value={match.participants} onChange={e => setMatch({ ...match, participants: e.target.value })} required style={{ width: '100%' }} />
          </label>
        </div>
        <div>
          <label>
            Result Type:<br />
            <select value={resultType} onChange={e => {
              setResultType(e.target.value);
              setWinner('');
              if (e.target.value === 'No Winner') {
                setMatch({ ...match, result: '' });
              }
            }} style={{ width: '100%' }}>
              <option value="Winner">Winner</option>
              <option value="No Winner">No Winner</option>
            </select>
          </label>
        </div>
        {resultType === 'Winner' && match.participants.includes(' vs ') && (
          <div>
            <label>
              Winner:<br />
              <select
                value={winner}
                onChange={e => {
                  setWinner(e.target.value);
                  // Parse participants
                  const [sideA, sideB] = match.participants.split(' vs ');
                  const loser = e.target.value === sideA ? sideB : sideA;
                  setMatch({ ...match, result: `${e.target.value} def. ${loser}` });
                }}
                style={{ width: '100%' }}
              >
                <option value="">Select winner</option>
                {match.participants.split(' vs ').map(side => (
                  <option key={side} value={side}>{side}</option>
                ))}
              </select>
            </label>
          </div>
        )}
        <div>
          <label>
            Result:<br />
            <input value={match.result} onChange={e => setMatch({ ...match, result: e.target.value })} required style={{ width: '100%' }} />
          </label>
        </div>
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
            Stipulation:<br />
            <select
              value={match.stipulation}
              onChange={e => setMatch({ ...match, stipulation: e.target.value, customStipulation: '' })}
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
                Custom Stipulation:<br />
                <input
                  value={match.customStipulation}
                  onChange={e => setMatch({ ...match, customStipulation: e.target.value })}
                  required={(!match.specialWinnerType || match.specialWinnerType === "None")}
                  style={{ width: '100%' }}
                />
              </label>
            </div>
            <div>
              <label>
                Special Match Winner:<br />
                <select
                  value={match.specialWinnerType || "None"}
                  onChange={e => setMatch({ ...match, specialWinnerType: e.target.value })}
                  style={{ width: '100%' }}
                >
                  {SPECIAL_WINNER_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </label>
            </div>
          </>
        )}
        <div>
          <label>
            Title Outcome:<br />
            <select value={match.titleOutcome} onChange={e => setMatch({ ...match, titleOutcome: e.target.value })} style={{ width: '100%' }}>
              <option value="">None</option>
              <option value="Successful Defense">Successful Defense</option>
              <option value="New Champion">New Champion</option>
            </select>
          </label>
        </div>
        <button type="submit" style={{ marginTop: 8 }}>Add Match</button>
      </form>
      {/* Save Event button */}
      <button
        type="button"
        style={{ marginTop: 24 }}
        disabled={matches.length === 0}
        onClick={handleSaveEvent}
      >
        Save Event
      </button>
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
    titleOutcome: ''
  });

  // Add a match to the matches list
  const handleAddMatch = (e) => {
    e.preventDefault();
    setMatches([
      ...matches,
      { ...match, order: matches.length + 1 }
    ]);
    setMatch({
      participants: '',
      result: '',
      method: '',
      time: '',
      stipulation: '',
      titleOutcome: ''
    });
  };

  // Remove a match from the matches list
  const handleDeleteMatch = (order) => {
    setMatches(matches.filter(m => m.order !== order).map((m, idx) => ({ ...m, order: idx + 1 })));
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
    <div style={{ padding: 24, fontFamily: 'Arial, sans-serif', maxWidth: 600 }}>
      <Link to="/">← Back to Events</Link>
      <h2>Edit Event</h2>
      {/* Event fields form */}
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
                <button type="button" onClick={() => handleDeleteMatch(m.order)} style={{ color: 'red', marginLeft: 8 }}>Delete</button>
              </li>
            ))}
          </ol>
        )}
      </form>
      {/* Match fields form */}
      <form onSubmit={handleAddMatch} style={{ border: '1px solid #ccc', padding: 12, marginTop: 12 }}>
        <div>
          <label>
            Participants:<br />
            <input value={match.participants} onChange={e => setMatch({ ...match, participants: e.target.value })} required style={{ width: '100%' }} />
          </label>
        </div>
        <div>
          <label>
            Result:<br />
            <input value={match.result} onChange={e => setMatch({ ...match, result: e.target.value })} required style={{ width: '100%' }} />
          </label>
        </div>
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
            Stipulation:<br />
            <select
              value={match.stipulation}
              onChange={e => setMatch({ ...match, stipulation: e.target.value, customStipulation: '', specialWinnerType: 'None' })}
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
        <div>
          <label>
            Title Outcome:<br />
            <select value={match.titleOutcome} onChange={e => setMatch({ ...match, titleOutcome: e.target.value })} style={{ width: '100%' }}>
              <option value="">None</option>
              <option value="Successful Defense">Successful Defense</option>
              <option value="New Champion">New Champion</option>
            </select>
          </label>
        </div>
        <button type="submit" style={{ marginTop: 8 }}>Add Match</button>
      </form>
      {/* Save Event button */}
      <button
        type="button"
        style={{ marginTop: 24 }}
        disabled={matches.length === 0}
        onClick={handleSaveEvent}
      >
        Save Changes
      </button>
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