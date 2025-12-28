import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';
import { events as initialEvents } from './events';
import { supabase } from './supabaseClient';
import { useUser } from './hooks/useUser';
import MatchEdit from './components/MatchEdit';
import MatchPage from './components/MatchPage';
import MatchPageNew from './components/MatchPageNew';
import MatchCard from './components/MatchCard';
import {
  MATCH_TYPE_OPTIONS,
  STIPULATION_OPTIONS,
  METHOD_OPTIONS,
  TITLE_OPTIONS,
  SPECIAL_WINNER_OPTIONS,
  TITLE_OUTCOME_OPTIONS
} from './options';
import Menu from './components/Menu';
import WrestlersPage from './components/WrestlersPage';
import Layout from './components/Layout';
import { Helmet } from 'react-helmet';
import WrestlerMultiSelect from './components/WrestlerMultiSelect';
import WrestlerAutocomplete from './components/WrestlerAutocomplete';
import ParticipantSelectionDemo from './components/ParticipantSelectionDemo';
import VisualMatchBuilder from './components/VisualMatchBuilder';
import GauntletMatchBuilder from './components/GauntletMatchBuilder';
import TwoOutOfThreeFallsBuilder from './components/TwoOutOfThreeFallsBuilder';
import WarGamesMatchBuilder from './components/WarGamesMatchBuilder';
import ChampionshipsPage from './components/ChampionshipsPage';

// Place these at the top level, after imports

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

const PROMO_TYPE_OPTIONS = [
  'In-Ring',
  'Backstage',
  'Pre-Show',
  'Post-Show',
  'Video Package',
  'Social Media',
];

const PROMO_OUTCOME_OPTIONS = [
  'None',
  'Vacated Title',
  'Match Announced',
  'Wrestler Going Inactive',
  'Championship Challenge',
  'Return Announced',
  'Feud Started',
  'Feud Ended',
  'Alliance Formed',
  'Alliance Broken',
  'Retirement Announcement',
  'Contract Signing',
  'Other',
];

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
    console.log('Rendering wrestler:', name, logoSrc);
    return (
      <img src={logoSrc} alt={alt || name} style={style} onError={() => setImgError(true)} />
    );
  }
  return <strong style={textStyle}>{name}</strong>;
}

