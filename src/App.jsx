import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';
import { events as initialEvents } from './events';
import { supabase } from './supabaseClient';
import MatchEdit from './components/MatchEdit';
import MatchPage from './components/MatchPage';

// Place these at the top level, after imports
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
  "King of the Ring finalist",
  "Queen of the Ring finalist",
  "Triple Threat match",
  "Fatal Four-way match",
  "Unsanctioned Match",
  "Custom/Other"
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

// Update color variables to match new banner
const gold = '#C6A04F'; // new gold from banner
const red = '#D32F2F'; // red from banner
const cream = '#F5E7D0'; // cream from banner

// Date formatting function
function formatDate(dateStr) {
  if (!dateStr) return '';
  // Accepts 'YYYY-MM-DD' or 'Month Day, Year' and returns 'Month Day, Year'
  let dateObj;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    // Parse as YYYY-MM-DD
    const [year, month, day] = dateStr.split('-');
    dateObj = new Date(Number(year), Number(month) - 1, Number(day));
  } else {
    dateObj = new Date(dateStr);
  }
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Add a gold/black theme style at the top level
const appBackground = {
  minHeight: '100vh',
  background: '#181511',
  color: cream,
  fontFamily: 'Arial, sans-serif',
};

// Add theme styles for reuse
const sectionStyle = {
  background: 'rgba(20, 20, 20, 0.98)',
  borderRadius: 12,
  boxShadow: '0 0 24px #C6A04F22',
  padding: '24px 40px',
  margin: '24px auto',
  maxWidth: 1200,
};
const tableStyle = {
  width: '100%',
  background: 'rgba(34, 34, 34, 0.98)',
  color: gold,
  borderCollapse: 'collapse',
  boxShadow: '0 0 12px #C6A04F22',
};
const thStyle = {
  background: '#222',
  color: gold,
  fontWeight: 700,
  borderBottom: '2px solid #C6A04F',
  padding: 10,
};
const tdStyle = {
  background: 'rgba(34, 34, 34, 0.98)',
  color: cream,
  borderBottom: '1px solid #444',
  padding: 10,
};
const inputStyle = {
  width: '100%',
  padding: 10,
  fontSize: '15px',
  border: `1px solid ${gold}`,
  borderRadius: 4,
  backgroundColor: '#232323',
  color: gold,
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
  boxShadow: '0 0 8px #C6A04F22',
  marginRight: 8,
  marginTop: 8,
  transition: 'background 0.2s, color 0.2s',
};

const participantsTdStyle = {
  ...tdStyle,
  minWidth: 220,
  maxWidth: 400,
  wordBreak: 'break-word',
};

// Event List Component
function isUpcomingEST(event) {
  if (event.status !== 'upcoming') return false;
  // Parse event date and set to 8:00 PM EST (which is 1:00 AM UTC next day)
  const [year, month, day] = event.date.split('-');
  // 8:00 PM EST is 01:00 AM UTC the next day
  const eventCutoffUTC = new Date(Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day) + 1, // next day
    1, 0, 0 // 1:00:00 AM UTC
  ));
  const nowUTC = new Date();
  return nowUTC < eventCutoffUTC;
}

const EVENT_LOGO_MAP = {
  raw: 'raw_logo.png',
  smackdown: 'smackdown_logo.png',
  'wrestlemania night 1': 'wrestlemania_logo.png',
  'wrestlemania night 2': 'wrestlemania_logo.png',
  'summer slam night 1': 'summer_slam.png',
  'summer slam night 2': 'summer_slam.png',
  'night of champions': 'night_of_champions.png',
  'survivor series': 'survivor_series.png',
  'saturday night\'s main event': 'saturday_nights_main_event.png',
  // add more special cases as needed
};

function getEventLogo(name) {
  if (!name) return null;
  const key = name.trim().toLowerCase();
  if (EVENT_LOGO_MAP[key]) return `/images/${EVENT_LOGO_MAP[key]}`;
  // fallback: auto-generate filename
  let auto = key.replace(/[^a-z0-9]+/g, '_').replace(/_+$/, '') + '.png';
  return `/images/${auto}`;
}