function EventList({ events }) {
  const user = useUser();
  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        {user && (
          <Link
            to="/add-event"
            style={{
              padding: '8px 16px',
              background: gold,
              color: '#232323',
              textDecoration: 'none',
              borderRadius: 4,
              fontWeight: 600,
              fontSize: 14
            }}
          >
            + Add Event
          </Link>
        )}
      </div>
      {/* WWE Event Results heading */}
      <h1 style={{
        textAlign: 'center',
        color: '#fff',
        fontSize: 40,
        marginBottom: 8,
        marginTop: 0
      }}>WWE Event Results</h1>
      <div style={{ marginTop: 24 }}>
        {events.map(event => {
          const isUpcoming = isUpcomingEST(event);
          return (
            <Link
              to={`/event/${event.id}`}
              key={event.id}
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'stretch',
                gap: 0,
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
                minHeight: 64,
              }}
            >
              {/* Logo column */}
              <div style={{
                width: 110,
                minWidth: 110,
                maxWidth: 110,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                paddingRight: 12,
              }}>
                <EventLogoOrText
                  name={event.name}
                  style={{
                    display: 'block',
                    margin: '0 auto',
                    maxHeight: 48,
                    maxWidth: 96,
                    height: 'auto',
                    width: 'auto',
                    objectFit: 'contain',
                  }}
                  textStyle={{ color: gold }}
                />
              </div>
              {/* Details column */}
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'flex-start',
                minWidth: 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ color: '#fff', fontWeight: 600, fontSize: 20 }}>{event.name}</span>
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

// Format Gauntlet Match results with progression
function formatGauntletResult(participants, winner, wrestlerMap) {
  if (!participants || participants.length < 2) {
    return winner ? `${winner} won the Gauntlet Match` : 'No winner';
  }
  
  // Parse participants if they're in string format
  let participantList = participants;
  if (typeof participants === 'string') {
    participantList = participants.split(' → ').map(p => p.trim());
  }
  
  // Convert slugs to names
  const participantNames = participantList.map(slug => {
    const wrestler = wrestlerMap[slug];
    return wrestler ? wrestler.name : slug;
  });
  
  const winnerName = wrestlerMap[winner] ? wrestlerMap[winner].name : winner;
  
  // Build the progression
  const progression = [];
  let currentWinner = participantNames[0]; // First participant starts
  
  for (let i = 1; i < participantNames.length; i++) {
    const nextParticipant = participantNames[i];
    
    if (nextParticipant === winnerName) {
      // This participant won against the current winner
      progression.push(`${nextParticipant} def. ${currentWinner}`);
      currentWinner = nextParticipant;
    } else {
      // Current winner defeated this participant
      progression.push(`${currentWinner} def. ${nextParticipant}`);
    }
  }
  
  return progression.join(' → ');
}



// Replace all occurrences of splitting participants as a string with array logic
// Example: parsing teams for rendering
const getTeams = (participants) => {
  if (Array.isArray(participants)) return participants;
  if (typeof participants === 'string' && participants.trim()) {
    // fallback for legacy data
    return participants.split(' vs ').map(side => side.split('&').map(name => name.trim()));
  }
  return [];
};

// When displaying participants as a string
const getParticipantsDisplay = (participants, wrestlerMap, stipulation, matchType) => {
  if (Array.isArray(participants)) {
    // Battle Royal: flat array of slugs
    if ((matchType || stipulation) === 'Battle Royal' || participants.every(p => typeof p === 'string')) {
      return participants.map(slug => wrestlerMap?.[slug]?.name || slug).join(', ');
    }
    // Gauntlet Match: array of individual participants
    if ((matchType || stipulation) === 'Gauntlet Match') {
      return participants.map(team => (Array.isArray(team) ? team : []).map(slug => wrestlerMap?.[slug]?.name || slug).join('')).join(' → ');
    }
    // Tag/singles: array of arrays
    return participants.map(team => (Array.isArray(team) ? team : []).map(slug => wrestlerMap?.[slug]?.name || slug).join(' & ')).join(' vs ');
  }
  if (typeof participants === 'string' && wrestlerMap) {
    // Split by vs, then by &
    return participants.split(' vs ').map(side =>
      side.split('&').map(slug => {
        const s = slug.trim();
        return wrestlerMap[s]?.name || s;
      }).join(' & ')
    ).join(' vs ');
  }
  return participants || '';
};

// Get display name for a team (tag team name + individual names)
const getTeamDisplayName = (team, tagTeams, sideIndex, wrestlerMap) => {
  const tagTeamName = tagTeams[sideIndex];
  const individualNames = team.map(wrestler => wrestlerMap[wrestler]?.name || wrestler).join(' & ');
  
  if (tagTeamName) {
    return {
      tagTeamName,
      individualNames,
      displayText: `${tagTeamName}\n${individualNames}`
    };
  } else {
    return {
      tagTeamName: null,
      individualNames,
      displayText: individualNames
    };
  }
};

// Add at top-level, after imports (if not already present)
function formatCommentaryElapsedTime(ts, liveStart, commentary) {
  let start = liveStart;
  if (!start && commentary && commentary.length > 0) {
    // Use the first (newest) commentary timestamp as start since we're now storing newest first
    start = commentary[0].timestamp;
  }
  if (!ts || !start) return '0\'';
  const elapsed = Math.max(0, Math.ceil((ts - start) / 60000));
  return `${elapsed}'`;
}

// Event Box Score Component (with discreet Edit/Delete below the match card)
function EventBoxScore({ events, onDelete, onEditMatch, onRealTimeCommentaryUpdate, wrestlerMap, wrestlers }) {
  const user = useUser();
  const { eventId } = useParams();
  const event = events.find(e => e.id === eventId);
  const navigate = useNavigate();
  const [isEditingMatch, setIsEditingMatch] = useState(false);
  const [editingMatchIndex, setEditingMatchIndex] = useState(null);
  const [editedMatch, setEditedMatch] = useState(null);
  const logo = getEventLogo(event.name);
  const [showCustomStipulation, setShowCustomStipulation] = useState(false);
  const [expanded, setExpanded] = React.useState(false);

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

  // Don't designate main event for upcoming events with fewer than 4 matches
  const shouldDesignateMainEvent = event.status !== 'upcoming' || event.matches.length >= 4;
  
  // Sort matches by order property
  const sortedMatches = [...event.matches].sort((a, b) => {
    const orderA = a.order || 0;
    const orderB = b.order || 0;
    return orderA - orderB;
  });
  
  const matchesWithCardType = sortedMatches.map((match, idx, arr) => ({
    ...match,
    cardType: shouldDesignateMainEvent && idx === arr.length - 1 ? "Main Event" : "Undercard"
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
            onRealTimeCommentaryUpdate={onRealTimeCommentaryUpdate}
            eventId={event.id}
            matchOrder={editedMatch.order}
            wrestlers={wrestlers}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={appBackground}>
      <div style={sectionStyle}>
        <Link to="/" style={{ color: gold }}>← Back to Events</Link>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 24, marginBottom: 8 }}>
          <EventLogoOrText 
            name={event.name} 
            style={{ 
              display: 'inline-block',
              verticalAlign: 'middle',
              marginRight: 8,
              maxHeight: 48,
              maxWidth: 96,
              height: 'auto',
              width: 'auto',
              objectFit: 'contain',
            }} 
            textStyle={{ color: gold }} 
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
            <span style={{ color: '#fff', fontWeight: 600, fontSize: 20 }}>{event.name}</span>
            {event.isLive && <span style={{ background: '#27ae60', color: 'white', fontWeight: 700, borderRadius: 4, padding: '2px 10px', fontSize: 14, marginLeft: 4 }}>LIVE</span>}
          </div>
          <div style={{ color: gold, marginTop: 8, fontSize: 18 }}>
            <strong>{formatDate(event.date)}</strong> — {event.location}
          </div>
        </div>
        {event.specialWinner && (
          <div style={{ marginBottom: 16, padding: 8, backgroundColor: '#f0f0f0', borderRadius: 4 }}>
            <p style={{ margin: 0 }}>
              <strong>{event.specialWinner.type}:</strong> {event.specialWinner.name}
            </p>
          </div>
        )}
        <h3 style={{ marginTop: 24, color: '#fff' }}>Match Results</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {matchesWithCardType.map((match, index) => {
            const [expanded, setExpanded] = React.useState(false);
            return (
              <div key={match.order}>
                <MatchCard 
                  match={match} 
                  event={event} 
                  wrestlerMap={wrestlerMap} 
                  isClickable={true}
                />
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
                  <button
                    onClick={e => { e.stopPropagation(); setExpanded(exp => !exp); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      outline: 'none',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'transform 0.2s',
                      transform: expanded ? 'rotate(180deg)' : 'none',
                    }}
                    aria-label={expanded ? 'Collapse details' : 'Expand details'}
                  >
                    <svg width="32" height="20" viewBox="0 0 32 20">
                      <polyline points="4,6 16,18 28,6" fill="none" stroke="#C6A04F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
                {/* Animated expandable details */}
                <div
                  style={{
                    maxHeight: expanded ? 400 : 0,
                    overflow: 'hidden',
                    transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1)',
                    opacity: expanded ? 1 : 0,
                    pointerEvents: expanded ? 'auto' : 'none',
                    marginTop: expanded ? 16 : 0,
                    background: '#181511',
                    borderRadius: 8,
                    boxShadow: expanded ? '0 2px 12px #C6A04F22' : 'none',
                    padding: expanded ? '16px 12px' : '0 12px',
                    color: '#fff',
                  }}
                >
                  {/* Modern compact details layout */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 8 }}>
                    <div><strong>Participants:</strong> {getParticipantsDisplay(match.participants, wrestlerMap, match.stipulation, match.matchType)}</div>
                    <div><strong>Winner:</strong> {(() => {
                      const winnerSlug = match.result && match.result.includes(' def. ')
                        ? match.result.split(' def. ')[0]
                        : (match.result || 'None');
                      return wrestlerMap && wrestlerMap[winnerSlug]
                        ? wrestlerMap[winnerSlug].name
                        : winnerSlug;
                    })()}</div>
                    <div><strong>Method:</strong> {match.method || 'None'}</div>
                    <div><strong>Time:</strong> {match.time || 'None'}</div>
                    <div><strong>Stipulation:</strong> {match.stipulation || 'None'}</div>
                    <div><strong>Title:</strong> {match.title || 'None'}</div>
                    <div><strong>Title Outcome:</strong> {match.titleOutcome || 'None'}</div>
                    {match.notes && <div style={{ flexBasis: '100%' }}><strong>Notes:</strong> {match.notes}</div>}
                  </div>
                  {/* Scrollable commentary section if available */}
                  {Array.isArray(match.commentary) && match.commentary.length > 0 && (
                    <div style={{ maxHeight: 160, overflowY: 'auto', background: '#232323', borderRadius: 6, padding: 8, marginTop: 8 }}>
                      <div style={{ color: gold, fontWeight: 700, marginBottom: 6 }}>Match Commentary</div>
                      {match.commentary.map((c, i) => (
                        <div key={i} style={{ color: '#fff', fontSize: 15, marginBottom: 4 }}>
                          <span style={{ color: '#bbb', fontSize: 13, marginRight: 6 }}>{formatCommentaryElapsedTime(c.timestamp, match.liveStart, match.commentary)}</span>
                          {c.text}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Edit Match Button */}
                  {user && (
                    <div style={{ marginTop: 12, textAlign: 'center' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditMatch(match, index);
                        }}
                        style={{
                          fontSize: 14,
                          padding: '8px 16px',
                          border: '1px solid #C6A04F',
                          borderRadius: 6,
                          background: '#C6A04F',
                          color: '#000',
                          cursor: 'pointer',
                          fontWeight: 600,
                          transition: 'all 0.2s',
                        }}
                        onMouseOver={e => {
                          e.currentTarget.style.background = '#D4B05F';
                          e.currentTarget.style.borderColor = '#D4B05F';
                        }}
                        onMouseOut={e => {
                          e.currentTarget.style.background = '#C6A04F';
                          e.currentTarget.style.borderColor = '#C6A04F';
                        }}
                      >
                        Edit Match
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {user && (
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
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
                if (window.confirm('Are you sure you want to delete this item?')) {
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
        )}
      </div>
    </div>
  );
}

// Add Event Form Component (separate forms for event and match)
function AddEvent({ addEvent, wrestlers }) {
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
    "WrestleMania night 2",
    "Wrestlepalooza"
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
    matchType: 'Singles Match', // Set default to Singles Match
    stipulation: 'None', // Set default to None
    customStipulation: '',
    title: '',
          titleOutcome: '',
      defendingChampion: '',
      notes: ''
    });
  const [specialWinnerType, setSpecialWinnerType] = useState("None");
  const [specialWinnerName, setSpecialWinnerName] = useState('');
  const navigate = useNavigate();
  const [resultType, setResultType] = useState('');
  const [winner, setWinner] = useState('');
  const [eventStatus, setEventStatus] = useState('completed'); // 'upcoming' or 'completed'
  const [numParticipants, setNumParticipants] = useState(10);
  const [brParticipants, setBrParticipants] = useState(Array(10).fill(''));
  const [brWinner, setBrWinner] = useState('');
  const [useVisualBuilder, setUseVisualBuilder] = useState(true); // Toggle for Visual Match Builder
  const [formResetKey, setFormResetKey] = useState(0); // Key to force VisualMatchBuilder re-render
  const [showVacancyForm, setShowVacancyForm] = useState(false);
  const [vacancyForm, setVacancyForm] = useState({
    title: '',
    previousChampion: '',
    reason: ''
  });

  // Winner options based on participants
  const winnerOptions = match.participants.includes(' vs ')
    ? match.participants.split(' vs ').map(side => side.trim()).filter(Boolean)
    : [];

  // Add a match to the matches list
  const handleAddMatch = (e) => {
    e.preventDefault();
    // --- Battle Royal branch ---
    if (match.stipulation === 'Battle Royal') {
      const brPart = brParticipants.filter(Boolean);
      const brWin = brWinner;
      let brResult = '';
      if (eventStatus === 'completed' && brWin && brPart.length >= 2) {
        const winnerName = wrestlers.find(w => w.id === brWin)?.name || brWin;
        brResult = `${winnerName} won the Battle Royal`;
      } else if (eventStatus === 'completed') {
        brResult = 'No winner';
      }
      setMatches([
        ...matches,
        { ...match, participants: brPart, winner: brWin, result: brResult, isLive: match.isLive || false }
      ]);
          setMatch({
      participants: '',
      result: '',
      method: '',
      time: '',
      matchType: 'Singles Match', // Reset to default
      stipulation: 'None', // Reset to default
      customStipulation: '',
      title: '',
      titleOutcome: '',
      defendingChampion: '',
      notes: '',
      isLive: false
    });
    setResultType('');
    setWinner('');
    setFormResetKey(prev => prev + 1); // Force VisualMatchBuilder re-render
      setNumParticipants(10);
      setBrParticipants(Array(10).fill(''));
      setBrWinner('');
      return;
    }
    // --- Default (non-Battle Royal) branch ---
    if (eventStatus === 'upcoming') {
      if (!match.participants) {
        alert('Please enter participants.');
        return;
      }
    } else if (eventStatus === 'live' || match.isLive) {
      if (!match.participants) {
        alert('Please enter participants.');
        return;
      }
    } else {
      if (!match.participants) {
        alert('Please enter participants.');
        return;
      }
      
      // For Gauntlet Matches, 2 out of 3 Falls, and War Games, validate special data instead of traditional fields
      if (match.matchType === 'Gauntlet Match' || match.matchType === '2 out of 3 Falls') {
        if (!match.gauntletProgression || match.gauntletProgression.length === 0) {
          const matchTypeText = match.matchType === 'Gauntlet Match' ? 'Gauntlet Match' : '2 out of 3 Falls';
          alert(`Please complete the ${matchTypeText} progression by selecting winners for each match`);
          return;
        }
        
        // Check that all matches have winners and methods
        const incompleteMatches = match.gauntletProgression.filter(prog => !prog.winner || !prog.method);
        if (incompleteMatches.length > 0) {
          const matchTypeText = match.matchType === 'Gauntlet Match' ? 'Gauntlet' : '2 out of 3 Falls';
          alert(`Please select a winner and method for each match in the ${matchTypeText}`);
          return;
        }
      } else if (match.matchType === '5-on-5 War Games Match') {
        // Validate War Games match data
        if (!match.warGamesData || !match.warGamesData.winningTeam || !match.warGamesData.pinSubmissionWinner || !match.warGamesData.method) {
          alert('Please complete the War Games match by selecting the winning team, who got the pin/submission, and the method.');
          return;
        }
      } else {
        // For non-Gauntlet matches, require traditional fields
        if (!resultType || (resultType === 'Winner' && !winner) || !match.method) {
          alert('Please fill out all required match fields.');
          return;
        }
      }
    }
    let finalStipulation = match.stipulation === "Custom/Other" 
      ? match.customStipulation
      : match.stipulation === "None" ? "" : match.stipulation;
    
    let result = '';
    if (eventStatus === 'completed') {
      if (match.matchType === '5-on-5 War Games Match' && match.warGamesData) {
        // Format War Games result with entry order and pin/submission winner
        const winningTeamNames = match.warGamesData.winningTeam === 1 
          ? match.warGamesData.team1Names.join(' & ')
          : match.warGamesData.team2Names.join(' & ');
        const losingTeamNames = match.warGamesData.winningTeam === 1 
          ? match.warGamesData.team2Names.join(' & ')
          : match.warGamesData.team1Names.join(' & ');
        const pinWinnerName = match.warGamesData.pinWinnerName || match.warGamesData.pinSubmissionWinner;
        
        // Format entry order
        let entryOrderText = '';
        if (match.warGamesData.entryOrder && Array.isArray(match.warGamesData.entryOrder) && match.warGamesData.entryOrder.length > 0) {
          // Sort entry order by entry number
          const sortedEntries = [...match.warGamesData.entryOrder].sort((a, b) => a.entryNumber - b.entryNumber);
          const entryNames = sortedEntries.map(entry => {
            const wrestler = wrestlers.find(w => w.id === entry.wrestler);
            return wrestler ? wrestler.name : entry.wrestler;
          });
          entryOrderText = ` [Entry Order: ${entryNames.join(' → ')}]`;
        }
        
        result = `${winningTeamNames} def. ${losingTeamNames} (${match.warGamesData.method} by ${pinWinnerName}${entryOrderText}${match.warGamesData.time ? `, ${match.warGamesData.time}` : ''})`;
      } else if ((match.matchType === 'Gauntlet Match' || match.matchType === '2 out of 3 Falls') && match.gauntletProgression) {
        // For Gauntlet Matches and 2 out of 3 Falls with progression data, format each match result
        const progressionResults = match.gauntletProgression
          .filter(prog => prog.winner && prog.method)
          .map(prog => {
            const winnerName = wrestlers.find(w => w.id === prog.winner)?.name || prog.winner;
            const participant1Name = wrestlers.find(w => w.id === prog.participant1)?.name || prog.participant1;
            const participant2Name = wrestlers.find(w => w.id === prog.participant2)?.name || prog.participant2;
            return `${winnerName} def. ${winnerName === participant1Name ? participant2Name : participant1Name} (${prog.method}${prog.time ? `, ${prog.time}` : ''})`;
          });
        result = progressionResults.join(' → ');
      } else if (resultType === 'Winner' && winner && winnerOptions.length >= 2) {
        if (match.matchType === 'Gauntlet Match') {
          // Fallback for Gauntlet Matches without progression data
          result = formatGauntletResult(match.participants, winner, wrestlers.reduce((map, w) => {
            map[w.id] = w;
            return map;
          }, {}));
        } else {
          const others = winnerOptions.filter(name => name !== winner);
          result = formatResult(winner, others);
        }
      } else if (resultType === 'No Winner') {
        // Handle matches with no winner (No Contest, Draw, etc.)
        result = match.method === 'No Contest' ? 'No Contest' : 'No winner';
      }
    }
    setMatches([
      ...matches,
      { ...match, isLive: match.isLive || false, result, stipulation: finalStipulation }
    ]);
    setMatch({
      participants: '',
      result: '',
      method: '',
      time: '',
      matchType: 'Singles Match', // Reset to default
      stipulation: 'None', // Reset to default
      customStipulation: '',
      title: '',
      titleOutcome: '',
      defendingChampion: '',
      notes: '',
      isLive: false
    });
    setResultType('');
    setWinner('');
    setFormResetKey(prev => prev + 1); // Force VisualMatchBuilder re-render
  };

  // Handle recording a title vacancy
  const handleRecordVacancy = (e) => {
    if (e) e.preventDefault();
    if (!vacancyForm.title || vacancyForm.title === 'None') {
      alert('Please select a championship title.');
      return;
    }
    if (!vacancyForm.previousChampion) {
      alert('Please enter the name of the wrestler who vacated the title.');
      return;
    }

    // Convert slug to name for display
    const championSlug = vacancyForm.previousChampion;
    const championName = wrestlers.find(w => w.id === championSlug)?.name || championSlug;

    // Create a minimal match entry for the vacancy
    // Note: For vacancy matches, we store the champion's NAME in participants field
    // because the SQL function expects the name (not slug) to store as previous_champion
    const vacancyMatch = {
      participants: championName, // Store name because SQL uses this directly as previous_champion name
      result: `${championName} vacated the ${vacancyForm.title}${vacancyForm.reason ? ` (${vacancyForm.reason})` : ''}`,
      method: 'Vacated',
      time: '',
      matchType: 'Singles Match',
      stipulation: 'None',
      customStipulation: '',
      title: vacancyForm.title,
      titleOutcome: 'Vacant',
      defendingChampion: championSlug,
      notes: vacancyForm.reason ? `Vacated due to: ${vacancyForm.reason}` : '',
      status: 'completed',
      isLive: false,
      order: matches.length + 1
    };

    console.log('Adding vacancy match:', vacancyMatch);
    console.log('Current matches before:', matches);
    const updatedMatches = [...matches, vacancyMatch];
    console.log('Updated matches:', updatedMatches);
    setMatches(updatedMatches);
    
    // Reset form
    setVacancyForm({
      title: '',
      previousChampion: '',
      reason: ''
    });
    setShowVacancyForm(false);
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
      const invalidMatch = Array.isArray(matches) && matches.some(m => !m.participants || !m.method || !m.result);
      if (invalidMatch) {
        alert('Please fill out all required match fields for completed events.');
        return;
      }
    }
    const id = eventType.toLowerCase().replace(/\s+/g, '-') + '-' + date.replace(/[^0-9]/g, '') + '-' + Date.now();
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>Add Matches</h3>
            <button
              type="button"
              onClick={() => setShowVacancyForm(!showVacancyForm)}
              style={{
                background: showVacancyForm ? '#C6A04F' : '#444',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                padding: '8px 16px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 14
              }}
            >
              {showVacancyForm ? 'Cancel' : 'Record Title Vacancy'}
            </button>
          </div>
          {showVacancyForm && (
            <div style={{ border: '1px solid #C6A04F', padding: 16, marginBottom: 16, borderRadius: 8, background: '#222' }}>
              <h4 style={{ color: '#C6A04F', marginTop: 0, marginBottom: 16 }}>Record Title Vacancy</h4>
              <div style={{ marginBottom: 12 }}>
                <label style={{ color: '#fff', display: 'block', marginBottom: 4, fontWeight: 500 }}>
                  Championship Title: *
                </label>
                <select
                  value={vacancyForm.title}
                  onChange={e => setVacancyForm({ ...vacancyForm, title: e.target.value })}
                  style={inputStyle}
                  required
                >
                  <option value="">Select championship...</option>
                  {TITLE_OPTIONS.filter(opt => opt !== 'None').map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ color: '#fff', display: 'block', marginBottom: 4, fontWeight: 500 }}>
                  Previous Champion (who vacated): *
                </label>
                <WrestlerAutocomplete
                  wrestlers={wrestlers}
                  value={vacancyForm.previousChampion}
                  onChange={val => setVacancyForm({ ...vacancyForm, previousChampion: val })}
                  placeholder="Enter wrestler name..."
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ color: '#fff', display: 'block', marginBottom: 4, fontWeight: 500 }}>
                  Reason (optional):
                </label>
                <input
                  type="text"
                  value={vacancyForm.reason}
                  onChange={e => setVacancyForm({ ...vacancyForm, reason: e.target.value })}
                  placeholder="e.g., injury, medical reasons, etc."
                  style={inputStyle}
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={handleRecordVacancy}
                  style={{
                    background: '#C6A04F',
                    color: '#232323',
                    border: 'none',
                    borderRadius: 4,
                    padding: '10px 20px',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: 14
                  }}
                >
                  Record Vacancy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowVacancyForm(false);
                    setVacancyForm({ title: '', previousChampion: '', reason: '' });
                  }}
                  style={{
                    background: '#666',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    padding: '10px 20px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 14
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
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
          {/* Live Match Checkbox always visible */}
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
          <div>
            <label>
              Match Type:<br />
              <select
                value={match.matchType}
                onChange={e => setMatch({ ...match, matchType: e.target.value })}
                style={inputStyle}
              >
                {MATCH_TYPE_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <label>
              Stipulation:<br />
              <select
                value={match.stipulation}
                onChange={e => setMatch({ ...match, stipulation: e.target.value, customStipulation: '' })}
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
          {match.matchType === 'Battle Royal' ? (
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
              {brParticipants.map((slug, i) => (
                <WrestlerAutocomplete
                  key={i}
                  wrestlers={wrestlers}
                  value={slug}
                  onChange={val => setBrParticipants(prev => prev.map((s, idx) => idx === i ? val : s))}
                  placeholder={`Participant ${i+1}`}
                />
              ))}
              <div>
                <label style={{ color: gold, fontWeight: 600 }}>Winner:</label>
                <select value={brWinner} onChange={e => setBrWinner(e.target.value)} style={inputStyle} 
                  required={eventStatus === 'completed'}>
                  <option value="">Select winner</option>
                  {brParticipants.filter(Boolean).map((slug, i) => (
                    <option key={i} value={slug}>{wrestlers.find(w => w.id === slug)?.name || slug}</option>
                  ))}
                </select>
              </div>
            </>
          ) : (match.matchType === '5-on-5 War Games Match' || match.matchType?.includes('War Games')) ? (
            // War Games matches always use the WarGamesMatchBuilder (has entry order and result tracking)
            // Ignore the Visual Builder toggle for War Games matches
            <WarGamesMatchBuilder
              key={`war-games-${match.matchType}`}
              wrestlers={wrestlers}
              value={match.participants}
              onChange={value => {
                console.log('WarGamesMatchBuilder onChange called with value:', value);
                const newMatch = { ...match, participants: value };
                setMatch(newMatch);
              }}
              onResultChange={warGamesResult => {
                console.log('War Games result:', warGamesResult);
                // Store the war games data
                setMatch(prev => ({
                  ...prev,
                  warGamesData: warGamesResult,
                  winner: warGamesResult.winningTeam === 1 ? warGamesResult.team1Names.join(' & ') : warGamesResult.team2Names.join(' & '),
                  method: warGamesResult.method,
                  time: warGamesResult.time
                }));
              }}
            />
          ) : (
            <>
              {/* Participant Input Toggle - Hidden for War Games matches */}
              {match.matchType !== '5-on-5 War Games Match' && (
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
              )}

              {useVisualBuilder && match.matchType !== '5-on-5 War Games Match' && !match.matchType?.includes('War Games') ? (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ color: gold, fontWeight: 600, marginBottom: 8, display: 'block' }}>
                    Participants (Visual Builder):
                  </label>
                  {match.matchType === 'Gauntlet Match' ? (
                    <GauntletMatchBuilder
                      wrestlers={wrestlers}
                      value={match.participants}
                      onChange={value => {
                        console.log('GauntletMatchBuilder onChange called with value:', value);
                        const newMatch = { ...match, participants: value };
                        setMatch(newMatch);
                      }}
                      onResultChange={gauntletResult => {
                        console.log('Gauntlet result:', gauntletResult);
                        // Store the gauntlet progression data
                        setMatch(prev => ({
                          ...prev,
                          gauntletProgression: gauntletResult.progression,
                          winner: gauntletResult.winner
                        }));
                      }}
                    />
                  ) : match.matchType === '2 out of 3 Falls' ? (
                    <TwoOutOfThreeFallsBuilder
                      wrestlers={wrestlers}
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
                      key={formResetKey}
                      wrestlers={wrestlers}
                      value={match.participants}
                      onChange={value => {
                        console.log('VisualMatchBuilder onChange called with value:', value);
                        console.log('Current match state:', match);
                        const newMatch = { ...match, participants: value };
                        console.log('New match state will be:', newMatch);
                        setMatch(newMatch);
                      }}
                      maxParticipants={30}
                      initialStructure={getMatchStructureFromMatchType(match.matchType)}
                      isTitleMatch={match.title && match.title !== 'None' && match.stipulation !== 'No. 1 Contender Match'}
                      defendingChampion={match.defendingChampion || null}
                      onDefendingChampionChange={(champion) => {
                        setMatch({ ...match, defendingChampion: champion || '' });
                      }}
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
          {match.title && match.title !== 'None' && match.stipulation !== 'No. 1 Contender Match' && (
            <div style={{ fontSize: 12, color: '#C6A04F', marginTop: 4, marginBottom: 16, fontStyle: 'italic' }}>
              💡 <strong>Tip:</strong> Click the "C" button next to a participant in the visual builder above to mark them as the defending champion.
            </div>
          )}
          <button type="submit" style={{ marginTop: 8 }}>Add Match</button>
        </form>
        <button
          type="button"
          style={{ marginTop: 24 }}
          disabled={
            !eventType || !date || !location || matches.length === 0 ||
            (eventStatus === 'completed' && Array.isArray(matches) && matches.some(m => !m.participants || !m.method || !m.result))
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
function EditEvent({ events, updateEvent, wrestlers }) {
  const user = useUser();
  const { eventId } = useParams();
  const event = events.find(e => e.id === eventId);
  const navigate = useNavigate();

  if (!event) {
    return <div style={{ padding: 24 }}>Event not found.</div>;
  }

  const [name, setName] = useState(event.name);
  const [date, setDate] = useState(event.date);
  const [location, setLocation] = useState(event.location);
  const [matches, setMatches] = useState(Array.isArray(event.matches) ? event.matches : []);
  
  // Debug: Log matches changes
  useEffect(() => {
    console.log('Matches state updated:', matches);
  }, [matches]);
  const [match, setMatch] = useState({
    participants: '',
    result: '',
    method: '',
    time: '',
    matchType: 'Singles Match', // Set default to Singles Match
    stipulation: 'None', // Set default to None
    customStipulationType: '',
    customStipulation: '',
    title: '',
          titleOutcome: '',
      defendingChampion: '',
      notes: ''
    });
  const [resultType, setResultType] = useState('');
  const [winner, setWinner] = useState('');
  const [eventStatus, setEventStatus] = useState(event.status || 'completed');
  const [editingMatchIdx, setEditingMatchIdx] = useState(null);
  const [expanded, setExpanded] = React.useState(false);
  const [numParticipants, setNumParticipants] = useState(10);
  const [brParticipants, setBrParticipants] = useState(Array(10).fill(''));
  const [brWinner, setBrWinner] = useState('');
  const [useVisualBuilder, setUseVisualBuilder] = useState(true); // Toggle for Visual Match Builder
  const [formResetKey, setFormResetKey] = useState(0); // Key to force VisualMatchBuilder re-render
  const [showVacancyForm, setShowVacancyForm] = useState(false);
  const [vacancyForm, setVacancyForm] = useState({
    title: '',
    previousChampion: '',
    reason: ''
  });

  // Winner options based on participants
  const winnerOptions = match.participants.includes(' vs ')
    ? match.participants.split(' vs ').map(side => side.trim()).filter(Boolean)
    : [];

  // Add a match to the matches list
  const handleAddMatch = (e) => {
    e.preventDefault();
    // --- Battle Royal branch ---
    if (match.stipulation === 'Battle Royal') {
      const brPart = brParticipants.filter(Boolean);
      const brWin = brWinner;
      let brResult = '';
      if (eventStatus === 'completed' && brWin && brPart.length >= 2) {
        const winnerName = wrestlers.find(w => w.id === brWin)?.name || brWin;
        brResult = `${winnerName} won the Battle Royal`;
      } else if (eventStatus === 'completed') {
        brResult = 'No winner';
      }
      setMatches([
        ...matches,
        { ...match, participants: brPart, winner: brWin, result: brResult, isLive: match.isLive || false, order: matches.length + 1 }
      ]);
      setMatch({
        participants: '',
        result: '',
        method: '',
        time: '',
        matchType: 'Singles Match', // Reset to default
        stipulation: 'None', // Reset to default
        customStipulation: '',
        title: '',
        titleOutcome: '',
        defendingChampion: '',
        notes: '',
        isLive: false
      });
      setResultType('');
      setWinner('');
      setNumParticipants(10);
      setBrParticipants(Array(10).fill(''));
      setBrWinner('');
      return;
    }
    // --- Default (non-Battle Royal) branch ---
    let finalStipulation = match.stipulation === "Custom/Other"
      ? match.customStipulation
      : match.stipulation === "None" ? "" : match.stipulation;
    
    let result = '';
    if (eventStatus === 'completed' && resultType === 'Winner' && winner && winnerOptions.length >= 2) {
      if (match.matchType === 'Gauntlet Match') {
        // For Gauntlet Matches, we need to pass the wrestlerMap to format the progression
        result = formatGauntletResult(match.participants, winner, wrestlers.reduce((map, w) => {
          map[w.id] = w;
          return map;
        }, {}));
      } else {
        const others = winnerOptions.filter(name => name !== winner);
        result = formatResult(winner, others);
      }
    }
    setMatches([
      ...matches,
      { ...match, isLive: match.isLive || false, result, stipulation: finalStipulation }
    ]);
    setMatch({
      participants: '',
      result: '',
      method: '',
      time: '',
      matchType: 'Singles Match', // Reset to default
      stipulation: 'None', // Reset to default
      customStipulation: '',
      title: '',
      titleOutcome: '',
      defendingChampion: '',
      notes: '',
      isLive: false
    });
    setResultType('');
    setWinner('');
    setFormResetKey(prev => prev + 1); // Force VisualMatchBuilder re-render
  };

  // Handle recording a title vacancy
  const handleRecordVacancy = (e) => {
    if (e) e.preventDefault();
    if (!vacancyForm.title || vacancyForm.title === 'None') {
      alert('Please select a championship title.');
      return;
    }
    if (!vacancyForm.previousChampion) {
      alert('Please enter the name of the wrestler who vacated the title.');
      return;
    }

    // Convert slug to name for display
    const championSlug = vacancyForm.previousChampion;
    const championName = wrestlers.find(w => w.id === championSlug)?.name || championSlug;

    // Create a minimal match entry for the vacancy
    // Note: For vacancy matches, we store the champion's NAME in participants field
    // because the SQL function expects the name (not slug) to store as previous_champion
    const vacancyMatch = {
      participants: championName, // Store name because SQL uses this directly as previous_champion name
      result: `${championName} vacated the ${vacancyForm.title}${vacancyForm.reason ? ` (${vacancyForm.reason})` : ''}`,
      method: 'Vacated',
      time: '',
      matchType: 'Singles Match',
      stipulation: 'None',
      customStipulation: '',
      title: vacancyForm.title,
      titleOutcome: 'Vacant',
      defendingChampion: championSlug,
      notes: vacancyForm.reason ? `Vacated due to: ${vacancyForm.reason}` : '',
      status: 'completed',
      isLive: false,
      order: matches.length + 1
    };

    console.log('Adding vacancy match:', vacancyMatch);
    console.log('Current matches before:', matches);
    console.log('Matches is array?', Array.isArray(matches));
    console.log('Matches length:', matches?.length);
    
    // Ensure matches is an array
    const currentMatches = Array.isArray(matches) ? matches : [];
    const updatedMatches = [...currentMatches, vacancyMatch];
    
    console.log('Updated matches:', updatedMatches);
    console.log('Updated matches length:', updatedMatches.length);
    
    // Use functional update to ensure React detects the change
    setMatches(prevMatches => {
      const prev = Array.isArray(prevMatches) ? prevMatches : [];
      const newMatches = [...prev, vacancyMatch];
      console.log('setMatches callback - prev:', prev, 'new:', newMatches);
      return newMatches;
    });
    
    // Reset form
    setVacancyForm({
      title: '',
      previousChampion: '',
      reason: ''
    });
    setShowVacancyForm(false);
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
      status: eventStatus,
      isLive: eventStatus === 'live'
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>Matches</h3>
            <button
              type="button"
              onClick={() => setShowVacancyForm(!showVacancyForm)}
              style={{
                background: showVacancyForm ? '#C6A04F' : '#444',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                padding: '8px 16px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 14
              }}
            >
              {showVacancyForm ? 'Cancel' : 'Record Title Vacancy'}
            </button>
          </div>
          {showVacancyForm && (
            <div style={{ border: '1px solid #C6A04F', padding: 16, marginBottom: 16, borderRadius: 8, background: '#222' }}>
              <h4 style={{ color: '#C6A04F', marginTop: 0, marginBottom: 16 }}>Record Title Vacancy</h4>
              <div style={{ marginBottom: 12 }}>
                <label style={{ color: '#fff', display: 'block', marginBottom: 4, fontWeight: 500 }}>
                  Championship Title: *
                </label>
                <select
                  value={vacancyForm.title}
                  onChange={e => setVacancyForm({ ...vacancyForm, title: e.target.value })}
                  style={inputStyle}
                  required
                >
                  <option value="">Select championship...</option>
                  {TITLE_OPTIONS.filter(opt => opt !== 'None').map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ color: '#fff', display: 'block', marginBottom: 4, fontWeight: 500 }}>
                  Previous Champion (who vacated): *
                </label>
                <WrestlerAutocomplete
                  wrestlers={wrestlers}
                  value={vacancyForm.previousChampion}
                  onChange={val => setVacancyForm({ ...vacancyForm, previousChampion: val })}
                  placeholder="Enter wrestler name..."
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ color: '#fff', display: 'block', marginBottom: 4, fontWeight: 500 }}>
                  Reason (optional):
                </label>
                <input
                  type="text"
                  value={vacancyForm.reason}
                  onChange={e => setVacancyForm({ ...vacancyForm, reason: e.target.value })}
                  placeholder="e.g., injury, medical reasons, etc."
                  style={inputStyle}
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={handleRecordVacancy}
                  style={{
                    background: '#C6A04F',
                    color: '#232323',
                    border: 'none',
                    borderRadius: 4,
                    padding: '10px 20px',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: 14
                  }}
                >
                  Record Vacancy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowVacancyForm(false);
                    setVacancyForm({ title: '', previousChampion: '', reason: '' });
                  }}
                  style={{
                    background: '#666',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    padding: '10px 20px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 14
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {matches.length > 0 ? (
            <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {matches.map((m, idx) => {
                console.log('Rendering match:', idx, m);
                return (
                  <li key={m.order || idx} style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '8px 0', borderBottom: '1px solid #333' }}>
                  {editingMatchIdx === idx ? (
                    <div style={{ flex: 1, width: '100%' }}>
                      <MatchEdit
                        initialMatch={m}
                        eventStatus={eventStatus}
                        eventDate={date}
                        onSave={updatedMatch => {
                          const updated = [...matches];
                          updated[idx] = updatedMatch;
                          setMatches(updated);
                          setEditingMatchIdx(null);
                        }}
                        onCancel={() => setEditingMatchIdx(null)}
                        wrestlers={wrestlers}
                      />
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setEditingMatchIdx(idx)}
                        style={{
                          background: '#4a90e2',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 4,
                          fontWeight: 700,
                          fontSize: 16,
                          width: 56,
                          height: 36,
                          marginRight: 10,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        aria-label="Edit Match"
                      >
                        Edit
                      </button>
                      <span style={{ flex: 1, fontWeight: 700, color: '#fff', fontSize: 17 }}>{m.participants}</span>
                      <span style={{ flex: 2, color: '#bbb', fontSize: 15, marginLeft: 12 }}>{m.result} {m.stipulation && m.stipulation !== 'None' ? `(${m.stipulation})` : ''}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 16 }}>
                        <button
                          type="button"
                          onClick={() => {
                            if (idx === 0) return;
                            const updated = [...matches];
                            [updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]];
                            updated.forEach((match, i) => { match.order = i + 1; });
                            setMatches(updated);
                          }}
                          style={{
                            background: '#C6A04F',
                            color: '#232323',
                            border: 'none',
                            borderRadius: 4,
                            fontWeight: 700,
                            fontSize: 22,
                            width: 36,
                            height: 36,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: idx === 0 ? 0.3 : 1,
                            cursor: idx === 0 ? 'not-allowed' : 'pointer',
                            marginRight: 2
                          }}
                          disabled={idx === 0}
                          aria-label="Move Up"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (idx === matches.length - 1) return;
                            const updated = [...matches];
                            [updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]];
                            updated.forEach((match, i) => { match.order = i + 1; });
                            setMatches(updated);
                          }}
                          style={{
                            background: '#C6A04F',
                            color: '#232323',
                            border: 'none',
                            borderRadius: 4,
                            fontWeight: 700,
                            fontSize: 22,
                            width: 36,
                            height: 36,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: idx === matches.length - 1 ? 0.3 : 1,
                            cursor: idx === matches.length - 1 ? 'not-allowed' : 'pointer',
                            marginRight: 10
                          }}
                          disabled={idx === matches.length - 1}
                          aria-label="Move Down"
                        >
                          ↓
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (!window.confirm('Are you sure you want to delete this item?')) return;
                          const updatedMatches = matches.filter(match => match.order !== m.order);
                          updatedMatches.forEach((match, idx) => {
                            match.order = idx + 1;
                          });
                          setMatches(updatedMatches);
                        }}
                        style={{
                          background: '#b02a37',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 4,
                          fontWeight: 700,
                          fontSize: 18,
                          width: 36,
                          height: 36,
                          marginLeft: 18,
                          opacity: 0.85,
                          transition: 'opacity 0.2s',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        aria-label="Delete"
                      >
                        ×
                      </button>
                    </>
                  )}
                  </li>
                );
              })}
            </ol>
          ) : (
            <p style={{ color: '#bbb', marginTop: 16 }}>No matches yet. Add matches or record a title vacancy.</p>
          )}
        </form>
        {user && (
          <form onSubmit={handleAddMatch} style={{ border: '1px solid #ccc', padding: 12, marginTop: 12 }}>
            {/* Live Match Checkbox always visible */}
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
            <div>
              <label>
                Match Type:<br />
                <select
                  value={match.matchType}
                  onChange={e => setMatch({ ...match, matchType: e.target.value })}
                  style={inputStyle}
                >
                  {MATCH_TYPE_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </label>
            </div>

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
            {match.title && match.title !== 'None' && (
              <div style={{ marginTop: 12, marginBottom: 12, padding: 12, background: '#2a2a2a', borderRadius: 4, border: '1px solid #C6A04F' }}>
                <div style={{ color: '#C6A04F', fontWeight: 600, marginBottom: 8 }}>Title Vacancy Option</div>
                <button
                  type="button"
                  onClick={() => {
                    setShowVacancyForm(true);
                    setVacancyForm({
                      title: match.title,
                      previousChampion: '',
                      reason: ''
                    });
                  }}
                  style={{
                    background: '#C6A04F',
                    color: '#232323',
                    border: 'none',
                    borderRadius: 4,
                    padding: '8px 16px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 14
                  }}
                >
                  Record Title Vacancy Instead
                </button>
              </div>
            )}
            {match.stipulation === 'Battle Royal' ? (
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
                {brParticipants.map((slug, i) => (
                  <WrestlerAutocomplete
                    key={i}
                    wrestlers={wrestlers}
                    value={slug}
                    onChange={val => setBrParticipants(prev => prev.map((s, idx) => idx === i ? val : s))}
                    placeholder={`Participant ${i+1}`}
                  />
                ))}
                <div>
                  <label style={{ color: gold, fontWeight: 600 }}>Winner:</label>
                  <select value={brWinner} onChange={e => setBrWinner(e.target.value)} style={inputStyle} 
                    required={eventStatus === 'completed'}>
                    <option value="">Select winner</option>
                    {brParticipants.filter(Boolean).map((slug, i) => (
                      <option key={i} value={slug}>{wrestlers.find(w => w.id === slug)?.name || slug}</option>
                    ))}
                  </select>
                </div>
              </>
            ) : (match.matchType === '5-on-5 War Games Match' || match.matchType?.includes('War Games')) ? (
              // War Games matches always use the WarGamesMatchBuilder (has entry order and result tracking)
              <WarGamesMatchBuilder
                key={`war-games-edit-${match.matchType}`}
                wrestlers={wrestlers}
                value={match.participants}
                onChange={value => {
                  console.log('WarGamesMatchBuilder onChange called with value:', value);
                  const newMatch = { ...match, participants: value };
                  setMatch(newMatch);
                }}
                onResultChange={warGamesResult => {
                  console.log('War Games result:', warGamesResult);
                  // Store the war games data
                  setMatch(prev => ({
                    ...prev,
                    warGamesData: warGamesResult,
                    winner: warGamesResult.winningTeam === 1 ? warGamesResult.team1Names.join(' & ') : warGamesResult.team2Names.join(' & '),
                    method: warGamesResult.method,
                    time: warGamesResult.time
                  }));
                }}
              />
            ) : (
              <>
                {/* Participant Input Toggle - Hidden for War Games matches */}
                {match.matchType !== '5-on-5 War Games Match' && !match.matchType?.includes('War Games') && (
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
                )}

                {useVisualBuilder && match.matchType !== '5-on-5 War Games Match' && !match.matchType?.includes('War Games') ? (
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ color: gold, fontWeight: 600, marginBottom: 8, display: 'block' }}>
                      Participants (Visual Builder):
                    </label>
                    {match.matchType === 'Gauntlet Match' ? (
                      <GauntletMatchBuilder
                        wrestlers={wrestlers}
                        value={match.participants}
                        onChange={value => {
                          console.log('GauntletMatchBuilder onChange called with value:', value);
                          const newMatch = { ...match, participants: value };
                          setMatch(newMatch);
                        }}
                        onResultChange={gauntletResult => {
                          console.log('Gauntlet result:', gauntletResult);
                          setMatch(prev => ({
                            ...prev,
                            gauntletProgression: gauntletResult.progression,
                            winner: gauntletResult.winner
                          }));
                        }}
                      />
                    ) : match.matchType === '2 out of 3 Falls' ? (
                      <TwoOutOfThreeFallsBuilder
                        wrestlers={wrestlers}
                        value={match.participants}
                        onChange={value => {
                          console.log('TwoOutOfThreeFallsBuilder onChange called with value:', value);
                          const newMatch = { ...match, participants: value };
                          setMatch(newMatch);
                        }}
                        onResultChange={fallsResult => {
                          console.log('2 out of 3 Falls result:', fallsResult);
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
                        key={formResetKey}
                        wrestlers={wrestlers}
                        value={match.participants}
                        onChange={value => {
                          console.log('VisualMatchBuilder onChange called with value:', value);
                          console.log('Current match state:', match);
                          const newMatch = { ...match, participants: value };
                          console.log('New match state will be:', newMatch);
                          setMatch(newMatch);
                        }}
                        maxParticipants={30}
                        initialStructure={getMatchStructureFromMatchType(match.matchType)}
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
            {match.title && match.title !== 'None' && match.stipulation !== 'No. 1 Contender Match' && (
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>
                  Defending Champion:
                </label>
                <select
                  value={match.defendingChampion || ""}
                  onChange={e => setMatch({ ...match, defendingChampion: e.target.value })}
                  style={inputStyle}
                >
                  <option value="">Select defending champion...</option>
                  {(() => {
                    // Extract participant options from match.participants
                    const participantOptions = [];
                    if (typeof match.participants === 'string' && match.participants.includes(' vs ')) {
                      const sides = match.participants.split(' vs ').map(s => s.trim());
                      sides.forEach(side => {
                        const teamMatch = side.match(/^([^(]+)\s*\(([^)]+)\)$/);
                        if (teamMatch) {
                          // Tag team with name - use team name
                          participantOptions.push(teamMatch[1].trim());
                        } else {
                          // Individual or team without name - use the side as-is
                          participantOptions.push(side);
                        }
                      });
                    } else if (Array.isArray(match.participants)) {
                      // Array format - use each element
                      match.participants.forEach(participant => {
                        if (typeof participant === 'string') {
                          const teamMatch = participant.match(/^([^(]+)\s*\(([^)]+)\)$/);
                          if (teamMatch) {
                            participantOptions.push(teamMatch[1].trim());
                          } else {
                            participantOptions.push(participant);
                          }
                        }
                      });
                    }
                    return participantOptions.map((opt, idx) => (
                      <option key={idx} value={opt}>{opt}</option>
                    ));
                  })()}
                </select>
                <div style={{ fontSize: 12, color: '#bbb', marginTop: 4 }}>
                  Select who entered the match as the defending champion. This helps determine who shows the belt when "Champion Retains" is selected.
                </div>
              </div>
            )}
            {match.title && match.title !== 'None' && (
              <div style={{ marginTop: 12, marginBottom: 12, padding: 12, background: '#2a2a2a', borderRadius: 4, border: '1px solid #C6A04F' }}>
                <div style={{ color: '#C6A04F', fontWeight: 600, marginBottom: 8 }}>Title Vacancy Option</div>
                <button
                  type="button"
                  onClick={() => {
                    setShowVacancyForm(true);
                    setVacancyForm({
                      title: match.title,
                      previousChampion: '',
                      reason: ''
                    });
                  }}
                  style={{
                    background: '#C6A04F',
                    color: '#232323',
                    border: 'none',
                    borderRadius: 4,
                    padding: '8px 16px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 14
                  }}
                >
                  Record Title Vacancy Instead
                </button>
              </div>
            )}
            <button type="submit" style={{ marginTop: 8 }}>Add Match</button>
          </form>
        )}
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
  const [wrestlers, setWrestlers] = useState([]);
  const [wrestlerMap, setWrestlerMap] = useState({});

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
      
      // Only send allowed fields to Supabase
      const allowedFields = ['id', 'name', 'date', 'location', 'matches', 'status', 'isLive'];
      const sanitizedEvent = {};
      for (const key of allowedFields) {
        if (event[key] !== undefined) sanitizedEvent[key] = event[key];
      }
      
      // Include specialWinner if it exists
      if (event.specialWinner !== undefined) {
        sanitizedEvent.specialWinner = event.specialWinner;
      }
      
      const { error } = await supabase
        .from('events')
        .insert([sanitizedEvent]);

      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }

      console.log('Successfully added event');
      // Update local state with the full event data (always include promos in local state)
      setEvents([event, ...events]);
    } catch (error) {
      console.error('Error adding event:', error);
      alert(`Failed to add event: ${error.message || 'Please try again.'}`);
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
      // Only send allowed fields to Supabase
      const allowedFields = ['id', 'name', 'date', 'location', 'matches', 'status', 'isLive'];
      const sanitizedEvent = {};
      for (const key of allowedFields) {
        if (updatedEvent[key] !== undefined) sanitizedEvent[key] = updatedEvent[key];
      }
      
      // Keep titleOutcome in the matches data but not as a top-level field
      // This prevents any database triggers from trying to access championship tables
      console.log('Sanitized event for update:', sanitizedEvent);
      const { error } = await supabase
        .from('events')
        .update(sanitizedEvent)
        .eq('id', updatedEvent.id);

      if (error) {
        console.error('Supabase update error details:', error);
        throw error;
      }
      
      // Update local state with the sanitized event data (always include promos in local state)
      setEvents(events.map(e => e.id === updatedEvent.id ? { ...e, ...updatedEvent } : e));
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

  // New function for real-time commentary updates (doesn't save to database immediately)
  const handleRealTimeCommentaryUpdate = (eventId, matchOrder, updatedMatch) => {
    console.log('Real-time commentary update for match', matchOrder, 'in event', eventId);
    setEvents(events.map(event => 
      event.id === eventId 
        ? { 
            ...event, 
            matches: event.matches.map(match => 
              String(match.order) === String(matchOrder) ? updatedMatch : match
            )
          }
        : event
    ));
  };



  useEffect(() => {
    async function fetchWrestlers() {
      const { data } = await supabase.from('wrestlers').select('*');
      setWrestlers(data);
      const map = {};
      data.forEach(w => { map[w.id] = w; }); // Revert to using id as key
      console.log('Wrestler map keys:', Object.keys(map)); // Debug log
      setWrestlerMap(map);
    }
    fetchWrestlers();
  }, []);

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
    <>
      <Helmet>
        <title>Wrestling Boxscore - WWE Event Results, Match Cards, and More</title>
        <meta name="description" content="Get up-to-date WWE event results, match cards, wrestler stats, and more. Fast, mobile-friendly, and always current." />
        <meta name="keywords" content="WWE, wrestling, event results, match cards, wrestlers, SmackDown, RAW, NXT, pay-per-view, championship, live results, wrestling stats, WWE news" />
        <link rel="canonical" href="https://wrestlingboxscore.com/" />
        {/* Open Graph and Twitter tags as above */}
      </Helmet>
      <Router>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<EventList events={events} />} />
            <Route path="/event/:eventId" element={<EventBoxScore events={events} onDelete={deleteEvent} onEditMatch={handleEditMatch} onRealTimeCommentaryUpdate={handleRealTimeCommentaryUpdate} wrestlerMap={wrestlerMap} wrestlers={wrestlers} />} />
            <Route path="/event/:eventId/match/:matchOrder" element={<MatchPageNewWrapper events={events} onEditMatch={handleEditMatch} onRealTimeCommentaryUpdate={handleRealTimeCommentaryUpdate} wrestlerMap={wrestlerMap} wrestlers={wrestlers} />} />
            <Route path="/add-event" element={<AddEvent addEvent={addEvent} wrestlers={wrestlers} />} />
            <Route path="/edit-event/:eventId" element={<EditEvent events={events} updateEvent={updateEvent} wrestlers={wrestlers} />} />
            <Route path="/wrestlers" element={<WrestlersPage wrestlers={wrestlers} />} />
                <Route path="/championships" element={<ChampionshipsPage wrestlers={wrestlers} />} />
            <Route path="/participant-demo" element={<ParticipantSelectionDemo wrestlers={wrestlers} />} />
            <Route path="/about" element={<><Helmet><title>About Wrestling Boxscore</title><meta name="description" content="Learn about Wrestling Boxscore, our mission, and how we deliver fast, accurate WWE results for fans." /><link rel="canonical" href="https://wrestlingboxscore.com/about" /></Helmet><div style={{color:'#fff',padding:40,maxWidth:900,margin:'0 auto'}}><h2>About Us</h2><p>Wrestling Boxscore delivers fast, match-by-match WWE results for fans on the move. Can't watch Raw, SmackDown, or a premium live event in real time? We break down every match, winner, and key moment—so you're always in the know, no matter where you are.</p></div></>} />
            <Route path="/contact" element={<><Helmet><title>Contact Wrestling Boxscore</title><meta name="description" content="Contact Wrestling Boxscore with questions, suggestions, or collaboration requests. Email: wrestlingboxscore@gmail.com" /><link rel="canonical" href="https://wrestlingboxscore.com/contact" /></Helmet><div style={{color:'#fff',padding:40,maxWidth:900,margin:'0 auto'}}><h2>Contact</h2><p>Please contact us with questions, suggestions, corrections, or if you would like to collaborate or contribute to the site. Our e-mail is <a href="mailto:wrestlingboxscore@gmail.com" style={{color:'#C6A04F',textDecoration:'underline'}}>wrestlingboxscore@gmail.com</a></p></div></>} />
            <Route path="/privacy" element={<div style={{color:'#fff',padding:40,maxWidth:900,margin:'0 auto'}}><h2>Privacy Policy</h2><p>This site does not collect personal information except what you provide via the contact form. Your information will never be sold or shared. For questions, contact wrestlingboxscore@gmail.com.</p></div>} />
          </Route>
        </Routes>
      </Router>
    </>
  );
}

export default App;

// Improved helper to parse a team string for all cases
function parseTeamString(teamStr) {
  // Team name with slugs in parentheses
  const tagTeamMatch = teamStr.match(/^([^(]+)\s*\(([^)]+)\)$/);
  if (tagTeamMatch) {
    const teamName = tagTeamMatch[1].trim();
    const slugs = tagTeamMatch[2].split('&').map(s => s.trim()).filter(Boolean);
    return { teamName, slugs };
  }
  // Just slugs (tag or singles)
  const slugs = teamStr.split('&').map(s => s.trim()).filter(Boolean);
  return { teamName: null, slugs };
}

// Wrapper component for the new match page design
function MatchPageNewWrapper({ events, onEditMatch, onRealTimeCommentaryUpdate, wrestlerMap, wrestlers }) {
  const user = useUser();
  const { eventId, matchOrder } = useParams();
  const event = events.find(e => e.id === eventId);
  const matchIndex = event ? event.matches.findIndex(m => String(m.order) === String(matchOrder)) : -1;
  const match = event && matchIndex !== -1 ? event.matches[matchIndex] : null;
  const [isEditing, setIsEditing] = React.useState(false);

  if (!event || !match) {
    return <div style={{ padding: 24 }}>Match not found.</div>;
  }

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = (updatedMatch) => {
    const updatedMatches = [...event.matches];
    updatedMatches[matchIndex] = updatedMatch;
    onEditMatch(event.id, updatedMatches);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div style={{ background: '#181511', minHeight: '100vh', padding: 24 }}>
        <Link to={`/event/${event.id}`} style={{ color: '#C6A04F' }}>← Back to Event</Link>
        <h2 style={{ color: '#C6A04F', marginTop: 24 }}>Edit Match</h2>
        {user && (
          <MatchEdit
            initialMatch={match}
            eventStatus={event.status}
            eventDate={event.date}
            onSave={handleSave}
            onCancel={handleCancel}
            onRealTimeCommentaryUpdate={onRealTimeCommentaryUpdate}
            eventId={event.id}
            matchOrder={match.order}
            wrestlers={wrestlers}
          />
        )}
      </div>
    );
  }

  return (
    <MatchPageNew 
      match={{ ...match, eventId: event.id }} 
      wrestlers={wrestlers} 
      onEdit={handleEdit}
      wrestlerMap={wrestlerMap}
    />
  );
}

// Function to get match structure based on match type
const getMatchStructureFromMatchType = (matchType) => {
  switch (matchType) {
    case 'Singles Match':
      return [
        { type: 'individual', participants: [''] },
        { type: 'individual', participants: [''] }
      ];
    case 'Tag Team':
      return [
        { type: 'team', participants: ['', ''], name: '' },
        { type: 'team', participants: ['', ''], name: '' }
      ];
    case '3-way Tag Team':
      return [
        { type: 'team', participants: ['', ''], name: '' },
        { type: 'team', participants: ['', ''], name: '' },
        { type: 'team', participants: ['', ''], name: '' }
      ];
    case '4-way Tag Team':
      return [
        { type: 'team', participants: ['', ''], name: '' },
        { type: 'team', participants: ['', ''], name: '' },
        { type: 'team', participants: ['', ''], name: '' },
        { type: 'team', participants: ['', ''], name: '' }
      ];
    case '6-team Tag Team':
      return [
        { type: 'team', participants: ['', ''], name: '' },
        { type: 'team', participants: ['', ''], name: '' },
        { type: 'team', participants: ['', ''], name: '' },
        { type: 'team', participants: ['', ''], name: '' },
        { type: 'team', participants: ['', ''], name: '' },
        { type: 'team', participants: ['', ''], name: '' }
      ];
    case '6-person Tag Team':
      return [
        { type: 'team', participants: ['', '', ''], name: '' },
        { type: 'team', participants: ['', '', ''], name: '' }
      ];
    case '8-person Tag Team':
      return [
        { type: 'team', participants: ['', '', '', ''], name: '' },
        { type: 'team', participants: ['', '', '', ''], name: '' }
      ];
    case 'Fatal Four-way match':
      return [
        { type: 'individual', participants: [''] },
        { type: 'individual', participants: [''] },
        { type: 'individual', participants: [''] },
        { type: 'individual', participants: [''] }
      ];
    case 'Triple Threat match':
      return [
        { type: 'individual', participants: [''] },
        { type: 'individual', participants: [''] },
        { type: 'individual', participants: [''] }
      ];
    case 'Gauntlet Match':
      // Gauntlet Match: multiple individual participants (starting with 5)
      return [
        { type: 'individual', participants: [''] },
        { type: 'individual', participants: [''] },
        { type: 'individual', participants: [''] },
        { type: 'individual', participants: [''] },
        { type: 'individual', participants: [''] }
      ];
    case '2 out of 3 Falls':
      // 2 out of 3 Falls: 2 individual participants who wrestle multiple falls
      return [
        { type: 'individual', participants: [''] },
        { type: 'individual', participants: [''] }
      ];
    case '5-on-5 War Games Match':
      // War Games: 2 teams with 5 participants each
      return [
        { type: 'team', participants: ['', '', '', '', ''], name: '' },
        { type: 'team', participants: ['', '', '', '', ''], name: '' }
      ];
    case 'Battle Royal':
      // Battle Royal uses separate interface, so return null
      return null;
    default:
      // For stipulations like "Hell in a Cell", "Bakersfield Brawl", etc.
      // Return null to let user build manually
      return null;
  }
};