// Logo fallback component
function EventLogoOrText({ name, alt, style, textStyle }) {
  const logoSrc = getEventLogo(name);
  const [imgError, setImgError] = React.useState(false);
  if (!imgError) {
    return (
      <img src={logoSrc} alt={alt || name} style={style} onError={() => setImgError(true)} />
    );
  }
  return <strong style={textStyle}>{name}</strong>;
}

function EventList({ events }) {
  return (
    <div style={appBackground}>
      <img src="/images/banner.png" alt="Wrestling Boxscore Banner" style={{
        display: 'block',
        margin: '0 auto 32px auto',
        maxWidth: 480,
        width: '100%',
      }} />
      <h1 style={{
        textAlign: 'center',
        color: gold,
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
        boxShadow: '0 0 8px #C6A04F22',
        transition: 'background 0.2s, color 0.2s',
      }}>+ Add Event</Link>
      <div style={{ marginTop: 24 }}>
        {events.map(event => {
          const isUpcoming = isUpcomingEST(event);
          return (
            <Link
              to={`/event/${event.id}`}
              key={event.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 24,
                background: 'rgba(34,34,34,0.98)',
                borderRadius: 10,
                boxShadow: '0 0 8px #C6A04F22',
                padding: '16px 24px',
                marginBottom: 18,
                textDecoration: 'none',
                color: gold,
                transition: 'background 0.2s',
                cursor: 'pointer',
                position: 'relative',
                border: '1px solid #333',
              }}
            >
              <EventLogoOrText
                name={event.name}
                style={{
                  display: 'inline-block',
                  verticalAlign: 'middle',
                  maxHeight: 48,
                  maxWidth: ['night of champions', 'survivor series', "saturday night's main event"].includes(event.name.trim().toLowerCase()) ? 180 : 96,
                  height: 'auto',
                  width: 'auto',
                  objectFit: 'contain',
                  marginRight: 12,
                }}
                textStyle={{ color: gold }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ color: gold, fontWeight: 600, fontSize: 20 }}>{event.name}</span>
                  {event.isLive && <span style={{ background: '#27ae60', color: 'white', fontWeight: 700, borderRadius: 4, padding: '2px 10px', fontSize: 14, marginLeft: 4 }}>LIVE</span>}
                  {isUpcoming ? <span style={{ fontSize: 14, color: gold, marginLeft: 4 }}>(upcoming)</span> : null}
                </div>
                <div style={{ color: gold, fontSize: 16, marginTop: 2 }}>
                  {formatDate(event.date)} — {event.location}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// Add a function to format the result string
function formatResult(winner, others) {
  if (others.length === 1) return `${winner} def. ${others[0]}`;
  if (others.length === 2) return `${winner} def. ${others[0]} and ${others[1]}`;
  return `${winner} def. ${others.slice(0, -1).join(', ')} and ${others[others.length - 1]}`;
}

// Event Box Score Component (with discreet Edit/Delete below the match card)
function EventBoxScore({ events, onDelete, onEditMatch }) {
  const { eventId } = useParams();
  const event = events.find(e => e.id === eventId);
  const navigate = useNavigate();
  const [isEditingMatch, setIsEditingMatch] = useState(false);
  const [editingMatchIndex, setEditingMatchIndex] = useState(null);
  const [editedMatch, setEditedMatch] = useState(null);
  const logo = getEventLogo(event.name);
  const [showCustomStipulation, setShowCustomStipulation] = useState(false);

  if (!event) {
    return <div style={{ padding: 24 }}>Event not found.</div>;
  }

  const handleMoveMatch = (index, direction) => {
    const updatedMatches = [...event.matches];
    const newIndex = index + direction;
    if (newIndex >= 0 && newIndex < updatedMatches.length) {
      [updatedMatches[index], updatedMatches[newIndex]] = [updatedMatches[newIndex], updatedMatches[index]];
      updatedMatches.forEach((match, idx) => { match.order = idx + 1; });
      onEditMatch(event.id, updatedMatches);
    }
  };

  const handleEditMatch = (match, index) => {
    setEditingMatchIndex(index);
    setEditedMatch(match);
    setIsEditingMatch(true);
  };

  const handleSaveMatch = (updatedMatch) => {
    const updatedMatches = [...event.matches];
    updatedMatches[editingMatchIndex] = updatedMatch;
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
      <div style={appBackground}>
        <div style={sectionStyle}>
          <Link to="/" style={{ color: gold }}>← Back to Events</Link>
          <h2 style={{ color: gold, marginTop: 24 }}>Edit Match</h2>
          <MatchEdit
            initialMatch={editedMatch}
            onSave={handleSaveMatch}
            onCancel={handleCancelEditMatch}
            eventStatus={event.status}
            eventDate={event.date}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={appBackground}>
      <div style={sectionStyle}>
        <Link to="/" style={{ color: gold }}>← Back to Events</Link>
        <EventLogoOrText 
          name={event.name} 
          style={{ 
            display: 'inline-block',
            verticalAlign: 'middle',
            marginRight: 8,
            maxHeight: 48,
            maxWidth: ['night of champions', 'survivor series', "saturday night's main event"].includes(event.name.trim().toLowerCase()) ? 180 : 96,
            height: 'auto',
            width: 'auto',
            objectFit: 'contain',
          }} 
          textStyle={{ color: gold }} 
        />
        <div style={{ color: gold, marginBottom: 8 }}>
          <strong>{formatDate(event.date)}</strong> — {event.location}
        </div>
        {event.specialWinner && (
          <div style={{ marginBottom: 16, padding: 8, backgroundColor: '#f0f0f0', borderRadius: 4 }}>
            <p style={{ margin: 0 }}>
              <strong>{event.specialWinner.type}:</strong> {event.specialWinner.name}
            </p>
          </div>
        )}
        <h3 style={{ marginTop: 24, color: gold }}>Match Results</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {matchesWithCardType.map((match, index) => {
            // Split participants by 'vs'
            const [left, right] = match.participants.split(' vs ').map(s => s.trim());
            // Winner logic
            const winner = match.result && match.result.includes(' def. ')
              ? match.result.split(' def. ')[0]
              : (match.result ? match.result : '');
            const isLeftWinner = left && winner && winner.startsWith(left);
            const isRightWinner = right && winner && winner.startsWith(right);
            return (
              <div
                key={match.order}
                onClick={() => navigate(`/event/${event.id}/match/${match.order}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#232323',
                  borderRadius: 12,
                  boxShadow: '0 0 12px #C6A04F22',
                  padding: '18px 24px',
                  cursor: 'pointer',
                  border: '1px solid #444',
                  transition: 'background 0.2s',
                  position: 'relative',
                  minHeight: 120,
                }}
              >
                {/* Left participant */}
                <div style={{ flex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#444', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, color: '#888' }}>
                    {/* Placeholder for image */}
                    <span role="img" aria-label="wrestler">👤</span>
                  </div>
                  <div style={{ fontWeight: 700, color: isLeftWinner ? gold : '#fff', fontSize: 16, textAlign: 'center' }}>{left}</div>
                  {/* Placeholder for record/title */}
                  <div style={{ color: gold, fontSize: 13, marginTop: 2 }}>{isLeftWinner && match.title !== 'None' ? '🏆' : ''}</div>
                  {/* Placeholder for flag/nationality */}
                  <div style={{ color: '#bbb', fontSize: 13, marginTop: 2 }}>Flag</div>
                </div>
                {/* Center match info */}
                <div style={{ flex: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <div style={{ fontWeight: 700, color: gold, fontSize: 15, marginBottom: 2 }}>{match.cardType}{match.title && match.title !== 'None' ? ' - Title Match' : ''}</div>
                  <div style={{ fontWeight: 700, color: '#fff', fontSize: 18 }}>{match.result ? (match.method === 'Submission' ? 'Final Sub' : 'Final') : ''}</div>
                  <div style={{ color: '#bbb', fontSize: 15 }}>{match.method}{match.time ? `, ${match.time}` : ''}</div>
                  <div style={{ color: '#bbb', fontSize: 14 }}>{match.stipulation && match.stipulation !== 'None' ? match.stipulation : ''}</div>
                  <div style={{ color: gold, fontSize: 13 }}>{match.notes ? match.notes : ''}</div>
                </div>
                {/* Right participant */}
                <div style={{ flex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#444', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, color: '#888' }}>
                    {/* Placeholder for image */}
                    <span role="img" aria-label="wrestler">👤</span>
                  </div>
                  <div style={{ fontWeight: 700, color: isRightWinner ? gold : '#fff', fontSize: 16, textAlign: 'center' }}>{right}</div>
                  {/* Placeholder for record/title */}
                  <div style={{ color: gold, fontSize: 13, marginTop: 2 }}>{isRightWinner && match.title !== 'None' ? '🏆' : ''}</div>
                  {/* Placeholder for flag/nationality */}
                  <div style={{ color: '#bbb', fontSize: 13, marginTop: 2 }}>Flag</div>
                </div>
              </div>
            );
          })}
        </div>
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
    title: '',
    titleOutcome: '',
    notes: ''
  });
  const [specialWinnerType, setSpecialWinnerType] = useState("None");
  const [specialWinnerName, setSpecialWinnerName] = useState('');
  const navigate = useNavigate();
  const [resultType, setResultType] = useState('');
  const [winner, setWinner] = useState('');
  const [eventStatus, setEventStatus] = useState('completed'); // 'upcoming' or 'completed'

  // Winner options based on participants
  const winnerOptions = match.participants.includes(' vs ')
    ? match.participants.split(' vs ').map(side => side.trim()).filter(Boolean)
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
      ? match.customStipulation
      : match.stipulation === "None" ? "" : match.stipulation;
    
    let result = '';
    if (eventStatus === 'completed' && resultType === 'Winner' && winner && winnerOptions.length >= 2) {
      const others = winnerOptions.filter(name => name !== winner);
      result = formatResult(winner, others);
    }
    setMatches([
      ...matches,
      { ...match, isLive: match.isLive || false, result, stipulation: finalStipulation, order: matches.length + 1 }
    ]);
    setMatch({
      participants: '',
      result: '',
      method: '',
      time: '',
      stipulation: '',
      customStipulation: '',
      title: '',
      titleOutcome: '',
      notes: '',
      isLive: false
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
      const invalidMatch = matches.some(m => !m.participants || !m.method || !m.result);
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
      status: eventStatus,
      isLive: eventStatus === 'live'
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
          <button
            type="button"
            onClick={() => setEventStatus('live')}
            style={{
              padding: '8px 16px',
              background: eventStatus === 'live' ? '#27ae60' : '#232323',
              color: eventStatus === 'live' ? 'white' : '#bbb',
              border: '1px solid #27ae60',
              borderRadius: 4,
              cursor: 'pointer',
              fontWeight: eventStatus === 'live' ? 'bold' : 'normal'
            }}
          >
            Live Event
          </button>
        </div>
        {eventStatus === 'live' && (
          <button
            type="button"
            style={{ marginBottom: 24, background: '#27ae60', color: 'white', padding: '10px 24px', border: 'none', borderRadius: 4, fontWeight: 700 }}
            onClick={handleSaveEvent}
          >
            Save Event Details
          </button>
        )}
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
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required style={{ width: '100%' }} />
            </label>
          </div>
          <div>
            <label>
              Location:<br />
              <input value={location} onChange={e => setLocation(e.target.value)} required style={{ width: '100%' }} />
            </label>
          </div>
          <h3 style={{ marginTop: 24 }}>Add Matches</h3>
          <div style={{ marginBottom: 12 }}>
            <label style={{ color: gold, fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={match.isLive || false}
                onChange={e => setMatch({ ...match, isLive: e.target.checked })}
                style={{ marginRight: 8 }}
              />
              Live Match
            </label>
          </div>
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
              {resultType === 'Winner' && winnerOptions.length >= 2 && (
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
          <div>
            <label>
              Stipulation:<br />
              <select
                value={match.stipulation}
                onChange={e => setMatch({ ...match, stipulation: e.target.value, customStipulationType: '', customStipulation: '' })}
                style={inputStyle}
              >
                {STIPULATION_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </label>
          </div>
          {match.stipulation === "Custom/Other" && (
            <div style={{ marginBottom: 16 }}>
              <label>
                Custom Stipulation:<br />
              </label>
              <input
                value={match.customStipulation || ''}
                onChange={e => setMatch({ ...match, customStipulation: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>
          )}
          <div>
            <label>
              Title:<br />
              <select
                value={match.title}
                onChange={e => setMatch({ ...match, title: e.target.value })}
                style={inputStyle}
              >
                {TITLE_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </label>
          </div>
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
          <button type="submit" style={{ marginTop: 8 }}>Add Match</button>
        </form>
        <button
          type="button"
          style={{ marginTop: 24 }}
          disabled={
            !eventType || !date || !location || matches.length === 0 ||
            (eventStatus === 'completed' && matches.some(m => !m.participants || !m.method || !m.result))
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
    title: '',
    titleOutcome: '',
    notes: ''
  });
  const [resultType, setResultType] = useState('');
  const [winner, setWinner] = useState('');
  const [eventStatus, setEventStatus] = useState(event.status || 'completed');

  // Winner options based on participants
  const winnerOptions = match.participants.includes(' vs ')
    ? match.participants.split(' vs ').map(side => side.trim()).filter(Boolean)
    : [];

  // Add a match to the matches list
  const handleAddMatch = (e) => {
    e.preventDefault();
    let finalStipulation = match.stipulation === "Custom/Other"
      ? match.customStipulation
      : match.stipulation === "None" ? "" : match.stipulation;
    
    let result = '';
    if (eventStatus === 'completed' && resultType === 'Winner' && winner && winnerOptions.length >= 2) {
      const others = winnerOptions.filter(name => name !== winner);
      result = formatResult(winner, others);
    }
    setMatches([
      ...matches,
      { ...match, isLive: match.isLive || false, result, stipulation: finalStipulation, order: matches.length + 1 }
    ]);
    setMatch({
      participants: '',
      result: '',
      method: '',
      time: '',
      stipulation: '',
      customStipulation: '',
      title: '',
      titleOutcome: '',
      notes: '',
      isLive: false
    });
    setResultType('');
    setWinner('');
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
      matches,
      status: eventStatus
    });
    navigate('/');
  };

  return (
    <div style={appBackground}>
      <div style={sectionStyle}>
        <Link to="/">← Back to Events</Link>
        <h2>Edit Event</h2>
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
          <button
            type="button"
            onClick={() => setEventStatus('live')}
            style={{
              padding: '8px 16px',
              background: eventStatus === 'live' ? '#27ae60' : '#232323',
              color: eventStatus === 'live' ? 'white' : '#bbb',
              border: '1px solid #27ae60',
              borderRadius: 4,
              cursor: 'pointer',
              fontWeight: eventStatus === 'live' ? 'bold' : 'normal'
            }}
          >
            Live Event
          </button>
        </div>
        {eventStatus === 'live' && (
          <button
            type="button"
            style={{ marginBottom: 24, background: '#27ae60', color: 'white', padding: '10px 24px', border: 'none', borderRadius: 4, fontWeight: 700 }}
            onClick={handleSaveEvent}
          >
            Save Event Details
          </button>
        )}
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
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required style={{ width: '100%' }} />
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
                  ? newParticipants.split(' vs ').map(side => side.trim()).filter(Boolean)
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
              {resultType === 'Winner' && winnerOptions.length >= 2 && (
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
          <div>
            <label>
              Stipulation:<br />
              <select
                value={match.stipulation}
                onChange={e => setMatch({ ...match, stipulation: e.target.value, customStipulationType: '', customStipulation: '' })}
                style={inputStyle}
              >
                {STIPULATION_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </label>
          </div>
          {match.stipulation === "Custom/Other" && (
            <div style={{ marginBottom: 16 }}>
              <label>
                Custom Stipulation:<br />
              </label>
              <input
                value={match.customStipulation || ''}
                onChange={e => setMatch({ ...match, customStipulation: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>
          )}
          <div>
            <label>
              Title:<br />
              <select
                value={match.title}
                onChange={e => setMatch({ ...match, title: e.target.value })}
                style={inputStyle}
              >
                {TITLE_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </label>
          </div>
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
        <Route path="/event/:eventId/match/:matchOrder" element={<MatchPage events={events} />} />
        <Route path="/add-event" element={<AddEvent addEvent={addEvent} />} />
        <Route path="/edit-event/:eventId" element={<EditEvent events={events} updateEvent={updateEvent} />} />
      </Routes>
    </Router>
  );
}

export default App;