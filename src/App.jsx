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
import WrestlerAutocomplete from './components/WrestlerAutocomplete';
import ParticipantSelectionDemo from './components/ParticipantSelectionDemo';
import VisualMatchBuilder from './components/VisualMatchBuilder';
import GauntletMatchBuilder from './components/GauntletMatchBuilder';
import TwoOutOfThreeFallsBuilder from './components/TwoOutOfThreeFallsBuilder';
import WarGamesMatchBuilder from './components/WarGamesMatchBuilder';
import SurvivorSeriesMatchBuilder from './components/SurvivorSeriesMatchBuilder';
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
  'Title Vacated',
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

// Event List helpers
// An event is considered "upcoming" if its date is in the future (strictly after today).
// Events on today's date (or earlier) are treated as completed so they appear in the
// Completed tab with a "(results pending)" tag until results are entered.
function isUpcomingEST(event) {
  if (!event?.date) return false;

  const [year, month, day] = event.date.split('-').map(Number);
  const eventDate = new Date(year, month - 1, day);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return eventDate > today;
}

function isTodayEvent(event) {
  if (!event?.date) return false;
  const [year, month, day] = event.date.split('-').map(Number);
  const eventDate = new Date(year, month - 1, day);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return eventDate.getTime() === today.getTime();
}

function isYesterdayEvent(event) {
  if (!event?.date) return false;
  const [year, month, day] = event.date.split('-').map(Number);
  const eventDate = new Date(year, month - 1, day);
  const now = new Date();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  return eventDate.getTime() === yesterday.getTime();
}

// Public editing helper. Currently always false so that
// only authenticated users can edit events and matches.
function isPublicEditableEvent(_event) {
  return false;
}

function useUnsavedChangesWarning(hasUnsavedChanges) {
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!hasUnsavedChanges) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);
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
  const [visibleCount, setVisibleCount] = useState(30);
  const [activeTab, setActiveTab] = useState('completed'); // 'completed' | 'upcoming'

  // Reset pagination when switching tabs
  React.useEffect(() => {
    setVisibleCount(30);
  }, [activeTab]);

  const allEvents = Array.isArray(events) ? events : [];
  // Completed events keep the overall sort order (newest first)
  const completedEvents = allEvents.filter(e => !isUpcomingEST(e));
  // Upcoming events are sorted soonest-to-latest so the nearest event appears first
  const upcomingEvents = allEvents
    .filter(isUpcomingEST)
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const sourceEvents = activeTab === 'completed' ? completedEvents : upcomingEvents;
  const visibleEvents = sourceEvents.slice(0, visibleCount);

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

      <p style={{
        textAlign: 'center',
        color: '#ddd',
        maxWidth: 700,
        margin: '0 auto 16px',
        fontSize: 16,
      }}>
        Looking for RAW results tonight, SmackDown results tonight, or full WWE results tonight? Pro Wrestling Boxscore
        tracks every show with box score-style match details and championship updates.
      </p>

      {/* Completed / Upcoming toggle */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 8 }}>
        <button
          type="button"
          onClick={() => setActiveTab('completed')}
          style={{
            padding: '8px 16px',
            borderRadius: 999,
            border: '1px solid #444',
            background: activeTab === 'completed' ? gold : '#232323',
            color: activeTab === 'completed' ? '#232323' : '#fff',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          Completed Events
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('upcoming')}
          style={{
            padding: '8px 16px',
            borderRadius: 999,
            border: '1px solid #444',
            background: activeTab === 'upcoming' ? gold : '#232323',
            color: activeTab === 'upcoming' ? '#232323' : '#fff',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          Upcoming Events
        </button>
      </div>
      <div style={{ marginTop: 24 }}>
        {visibleEvents.map(event => {
          const isUpcoming = isUpcomingEST(event);
          const isResultsPending = !isUpcoming && event.status === 'upcoming';
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
                  {event.isLive && (
                    <span style={{ background: '#27ae60', color: 'white', fontWeight: 700, borderRadius: 4, padding: '2px 10px', fontSize: 14, marginLeft: 4 }}>
                      LIVE
                    </span>
                  )}
                  {isUpcoming && (
                    <span style={{ fontSize: 14, color: gold, marginLeft: 4 }}>
                      (upcoming)
                    </span>
                  )}
                  {isResultsPending && (
                    <span style={{ fontSize: 14, color: '#ffa726', marginLeft: 4 }}>
                      (results pending)
                    </span>
                  )}
                </div>
                <div style={{ color: gold, fontSize: 16, marginTop: 2 }}>
                  {formatDate(event.date)} — {event.location}
                </div>
              </div>
            </Link>
          );
        })}
        {sourceEvents.length > visibleCount && (
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <button
              onClick={() => setVisibleCount(c => Math.min(c + 30, sourceEvents.length))}
              style={{
                padding: '10px 24px',
                borderRadius: 8,
                background: gold,
                color: '#232323',
                border: 'none',
                cursor: 'pointer',
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              Load more events
            </button>
          </div>
        )}
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

  const canEditMatches = !!user;
  const canDeleteEvent = !!user;

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

  // Prepare matches with stable order and card type.
  const baseMatches = Array.isArray(event.matches) ? event.matches : [];
  const orderedMatches = baseMatches.map((m, idx) => ({
    ...m,
    order: m.order || idx + 1,
  }));

  // Apply display-time cardType defaults:
  // - Use existing cardType if present.
  // - Otherwise default to "Undercard".
  // Main Event is now **only** set explicitly by the user.
  const withCardTypes = orderedMatches.map((m) => {
    const cardType = m.cardType || 'Undercard';
    return { ...m, cardType };
  });

  // For display, always show any explicit main event as the final match in the list.
  const matchesWithCardType = [...withCardTypes].sort((a, b) => {
    const aMain = a.cardType === 'Main Event';
    const bMain = b.cardType === 'Main Event';
    if (aMain && !bMain) return 1;
    if (!aMain && bMain) return -1;
    return (a.order || 0) - (b.order || 0);
  });

  if (isEditingMatch) {
    return (
      <div style={appBackground}>
        <div style={sectionStyle}>
          <Link
            to="/"
            style={{ color: gold }}
            onClick={e => {
              if (!window.confirm('You have unsaved match edits. Are you sure you want to go back and lose these changes?')) {
                e.preventDefault();
              }
            }}
          >
            ← Back to Events
          </Link>
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

  const formattedDate = formatDate(event.date);
  const brandPrefix = (event.name || '').split(' ')[0] || 'WWE';

  return (
    <>
      <Helmet>
        <title>
          WWE {event.name} Results - {formattedDate}
          {event.location ? ` - ${event.location}` : ''} | Pro Wrestling Boxscore
        </title>
        <meta
          name="description"
          content={`Full WWE ${brandPrefix} results for ${formattedDate}, including complete match card, winners, times, and title changes from ${event.name}${event.location ? ' in ' + event.location : ''}.`}
        />
        <link rel="canonical" href={`https://prowrestlingboxscore.com/event/${event.id}`} />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SportsEvent',
            name: event.name,
            startDate: event.date,
            location: event.location
              ? {
                  '@type': 'Place',
                  name: event.location,
                }
              : undefined,
            url: `https://prowrestlingboxscore.com/event/${event.id}`,
          })}
        </script>
      </Helmet>
      <div style={appBackground}>
        <div style={sectionStyle}>
          <Link to="/" style={{ color: gold }}>
            ← Back to Events
          </Link>
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
            <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, marginTop: 8, marginBottom: 4, textAlign: 'center' }}>
              WWE {brandPrefix} Results – {formattedDate}
            </h1>
            <p style={{ color: '#ccc', fontSize: 14, maxWidth: 700, textAlign: 'center', marginTop: 4 }}>
              Live WWE {brandPrefix} results for {formattedDate}, with full match-by-match coverage, times, methods of victory,
              and championship updates from {event.name}{event.location ? ' in ' + event.location : ''}.
            </p>
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
            // Use index for navigation - it's stable and reliable
            const matchIndex = index; // 0-based index
            // Use both order and index for key to ensure uniqueness
            const uniqueKey = `match-${match.order || index}-${index}`;
            return (
              <div key={uniqueKey}>
                <MatchCard 
                  key={uniqueKey}
                  match={match} 
                  event={event} 
                  wrestlerMap={wrestlerMap} 
                  isClickable={true}
                  matchIndex={matchIndex}
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
                  {canEditMatches && (
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
        {(canEditMatches || canDeleteEvent) && (
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            {canEditMatches && (
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
            )}
            {canDeleteEvent && (
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
            )}
          </div>
        )}
      </div>
      </div>
    </>
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
  const [brEliminations, setBrEliminations] = useState([]);
  // Royal Rumble state (always 30 participants)
  const [rrParticipants, setRrParticipants] = useState(Array(30).fill(''));
  const [rrWinner, setRrWinner] = useState('');
  const [rrEliminations, setRrEliminations] = useState([]);
  const [rrManualIronman, setRrManualIronman] = useState('');
  // Elimination Chamber state (2 starters, 4 pod entrants)
  const [ecStarter1, setEcStarter1] = useState('');
  const [ecStarter2, setEcStarter2] = useState('');
  const [ecPodEntrants, setEcPodEntrants] = useState(Array(4).fill(''));
  const [ecWinner, setEcWinner] = useState('');
  const [ecEliminations, setEcEliminations] = useState([]);
  const [useVisualBuilder, setUseVisualBuilder] = useState(true); // Toggle for Visual Match Builder
  const [formResetKey, setFormResetKey] = useState(0); // Key to force VisualMatchBuilder re-render
  const [showVacancyForm, setShowVacancyForm] = useState(false);
  const [vacancyForm, setVacancyForm] = useState({
    title: '',
    previousChampion: '',
    reason: ''
  });
  // Toggle between adding a wrestling match vs a promo/segment
  const [entryType, setEntryType] = useState('match'); // 'match' | 'promo'
  const [promo, setPromo] = useState({
    title: '',
    participants: [''],
    notes: '',
    outcome: 'None',
    outcomeOther: '',
  });

  const hasUnsavedChangesAddEvent =
    !!(
      name ||
      eventType ||
      date ||
      location ||
      (Array.isArray(matches) && matches.length > 0) ||
      match.participants ||
      match.result ||
      match.method ||
      match.time ||
      promo.title ||
      promo.notes ||
      (Array.isArray(promo.participants) && promo.participants.some(Boolean))
    );
  useUnsavedChangesWarning(hasUnsavedChangesAddEvent);

  // Winner options based on participants
  const winnerOptions = match.participants.includes(' vs ')
    ? match.participants.split(' vs ').map(side => side.trim()).filter(Boolean)
    : [];

  // Add a match to the matches list
  const handleAddMatch = (e) => {
    e.preventDefault();

    // --- Promo branch (non-wrestling segment) ---
    if (entryType === 'promo') {
      const trimmedTitle = promo.title.trim();
      if (!trimmedTitle) {
        alert('Please enter a promo title.');
        return;
      }

      // If this promo outcome is "Title Vacated", also create a vacancy match
      let vacancyMatch = null;
      if (promo.outcome === 'Title Vacated') {
        vacancyMatch = buildVacancyMatch();
        // If validation failed inside buildVacancyMatch, abort adding promo
        if (!vacancyMatch) {
          return;
        }
      }

      const resolvedOutcome =
        promo.outcome === 'Other' && promo.outcomeOther.trim()
          ? promo.outcomeOther.trim()
          : (promo.outcome || 'None');

      const newPromoMatch = {
        participants: Array.isArray(promo.participants)
          ? promo.participants.filter(Boolean)
          : [],
        result: '',
        method: '',
        time: '',
        matchType: 'Promo',
        stipulation: 'None',
        customStipulation: '',
        title: trimmedTitle,
        titleOutcome: '',
        defendingChampion: '',
        notes: promo.notes.trim(),
        isLive: false,
        promoOutcome: resolvedOutcome,
      };

      const currentMatches = Array.isArray(matches) ? matches : [];
      const updatedMatches = vacancyMatch
        ? [...currentMatches, vacancyMatch, newPromoMatch]
        : [...currentMatches, newPromoMatch];

      setMatches(updatedMatches);
      setPromo({ title: '', participants: [''], notes: '', outcome: 'None', outcomeOther: '' });
      if (vacancyMatch) {
        setShowVacancyForm(false);
        setVacancyForm({ title: '', previousChampion: '', reason: '' });
      }
      return;
    }
    // --- Battle Royal branch ---
    if (match.matchType === 'Battle Royal' || match.stipulation === 'Battle Royal') {
      const brPart = brParticipants.filter(Boolean);
      const brWin = brWinner;
      let brResult = '';
      if (eventStatus === 'completed' && brWin && brPart.length >= 2) {
        const winnerName = wrestlers.find(w => w.id === brWin)?.name || brWin;
        
        // Format eliminations if they exist
        let eliminationsText = '';
        if (brEliminations && Array.isArray(brEliminations) && brEliminations.length > 0) {
          const validEliminations = brEliminations.filter(e => e.eliminated && e.eliminatedBy);
          if (validEliminations.length > 0) {
            const elimStrings = validEliminations.map(elim => {
              const eliminatedName = wrestlers.find(w => w.id === elim.eliminated)?.name || elim.eliminated;
              const eliminatedByName = wrestlers.find(w => w.id === elim.eliminatedBy)?.name || elim.eliminatedBy;
              const eliminatedByName2 = elim.eliminatedBy2 ? wrestlers.find(w => w.id === elim.eliminatedBy2)?.name || elim.eliminatedBy2 : null;
              if (eliminatedByName2) {
                return `${eliminatedByName} & ${eliminatedByName2} eliminated ${eliminatedName}${elim.time ? ` (${elim.time})` : ''}`;
              }
              return eliminatedByName ? `${eliminatedByName} eliminated ${eliminatedName}${elim.time ? ` (${elim.time})` : ''}` : eliminatedName;
            });
            eliminationsText = ` [Eliminations: ${elimStrings.join(' → ')}]`;
          }
        }
        
        brResult = `${winnerName} won the Battle Royal${eliminationsText}`;
      } else if (eventStatus === 'completed') {
        brResult = 'No winner';
      }
      
      const newMatch = { 
        ...match, 
        participants: brPart, 
        winner: brWin, 
        result: brResult, 
        isLive: match.isLive || false 
      };
      
      // Always store Battle Royal elimination data to preserve eliminatedBy2
      // Deep clone eliminations to ensure all properties including eliminatedBy2 are preserved
      const clonedEliminations = (brEliminations || []).map(elim => ({ ...elim }));
      newMatch.battleRoyalData = {
        eliminations: clonedEliminations,
        participants: brPart
      };
      
      setMatches([...matches, newMatch]);
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
      setBrEliminations([]);
      return;
    }
    // --- Royal Rumble branch ---
    if (match.matchType === 'Royal Rumble' || match.stipulation === 'Royal Rumble') {
    const rrPart = rrParticipants.filter(Boolean);
    const rrWin = rrWinner;
    const rrManual = rrManualIronman || null;
      let rrResult = '';
      
      if (eventStatus === 'completed' && rrWin && rrPart.length === 30) {
        const winnerName = wrestlers.find(w => w.id === rrWin)?.name || rrWin;
        
        // Format eliminations if they exist
        let eliminationsText = '';
        if (rrEliminations && Array.isArray(rrEliminations) && rrEliminations.length > 0) {
          const validEliminations = rrEliminations.filter(e => e.eliminated && e.eliminatedBy);
          if (validEliminations.length > 0) {
            const elimStrings = validEliminations.map(elim => {
              const eliminatedName = wrestlers.find(w => w.id === elim.eliminated)?.name || elim.eliminated;
              const eliminatedByName = wrestlers.find(w => w.id === elim.eliminatedBy)?.name || elim.eliminatedBy;
              const eliminatedByName2 = elim.eliminatedBy2 ? wrestlers.find(w => w.id === elim.eliminatedBy2)?.name || elim.eliminatedBy2 : null;
              if (eliminatedByName2) {
                return `${eliminatedByName} & ${eliminatedByName2} eliminated ${eliminatedName}${elim.time ? ` (${elim.time})` : ''}`;
              }
              return eliminatedByName ? `${eliminatedByName} eliminated ${eliminatedName}${elim.time ? ` (${elim.time})` : ''}` : eliminatedName;
            });
            eliminationsText = ` [Eliminations: ${elimStrings.join(' → ')}]`;
          }
        }
        
        rrResult = `${winnerName} won the Royal Rumble${eliminationsText}`;
      } else if (eventStatus === 'completed') {
        rrResult = 'No winner';
      }
      
      // Calculate entry order (1-30 based on array index)
      // Helper function to format entry time (entry #1 = 0:00, #2 = 1:30, etc.)
      const formatEntryTime = (entryIndex) => {
        const totalSeconds = entryIndex * 90; // 90 seconds per entry
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
      };
      
    const entryOrder = rrPart.map((slug, index) => ({
      slug,
      entryNumber: index + 1,
      entryTime: formatEntryTime(index),
      timeInRing: null,
    }));
      
      const newMatch = { 
        ...match, 
        participants: rrPart, 
        winner: rrWin, 
        result: rrResult, 
        isLive: match.isLive || false 
      };
      
      // Store Royal Rumble data with entry order and times
      const clonedEliminations = (rrEliminations || []).map(elim => ({ ...elim }));
      newMatch.royalRumbleData = {
        eliminations: clonedEliminations,
        participants: rrPart,
        entryOrder: entryOrder,
        manualIronman: rrManual,
      };
      
      setMatches([...matches, newMatch]);
      setMatch({
        participants: '',
        result: '',
        method: '',
        time: '',
        matchType: 'Singles Match',
        stipulation: 'None',
        customStipulation: '',
        title: '',
        titleOutcome: '',
        defendingChampion: '',
        notes: '',
        isLive: false
      });
      setResultType('');
      setWinner('');
      setFormResetKey(prev => prev + 1);
      setRrParticipants(Array(30).fill(''));
      setRrWinner('');
      setRrEliminations([]);
      setRrManualIronman('');
      return;
    }
    // --- Elimination Chamber branch ---
    if (match.matchType === 'Elimination Chamber' || match.stipulation === 'Elimination Chamber') {
      const starters = [ecStarter1, ecStarter2].filter(Boolean);
      const podEntrants = ecPodEntrants.filter(Boolean);
      const ecWin = ecWinner;
      let ecResult = '';
      
      if (eventStatus === 'completed' && ecWin && starters.length === 2 && podEntrants.length === 4) {
        const winnerName = wrestlers.find(w => w.id === ecWin)?.name || ecWin;
        
        // Format eliminations if they exist
        let eliminationsText = '';
        if (ecEliminations && Array.isArray(ecEliminations) && ecEliminations.length > 0) {
          const validEliminations = ecEliminations.filter(e => e.eliminated && e.eliminatedBy);
          if (validEliminations.length > 0) {
            const elimStrings = validEliminations.map(elim => {
              const eliminatedName = wrestlers.find(w => w.id === elim.eliminated)?.name || elim.eliminated;
              const eliminatedByName = wrestlers.find(w => w.id === elim.eliminatedBy)?.name || elim.eliminatedBy;
              const eliminatedByName2 = elim.eliminatedBy2 ? wrestlers.find(w => w.id === elim.eliminatedBy2)?.name || elim.eliminatedBy2 : null;
              if (eliminatedByName2) {
                return `${eliminatedByName} & ${eliminatedByName2} eliminated ${eliminatedName}${elim.time ? ` (${elim.time})` : ''}`;
              }
              return eliminatedByName ? `${eliminatedByName} eliminated ${eliminatedName}${elim.time ? ` (${elim.time})` : ''}` : eliminatedName;
            });
            eliminationsText = ` [Eliminations: ${elimStrings.join(' → ')}]`;
          }
        }
        
        ecResult = `${winnerName} won the Elimination Chamber${eliminationsText}`;
      } else if (eventStatus === 'completed') {
        ecResult = 'No winner';
      }
      
      // Use manually entered entry times for pod entrants
      const entryOrder = podEntrants.map((slug, index) => ({
        slug,
        entryNumber: index + 1,
        entryTime: ecPodEntryTimes[index] || '' // Use manually entered time
      }));
      
      const allParticipants = [...starters, ...podEntrants];
      
      const newMatch = { 
        ...match, 
        participants: allParticipants, 
        winner: ecWin, 
        result: ecResult, 
        isLive: match.isLive || false 
      };
      
      // Store Elimination Chamber data
      const clonedEliminations = (ecEliminations || []).map(elim => ({ ...elim }));
      newMatch.eliminationChamberData = {
        starters: starters,
        podEntrants: podEntrants,
        entryOrder: entryOrder,
        eliminations: clonedEliminations,
        participants: allParticipants
      };
      
      setMatches([...matches, newMatch]);
      setMatch({
        participants: '',
        result: '',
        method: '',
        time: '',
        matchType: 'Singles Match',
        stipulation: 'None',
        customStipulation: '',
        title: '',
        titleOutcome: '',
        defendingChampion: '',
        notes: '',
        isLive: false
      });
      setResultType('');
      setWinner('');
      setFormResetKey(prev => prev + 1);
      setEcStarter1('');
      setEcStarter2('');
      setEcPodEntrants(Array(4).fill(''));
      setEcPodEntryTimes(Array(4).fill(''));
      setEcWinner('');
      setEcEliminations([]);
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
      } else if (match.matchType === 'Survivor Series-style 10-man Tag Team Elimination match' || match.matchType?.includes('Survivor Series')) {
        // Validate Survivor Series match data
        if (!match.survivorSeriesData || !match.survivorSeriesData.survivor || !match.survivorSeriesData.eliminations || match.survivorSeriesData.eliminations.length < 9) {
          alert('Please complete the Survivor Series match by recording all 9 eliminations and selecting the survivor.');
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
      } else if ((match.matchType === 'Survivor Series-style 10-man Tag Team Elimination match' || match.matchType?.includes('Survivor Series')) && match.survivorSeriesData) {
        // Format Survivor Series result with survivor and elimination order
        const winningTeamNames = match.survivorSeriesData.winningTeam === 1 
          ? match.survivorSeriesData.team1Names.join(' & ')
          : match.survivorSeriesData.team2Names.join(' & ');
        const losingTeamNames = match.survivorSeriesData.winningTeam === 1 
          ? match.survivorSeriesData.team2Names.join(' & ')
          : match.survivorSeriesData.team1Names.join(' & ');
        const survivorName = match.survivorSeriesData.survivorName || match.survivorSeriesData.survivor;
        
        // Format eliminations
        let eliminationsText = '';
        if (match.survivorSeriesData.eliminations && Array.isArray(match.survivorSeriesData.eliminations) && match.survivorSeriesData.eliminations.length > 0) {
          const sortedEliminations = [...match.survivorSeriesData.eliminations].sort((a, b) => a.order - b.order);
          const elimStrings = sortedEliminations.map(elim => {
            const eliminatedName = wrestlers.find(w => w.id === elim.eliminated)?.name || elim.eliminated;
            const eliminatedByName = wrestlers.find(w => w.id === elim.eliminatedBy)?.name || elim.eliminatedBy;
            return `${eliminatedName} by ${eliminatedByName} (${elim.method})`;
          });
          eliminationsText = ` [Eliminations: ${elimStrings.join(' → ')}]`;
        }
        
        result = `${winningTeamNames} def. ${losingTeamNames} (Survivor: ${survivorName}${eliminationsText}${match.survivorSeriesData.time ? `, ${match.survivorSeriesData.time}` : ''})`;
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

  // Build a vacancy match object from the current vacancy form; returns null if invalid
  const buildVacancyMatch = () => {
    if (!vacancyForm.title || vacancyForm.title === 'None') {
      alert('Please select a championship title.');
      return null;
    }
    if (!vacancyForm.previousChampion) {
      alert('Please enter the name of the wrestler who vacated the title.');
      return null;
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

    return vacancyMatch;
  };

  // Handle recording a title vacancy (manual button)
  const handleRecordVacancy = (e) => {
    if (e) e.preventDefault();

    const vacancyMatch = buildVacancyMatch();
    if (!vacancyMatch) return;

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
  const handleSaveEvent = (e, navigateBack = false) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }

    // Basic event fields are always required
    if (!eventType || !date || !location) {
      alert('Please fill out all event fields.');
      return;
    }

    // For completed or live events, require at least one fully defined match
    if (eventStatus === 'completed' || eventStatus === 'live') {
      if (!Array.isArray(matches) || matches.length === 0) {
        alert('Completed or live events must have at least one match.');
        return;
      }
      // Promos are allowed to omit method/result; validation applies only to real matches
      const invalidMatch = matches.some(m =>
        m.matchType !== 'Promo' && (!m.participants || !m.method || !m.result)
      );
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
        <Link
          to="/"
          onClick={e => {
            if (hasUnsavedChangesAddEvent &&
              !window.confirm('You have unsaved event details or matches. Are you sure you want to go back and lose these changes?')
            ) {
              e.preventDefault();
            }
          }}
        >
          ← Back to Events
        </Link>
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
          </div>
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
          {/* Match vs Promo toggle + Live Match (matches only) */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <button
                type="button"
                onClick={() => setEntryType('match')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 16,
                  border: '1px solid #C6A04F',
                  background: entryType === 'match' ? '#C6A04F' : '#232323',
                  color: entryType === 'match' ? '#000' : '#fff',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Match
              </button>
              <button
                type="button"
                onClick={() => setEntryType('promo')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 16,
                  border: '1px solid #C6A04F',
                  background: entryType === 'promo' ? '#C6A04F' : '#232323',
                  color: entryType === 'promo' ? '#000' : '#fff',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Promo
              </button>
            </div>

            {entryType === 'match' && (
              <label style={{ color: gold, fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={match.isLive || false}
                  onChange={e => setMatch({ ...match, isLive: e.target.checked })}
                  style={{ marginRight: 8 }}
                />
                Live Match
              </label>
            )}
          </div>

          {/* Promo fields */}
          {entryType === 'promo' && (
            <div style={{ marginBottom: 16 }}>
              <div>
                <label>
                  Promo Type:<br />
                  <select
                    value={promo.title}
                    onChange={e => setPromo({ ...promo, title: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="">Select promo type...</option>
                    <option value="In-Ring Promo">In-Ring Promo</option>
                    <option value="Backstage Promo">Backstage Promo</option>
                    <option value="Vingette">Vingette</option>
                  </select>
                </label>
              </div>
              <div>
                <div style={{ marginBottom: 4, color: '#fff', fontWeight: 500 }}>
                  Participant(s):
                </div>
                {Array.isArray(promo.participants) && promo.participants.map((id, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <WrestlerAutocomplete
                        wrestlers={wrestlers}
                        value={id}
                        onChange={val =>
                          setPromo(prev => ({
                            ...prev,
                            participants: prev.participants.map((p, i) => (i === idx ? val : p)),
                          }))
                        }
                        placeholder={`Participant ${idx + 1}`}
                      />
                    </div>
                    {promo.participants.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setPromo(prev => ({
                            ...prev,
                            participants: prev.participants.filter((_, i) => i !== idx),
                          }))
                        }
                        style={{
                          background: '#d32f2f',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 4,
                          padding: '4px 8px',
                          cursor: 'pointer',
                          fontWeight: 700,
                        }}
                        aria-label="Remove participant"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setPromo(prev => ({
                      ...prev,
                      participants: [...(Array.isArray(prev.participants) ? prev.participants : []), ''],
                    }))
                  }
                  style={{
                    marginTop: 4,
                    background: '#C6A04F',
                    color: '#232323',
                    border: 'none',
                    borderRadius: 4,
                    padding: '6px 12px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  + Add Participant
                </button>
              </div>
              <div>
                <label>
                  Notes / Description:<br />
                  <textarea
                    value={promo.notes}
                    onChange={e => setPromo({ ...promo, notes: e.target.value })}
                    style={{ ...inputStyle, minHeight: 80 }}
                    placeholder="Brief Summary of Promo"
                  />
                </label>
              </div>
              <div style={{ marginTop: 12 }}>
                <label>
                  Promo Outcome:<br />
                  <select
                    value={promo.outcome || 'None'}
                    onChange={e => {
                      const val = e.target.value;
                      setPromo(prev => ({ ...prev, outcome: val }));
                      if (val === 'Title Vacated') {
                        setShowVacancyForm(true);
                      } else {
                        setShowVacancyForm(false);
                      }
                    }}
                    style={inputStyle}
                  >
                    {PROMO_OUTCOME_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </label>
              </div>
              {promo.outcome === 'Other' && (
                <div style={{ marginTop: 8 }}>
                  <label>
                    Describe Outcome:<br />
                    <input
                      type="text"
                      value={promo.outcomeOther || ''}
                      onChange={e => setPromo(prev => ({ ...prev, outcomeOther: e.target.value }))}
                      style={inputStyle}
                      placeholder="Describe what happened in this promo..."
                    />
                  </label>
                </div>
              )}
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
                        fontSize: 14,
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
                        fontSize: 14,
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <button type="submit" style={{ marginTop: 12 }}>
                Add Promo
              </button>
            </div>
          )}

          {/* Match fields */}
          {entryType === 'match' && (
            <>
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
            </>
          )}
          {entryType === 'match' && (
            <>
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
              {/* Eliminations Section */}
              {brParticipants.filter(Boolean).length >= 2 && (
                <div style={{ marginTop: 16, padding: 16, background: '#2a2a2a', borderRadius: 8, border: '1px solid #444' }}>
                  <div style={{ color: gold, fontWeight: 'bold', marginBottom: 12 }}>
                    Eliminations
                  </div>
                  <div style={{ color: '#fff', fontSize: 12, marginBottom: 12 }}>
                    Track each elimination in order.
                  </div>
                  
                  {brEliminations.map((elimination, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 8, background: '#333', borderRadius: 4, marginBottom: 8, border: '1px solid #555' }}>
                      <span style={{ color: '#fff', minWidth: '80px', fontSize: 12 }}>Elimination #{index + 1}:</span>
                      
                      <div style={{ flex: 1 }}>
                        <label style={{ color: '#fff', fontSize: 11, marginBottom: 4, display: 'block' }}>
                          Eliminated:
                        </label>
                        <select
                          value={elimination.eliminated || ''}
                          onChange={(e) => {
                            const newEliminations = [...brEliminations];
                            newEliminations[index] = { ...newEliminations[index], eliminated: e.target.value };
                            setBrEliminations(newEliminations);
                          }}
                          style={inputStyle}
                        >
                          <option value="">Select wrestler...</option>
                          {brParticipants.filter(Boolean).filter(p => {
                            // Don't show already eliminated wrestlers (except in this current elimination)
                            const alreadyEliminated = brEliminations
                              .filter((_, i) => i !== index)
                              .map(e => e.eliminated)
                              .includes(p);
                            return !alreadyEliminated && p !== brWinner;
                          }).map(slug => (
                            <option key={slug} value={slug}>{wrestlers.find(w => w.id === slug)?.name || slug}</option>
                          ))}
                        </select>
                      </div>

                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <label style={{ color: '#fff', fontSize: 11, marginBottom: 4, display: 'block', flex: 1 }}>
                            Eliminated by:
                          </label>
                          {!elimination.eliminatedBy2 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newEliminations = [...brEliminations];
                                newEliminations[index] = { ...newEliminations[index], eliminatedBy2: '' };
                                setBrEliminations(newEliminations);
                              }}
                              style={{
                                background: gold,
                                color: '#232323',
                                border: 'none',
                                borderRadius: 4,
                                padding: '4px 8px',
                                cursor: 'pointer',
                                fontSize: 14,
                                fontWeight: 'bold',
                                height: 'fit-content'
                              }}
                              title="Add second eliminator"
                            >
                              +
                            </button>
                          )}
                        </div>
                        <select
                          value={elimination.eliminatedBy || ''}
                          onChange={(e) => {
                            const newEliminations = [...brEliminations];
                            newEliminations[index] = { ...newEliminations[index], eliminatedBy: e.target.value };
                            setBrEliminations(newEliminations);
                          }}
                          style={inputStyle}
                        >
                          <option value="">Select wrestler...</option>
                          {brParticipants.filter(Boolean).filter(p => p !== elimination.eliminated && p !== elimination.eliminatedBy2).map(slug => (
                            <option key={slug} value={slug}>{wrestlers.find(w => w.id === slug)?.name || slug}</option>
                          ))}
                        </select>
                        {elimination.eliminatedBy2 !== undefined && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <label style={{ color: '#fff', fontSize: 11, marginBottom: 4, display: 'block', flex: 1 }}>
                                Second eliminator:
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  const newEliminations = [...brEliminations];
                                  const updatedElim = { ...newEliminations[index] };
                                  delete updatedElim.eliminatedBy2;
                                  newEliminations[index] = updatedElim;
                                  setBrEliminations(newEliminations);
                                }}
                                style={{
                                  background: '#d32f2f',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: 4,
                                  padding: '4px 8px',
                                  cursor: 'pointer',
                                  fontSize: 14,
                                  fontWeight: 'bold',
                                  height: 'fit-content'
                                }}
                                title="Remove second eliminator"
                              >
                                ×
                              </button>
                            </div>
                            <select
                              value={elimination.eliminatedBy2 || ''}
                              onChange={(e) => {
                                const newEliminations = [...brEliminations];
                                newEliminations[index] = { ...newEliminations[index], eliminatedBy2: e.target.value };
                                setBrEliminations(newEliminations);
                              }}
                              style={inputStyle}
                            >
                              <option value="">Select second wrestler...</option>
                              {brParticipants.filter(Boolean).filter(p => p !== elimination.eliminated && p !== elimination.eliminatedBy).map(slug => (
                                <option key={slug} value={slug}>{wrestlers.find(w => w.id === slug)?.name || slug}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      <div style={{ flex: 0.8 }}>
                        <label style={{ color: '#fff', fontSize: 11, marginBottom: 4, display: 'block' }}>
                          Time:
                        </label>
                        <input
                          type="text"
                          value={elimination.time || ''}
                          onChange={(e) => {
                            const newEliminations = [...brEliminations];
                            newEliminations[index] = { ...newEliminations[index], time: e.target.value };
                            setBrEliminations(newEliminations);
                          }}
                          placeholder="e.g. 6:52"
                          style={inputStyle}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const newEliminations = brEliminations.filter((_, i) => i !== index);
                          setBrEliminations(newEliminations);
                        }}
                        style={{
                          background: '#d32f2f',
                          color: 'white',
                          border: 'none',
                          borderRadius: 4,
                          padding: '8px 12px',
                          cursor: 'pointer',
                          fontSize: 12,
                          height: 'fit-content',
                          marginTop: 20
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}

                  {brEliminations.length < brParticipants.filter(Boolean).length - 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setBrEliminations([...brEliminations, { eliminated: '', eliminatedBy: '', time: '' }]);
                      }}
                      style={{
                        background: gold,
                        color: '#232323',
                        border: 'none',
                        borderRadius: 4,
                        padding: '8px 16px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        marginTop: 8
                      }}
                    >
                      + Add Elimination
                    </button>
                  )}
                </div>
              )}
            </>
          ) : match.matchType === 'Royal Rumble' ? (
            <>
              <div style={{ color: gold, fontWeight: 600, marginBottom: 8 }}>
                Royal Rumble (30 Participants)
              </div>
              <div style={{ color: '#fff', fontSize: 12, marginBottom: 16 }}>
                Participants enter every 90 seconds. Entry #1 enters at 0:00, Entry #2 at 1:30, etc.
              </div>
              {rrParticipants.map((slug, i) => {
                const entryNumber = i + 1;
                const entryTimeSeconds = i * 90;
                const entryMinutes = Math.floor(entryTimeSeconds / 60);
                const entrySeconds = entryTimeSeconds % 60;
                const entryTime = `${entryMinutes}:${entrySeconds.toString().padStart(2, '0')}`;
                
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <div style={{ minWidth: 80, color: gold, fontWeight: 600, fontSize: 12 }}>
                      #{entryNumber} ({entryTime})
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <WrestlerAutocomplete
                        wrestlers={wrestlers}
                        value={slug}
                        onChange={val => setRrParticipants(prev => prev.map((s, idx) => idx === i ? val : s))}
                        placeholder={`Entry #${entryNumber}`}
                      />
                      <input
                        type="text"
                        value={slug || ''}
                        onChange={e => {
                          const val = e.target.value;
                          setRrParticipants(prev => prev.map((s, idx) => idx === i ? val : s));
                        }}
                        placeholder="Or enter custom slug (e.g. surprise-entrant)"
                        style={{ ...inputStyle, fontSize: 11, marginBottom: 0 }}
                      />
                    </div>
                  </div>
                );
              })}
              
              {/* Winner Selection */}
              {rrParticipants.filter(Boolean).length > 0 && (
                <>
                  <div style={{ marginTop: 16 }}>
                    <label style={{ color: gold, fontWeight: 600, marginBottom: 8, display: 'block' }}>
                      Winner:
                    </label>
                    <select
                      value={rrWinner}
                      onChange={e => setRrWinner(e.target.value)}
                      style={inputStyle}
                    >
                      <option value="">Select winner...</option>
                      {rrParticipants.filter(Boolean).map(slug => (
                        <option key={slug} value={slug}>{wrestlers.find(w => w.id === slug)?.name || slug}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <label style={{ color: gold, fontWeight: 600, marginBottom: 8, display: 'block' }}>
                      Manual Ironman / Ironwoman (optional):
                    </label>
                    <select
                      value={rrManualIronman || ''}
                      onChange={e => setRrManualIronman(e.target.value || '')}
                      style={inputStyle}
                    >
                      <option value="">Let stats decide</option>
                      {rrParticipants.filter(Boolean).map(slug => (
                        <option key={slug} value={slug}>{wrestlers.find(w => w.id === slug)?.name || slug}</option>
                      ))}
                    </select>
                    <div style={{ fontSize: 11, color: '#bbb', marginTop: 4 }}>
                      Use this when first posting results. Later, official time-in-match data will override this choice automatically.
                    </div>
                  </div>
                </>
              )}
              
              {/* Eliminations Section */}
              {rrParticipants.filter(Boolean).length >= 2 && (
                <div style={{ marginTop: 16, padding: 16, background: '#2a2a2a', borderRadius: 8, border: '1px solid #444' }}>
                  <div style={{ color: gold, fontWeight: 'bold', marginBottom: 12 }}>
                    Eliminations
                  </div>
                  <div style={{ color: '#fff', fontSize: 12, marginBottom: 12 }}>
                    Track each elimination in order. Include elimination time.
                  </div>
                  
                  {rrEliminations.map((elimination, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 8, background: '#333', borderRadius: 4, marginBottom: 8, border: '1px solid #555' }}>
                      <span style={{ color: '#fff', minWidth: '80px', fontSize: 12 }}>Elimination #{index + 1}:</span>
                      
                      <div style={{ flex: 1 }}>
                        <label style={{ color: '#fff', fontSize: 11, marginBottom: 4, display: 'block' }}>
                          Eliminated:
                        </label>
                        <select
                          value={elimination.eliminated || ''}
                          onChange={(e) => {
                            const newEliminations = [...rrEliminations];
                            newEliminations[index] = { ...newEliminations[index], eliminated: e.target.value };
                            setRrEliminations(newEliminations);
                          }}
                          style={inputStyle}
                        >
                          <option value="">Select wrestler...</option>
                          {rrParticipants.filter(Boolean).filter(p => {
                            const alreadyEliminated = rrEliminations
                              .filter((_, i) => i !== index)
                              .map(e => e.eliminated)
                              .includes(p);
                            return !alreadyEliminated && p !== rrWinner;
                          }).map(slug => (
                            <option key={slug} value={slug}>{wrestlers.find(w => w.id === slug)?.name || slug}</option>
                          ))}
                        </select>
                      </div>

                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <label style={{ color: '#fff', fontSize: 11, marginBottom: 4, display: 'block', flex: 1 }}>
                            Eliminated by:
                          </label>
                          {!elimination.eliminatedBy2 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newEliminations = [...rrEliminations];
                                newEliminations[index] = { ...newEliminations[index], eliminatedBy2: '' };
                                setRrEliminations(newEliminations);
                              }}
                              style={{
                                background: gold,
                                color: '#232323',
                                border: 'none',
                                borderRadius: 4,
                                padding: '4px 8px',
                                cursor: 'pointer',
                                fontSize: 14,
                                fontWeight: 'bold',
                                height: 'fit-content'
                              }}
                              title="Add second eliminator"
                            >
                              +
                            </button>
                          )}
                        </div>
                        <select
                          value={elimination.eliminatedBy || ''}
                          onChange={(e) => {
                            const newEliminations = [...rrEliminations];
                            newEliminations[index] = { ...newEliminations[index], eliminatedBy: e.target.value };
                            setRrEliminations(newEliminations);
                          }}
                          style={inputStyle}
                        >
                          <option value="">Select wrestler...</option>
                          {rrParticipants.filter(Boolean).filter(p => p !== elimination.eliminated && p !== elimination.eliminatedBy2).map(slug => (
                            <option key={slug} value={slug}>{wrestlers.find(w => w.id === slug)?.name || slug}</option>
                          ))}
                        </select>
                        {elimination.eliminatedBy2 !== undefined && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <label style={{ color: '#fff', fontSize: 11, marginBottom: 4, display: 'block', flex: 1 }}>
                                Second eliminator:
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  const newEliminations = [...rrEliminations];
                                  const updatedElim = { ...newEliminations[index] };
                                  delete updatedElim.eliminatedBy2;
                                  newEliminations[index] = updatedElim;
                                  setRrEliminations(newEliminations);
                                }}
                                style={{
                                  background: '#d32f2f',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: 4,
                                  padding: '4px 8px',
                                  cursor: 'pointer',
                                  fontSize: 14,
                                  fontWeight: 'bold',
                                  height: 'fit-content'
                                }}
                                title="Remove second eliminator"
                              >
                                ×
                              </button>
                            </div>
                            <select
                              value={elimination.eliminatedBy2 || ''}
                              onChange={(e) => {
                                const newEliminations = [...rrEliminations];
                                newEliminations[index] = { ...newEliminations[index], eliminatedBy2: e.target.value };
                                setRrEliminations(newEliminations);
                              }}
                              style={inputStyle}
                            >
                              <option value="">Select second wrestler...</option>
                              {rrParticipants.filter(Boolean).filter(p => p !== elimination.eliminated && p !== elimination.eliminatedBy).map(slug => (
                                <option key={slug} value={slug}>{wrestlers.find(w => w.id === slug)?.name || slug}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      <div style={{ flex: 0.8 }}>
                        <label style={{ color: '#fff', fontSize: 11, marginBottom: 4, display: 'block' }}>
                          Elimination Time:
                        </label>
                        <input
                          type="text"
                          value={elimination.time || ''}
                          onChange={(e) => {
                            const newEliminations = [...rrEliminations];
                            newEliminations[index] = { ...newEliminations[index], time: e.target.value };
                            setRrEliminations(newEliminations);
                          }}
                          placeholder="e.g. 45:30"
                          style={inputStyle}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const newEliminations = rrEliminations.filter((_, i) => i !== index);
                          setRrEliminations(newEliminations);
                        }}
                        style={{
                          background: '#d32f2f',
                          color: 'white',
                          border: 'none',
                          borderRadius: 4,
                          padding: '8px 12px',
                          cursor: 'pointer',
                          fontSize: 12,
                          height: 'fit-content',
                          marginTop: 20
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}

                  {rrEliminations.length < rrParticipants.filter(Boolean).length - 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setRrEliminations([...rrEliminations, { eliminated: '', eliminatedBy: '', time: '' }]);
                      }}
                      style={{
                        background: gold,
                        color: '#232323',
                        border: 'none',
                        borderRadius: 4,
                        padding: '8px 16px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        marginTop: 8
                      }}
                    >
                      + Add Elimination
                    </button>
                  )}
                </div>
              )}
            </>
          ) : match.matchType === 'Royal Rumble' ? (
            <>
              <div style={{ color: gold, fontWeight: 600, marginBottom: 8 }}>
                Royal Rumble (30 Participants)
              </div>
              <div style={{ color: '#fff', fontSize: 12, marginBottom: 16 }}>
                Participants enter every 90 seconds. Entry #1 enters at 0:00, Entry #2 at 1:30, etc.
              </div>
              {rrParticipants.map((slug, i) => {
                const entryNumber = i + 1;
                const entryTimeSeconds = i * 90;
                const entryMinutes = Math.floor(entryTimeSeconds / 60);
                const entrySeconds = entryTimeSeconds % 60;
                const entryTime = `${entryMinutes}:${entrySeconds.toString().padStart(2, '0')}`;
                
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <div style={{ minWidth: 80, color: gold, fontWeight: 600, fontSize: 12 }}>
                      #{entryNumber} ({entryTime})
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <WrestlerAutocomplete
                        wrestlers={wrestlers}
                        value={slug}
                        onChange={val => setRrParticipants(prev => prev.map((s, idx) => idx === i ? val : s))}
                        placeholder={`Entry #${entryNumber}`}
                      />
                      <input
                        type="text"
                        value={slug || ''}
                        onChange={e => {
                          const val = e.target.value;
                          setRrParticipants(prev => prev.map((s, idx) => idx === i ? val : s));
                        }}
                        placeholder="Or enter custom slug (e.g. surprise-entrant)"
                        style={{ ...inputStyle, fontSize: 11, marginBottom: 0 }}
                      />
                    </div>
                  </div>
                );
              })}
              
              {/* Winner Selection */}
              {rrParticipants.filter(Boolean).length > 0 && (
                <>
                  <div style={{ marginTop: 16 }}>
                    <label style={{ color: gold, fontWeight: 600, marginBottom: 8, display: 'block' }}>
                      Winner:
                    </label>
                    <select
                      value={rrWinner}
                      onChange={e => setRrWinner(e.target.value)}
                      style={inputStyle}
                    >
                      <option value="">Select winner...</option>
                      {rrParticipants.filter(Boolean).map(slug => (
                        <option key={slug} value={slug}>{wrestlers.find(w => w.id === slug)?.name || slug}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <label style={{ color: gold, fontWeight: 600, marginBottom: 8, display: 'block' }}>
                      Manual Ironman / Ironwoman (optional):
                    </label>
                    <select
                      value={rrManualIronman || ''}
                      onChange={e => setRrManualIronman(e.target.value || '')}
                      style={inputStyle}
                    >
                      <option value="">Let stats decide</option>
                      {rrParticipants.filter(Boolean).map(slug => (
                        <option key={slug} value={slug}>{wrestlers.find(w => w.id === slug)?.name || slug}</option>
                      ))}
                    </select>
                    <div style={{ fontSize: 11, color: '#bbb', marginTop: 4 }}>
                      Use this when first posting results. Later, official time-in-match data will override this choice automatically.
                    </div>
                  </div>
                </>
              )}
              
              {/* Eliminations Section */}
              {rrParticipants.filter(Boolean).length >= 2 && (
                <div style={{ marginTop: 16, padding: 16, background: '#2a2a2a', borderRadius: 8, border: '1px solid #444' }}>
                  <div style={{ color: gold, fontWeight: 'bold', marginBottom: 12 }}>
                    Eliminations
                  </div>
                  <div style={{ color: '#fff', fontSize: 12, marginBottom: 12 }}>
                    Track each elimination in order. Include elimination time.
                  </div>
                  
                  {rrEliminations.map((elimination, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 8, background: '#333', borderRadius: 4, marginBottom: 8, border: '1px solid #555' }}>
                      <span style={{ color: '#fff', minWidth: '80px', fontSize: 12 }}>Elimination #{index + 1}:</span>
                      
                      <div style={{ flex: 1 }}>
                        <label style={{ color: '#fff', fontSize: 11, marginBottom: 4, display: 'block' }}>
                          Eliminated:
                        </label>
                        <select
                          value={elimination.eliminated || ''}
                          onChange={(e) => {
                            const newEliminations = [...rrEliminations];
                            newEliminations[index] = { ...newEliminations[index], eliminated: e.target.value };
                            setRrEliminations(newEliminations);
                          }}
                          style={inputStyle}
                        >
                          <option value="">Select wrestler...</option>
                          {rrParticipants.filter(Boolean).filter(p => {
                            const alreadyEliminated = rrEliminations
                              .filter((_, i) => i !== index)
                              .map(e => e.eliminated)
                              .includes(p);
                            return !alreadyEliminated && p !== rrWinner;
                          }).map(slug => (
                            <option key={slug} value={slug}>{wrestlers.find(w => w.id === slug)?.name || slug}</option>
                          ))}
                        </select>
                      </div>

                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <label style={{ color: '#fff', fontSize: 11, marginBottom: 4, display: 'block', flex: 1 }}>
                            Eliminated by:
                          </label>
                          {!elimination.eliminatedBy2 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newEliminations = [...rrEliminations];
                                newEliminations[index] = { ...newEliminations[index], eliminatedBy2: '' };
                                setRrEliminations(newEliminations);
                              }}
                              style={{
                                background: gold,
                                color: '#232323',
                                border: 'none',
                                borderRadius: 4,
                                padding: '4px 8px',
                                cursor: 'pointer',
                                fontSize: 14,
                                fontWeight: 'bold',
                                height: 'fit-content'
                              }}
                              title="Add second eliminator"
                            >
                              +
                            </button>
                          )}
                        </div>
                        <select
                          value={elimination.eliminatedBy || ''}
                          onChange={(e) => {
                            const newEliminations = [...rrEliminations];
                            newEliminations[index] = { ...newEliminations[index], eliminatedBy: e.target.value };
                            setRrEliminations(newEliminations);
                          }}
                          style={inputStyle}
                        >
                          <option value="">Select wrestler...</option>
                          {rrParticipants.filter(Boolean).filter(p => p !== elimination.eliminated && p !== elimination.eliminatedBy2).map(slug => (
                            <option key={slug} value={slug}>{wrestlers.find(w => w.id === slug)?.name || slug}</option>
                          ))}
                        </select>
                        {elimination.eliminatedBy2 !== undefined && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <label style={{ color: '#fff', fontSize: 11, marginBottom: 4, display: 'block', flex: 1 }}>
                                Second eliminator:
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  const newEliminations = [...rrEliminations];
                                  const updatedElim = { ...newEliminations[index] };
                                  delete updatedElim.eliminatedBy2;
                                  newEliminations[index] = updatedElim;
                                  setRrEliminations(newEliminations);
                                }}
                                style={{
                                  background: '#d32f2f',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: 4,
                                  padding: '4px 8px',
                                  cursor: 'pointer',
                                  fontSize: 14,
                                  fontWeight: 'bold',
                                  height: 'fit-content'
                                }}
                                title="Remove second eliminator"
                              >
                                ×
                              </button>
                            </div>
                            <select
                              value={elimination.eliminatedBy2 || ''}
                              onChange={(e) => {
                                const newEliminations = [...rrEliminations];
                                newEliminations[index] = { ...newEliminations[index], eliminatedBy2: e.target.value };
                                setRrEliminations(newEliminations);
                              }}
                              style={inputStyle}
                            >
                              <option value="">Select second wrestler...</option>
                              {rrParticipants.filter(Boolean).filter(p => p !== elimination.eliminated && p !== elimination.eliminatedBy).map(slug => (
                                <option key={slug} value={slug}>{wrestlers.find(w => w.id === slug)?.name || slug}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      <div style={{ flex: 0.8 }}>
                        <label style={{ color: '#fff', fontSize: 11, marginBottom: 4, display: 'block' }}>
                          Elimination Time:
                        </label>
                        <input
                          type="text"
                          value={elimination.time || ''}
                          onChange={(e) => {
                            const newEliminations = [...rrEliminations];
                            newEliminations[index] = { ...newEliminations[index], time: e.target.value };
                            setRrEliminations(newEliminations);
                          }}
                          placeholder="e.g. 45:30"
                          style={inputStyle}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const newEliminations = rrEliminations.filter((_, i) => i !== index);
                          setRrEliminations(newEliminations);
                        }}
                        style={{
                          background: '#d32f2f',
                          color: 'white',
                          border: 'none',
                          borderRadius: 4,
                          padding: '8px 12px',
                          cursor: 'pointer',
                          fontSize: 12,
                          height: 'fit-content',
                          marginTop: 20
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}

                  {rrEliminations.length < rrParticipants.filter(Boolean).length - 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setRrEliminations([...rrEliminations, { eliminated: '', eliminatedBy: '', time: '' }]);
                      }}
                      style={{
                        background: gold,
                        color: '#232323',
                        border: 'none',
                        borderRadius: 4,
                        padding: '8px 16px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        marginTop: 8
                      }}
                    >
                      + Add Elimination
                    </button>
                  )}
                </div>
              )}
            </>
          ) : match.matchType === 'Elimination Chamber' ? (
            <>
              <div style={{ color: gold, fontWeight: 600, marginBottom: 8 }}>
                Elimination Chamber (6 Participants)
              </div>
              <div style={{ color: '#fff', fontSize: 12, marginBottom: 16 }}>
                2 wrestlers start in the ring. 4 wrestlers start in pods. Enter the time each pod entrant entered.
              </div>
              
              {/* Starters */}
              <div style={{ marginBottom: 16, padding: 12, background: '#2a2a2a', borderRadius: 8, border: '1px solid #444' }}>
                <div style={{ color: gold, fontWeight: 600, marginBottom: 8 }}>
                  Starters (In Ring)
                </div>
                <WrestlerAutocomplete
                  wrestlers={wrestlers}
                  value={ecStarter1}
                  onChange={val => setEcStarter1(val)}
                  placeholder="Starter 1"
                />
                <div style={{ marginTop: 8 }}>
                  <WrestlerAutocomplete
                    wrestlers={wrestlers}
                    value={ecStarter2}
                    onChange={val => setEcStarter2(val)}
                    placeholder="Starter 2"
                  />
                </div>
              </div>
              
              {/* Pod Entrants */}
              <div style={{ marginBottom: 16, padding: 12, background: '#2a2a2a', borderRadius: 8, border: '1px solid #444' }}>
                <div style={{ color: gold, fontWeight: 600, marginBottom: 8 }}>
                  Pod Entrants (Entry Order)
                </div>
                <div style={{ color: '#fff', fontSize: 12, marginBottom: 12 }}>
                  Enter the wrestler and the time they entered from their pod.
                </div>
                {ecPodEntrants.map((slug, i) => {
                  const entryNumber = i + 1;
                  
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <div style={{ minWidth: 60, color: gold, fontWeight: 600, fontSize: 12 }}>
                        #{entryNumber}
                      </div>
                      <div style={{ flex: 1 }}>
                        <WrestlerAutocomplete
                          wrestlers={wrestlers}
                          value={slug}
                          onChange={val => setEcPodEntrants(prev => prev.map((s, idx) => idx === i ? val : s))}
                          placeholder={`Pod Entrant #${entryNumber}`}
                        />
                      </div>
                      <div style={{ minWidth: 100 }}>
                        <label style={{ color: '#fff', fontSize: 11, marginBottom: 4, display: 'block' }}>
                          Entry Time:
                        </label>
                        <input
                          type="text"
                          value={ecPodEntryTimes[i] || ''}
                          onChange={(e) => {
                            const newTimes = [...ecPodEntryTimes];
                            newTimes[i] = e.target.value;
                            setEcPodEntryTimes(newTimes);
                          }}
                          placeholder="e.g. 5:00"
                          style={inputStyle}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Winner Selection */}
              {([ecStarter1, ecStarter2, ...ecPodEntrants].filter(Boolean).length === 6) && (
                <div style={{ marginTop: 16 }}>
                  <label style={{ color: gold, fontWeight: 600, marginBottom: 8, display: 'block' }}>
                    Winner:
                  </label>
                  <select
                    value={ecWinner}
                    onChange={e => setEcWinner(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Select winner...</option>
                    {[ecStarter1, ecStarter2, ...ecPodEntrants].filter(Boolean).map(slug => (
                      <option key={slug} value={slug}>{wrestlers.find(w => w.id === slug)?.name || slug}</option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* Eliminations Section */}
              {([ecStarter1, ecStarter2, ...ecPodEntrants].filter(Boolean).length === 6) && (
                <div style={{ marginTop: 16, padding: 16, background: '#2a2a2a', borderRadius: 8, border: '1px solid #444' }}>
                  <div style={{ color: gold, fontWeight: 'bold', marginBottom: 12 }}>
                    Eliminations
                  </div>
                  <div style={{ color: '#fff', fontSize: 12, marginBottom: 12 }}>
                    Track each elimination in order. Include elimination time.
                  </div>
                  
                  {ecEliminations.map((elimination, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 8, background: '#333', borderRadius: 4, marginBottom: 8, border: '1px solid #555' }}>
                      <span style={{ color: '#fff', minWidth: '80px', fontSize: 12 }}>Elimination #{index + 1}:</span>
                      
                      <div style={{ flex: 1 }}>
                        <label style={{ color: '#fff', fontSize: 11, marginBottom: 4, display: 'block' }}>
                          Eliminated:
                        </label>
                        <select
                          value={elimination.eliminated || ''}
                          onChange={(e) => {
                            const newEliminations = [...ecEliminations];
                            newEliminations[index] = { ...newEliminations[index], eliminated: e.target.value };
                            setEcEliminations(newEliminations);
                          }}
                          style={inputStyle}
                        >
                          <option value="">Select wrestler...</option>
                          {[ecStarter1, ecStarter2, ...ecPodEntrants].filter(Boolean).filter(p => {
                            const alreadyEliminated = ecEliminations
                              .filter((_, i) => i !== index)
                              .map(e => e.eliminated)
                              .includes(p);
                            return !alreadyEliminated && p !== ecWinner;
                          }).map(slug => (
                            <option key={slug} value={slug}>{wrestlers.find(w => w.id === slug)?.name || slug}</option>
                          ))}
                        </select>
                      </div>

                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <label style={{ color: '#fff', fontSize: 11, marginBottom: 4, display: 'block', flex: 1 }}>
                            Eliminated by:
                          </label>
                          {!elimination.eliminatedBy2 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newEliminations = [...ecEliminations];
                                newEliminations[index] = { ...newEliminations[index], eliminatedBy2: '' };
                                setEcEliminations(newEliminations);
                              }}
                              style={{
                                background: gold,
                                color: '#232323',
                                border: 'none',
                                borderRadius: 4,
                                padding: '4px 8px',
                                cursor: 'pointer',
                                fontSize: 14,
                                fontWeight: 'bold',
                                height: 'fit-content'
                              }}
                              title="Add second eliminator"
                            >
                              +
                            </button>
                          )}
                        </div>
                        <select
                          value={elimination.eliminatedBy || ''}
                          onChange={(e) => {
                            const newEliminations = [...ecEliminations];
                            newEliminations[index] = { ...newEliminations[index], eliminatedBy: e.target.value };
                            setEcEliminations(newEliminations);
                          }}
                          style={inputStyle}
                        >
                          <option value="">Select wrestler...</option>
                          {[ecStarter1, ecStarter2, ...ecPodEntrants].filter(Boolean).filter(p => p !== elimination.eliminated && p !== elimination.eliminatedBy2).map(slug => (
                            <option key={slug} value={slug}>{wrestlers.find(w => w.id === slug)?.name || slug}</option>
                          ))}
                        </select>
                        {elimination.eliminatedBy2 !== undefined && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <label style={{ color: '#fff', fontSize: 11, marginBottom: 4, display: 'block', flex: 1 }}>
                                Second eliminator:
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  const newEliminations = [...ecEliminations];
                                  const updatedElim = { ...newEliminations[index] };
                                  delete updatedElim.eliminatedBy2;
                                  newEliminations[index] = updatedElim;
                                  setEcEliminations(newEliminations);
                                }}
                                style={{
                                  background: '#d32f2f',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: 4,
                                  padding: '4px 8px',
                                  cursor: 'pointer',
                                  fontSize: 14,
                                  fontWeight: 'bold',
                                  height: 'fit-content'
                                }}
                                title="Remove second eliminator"
                              >
                                ×
                              </button>
                            </div>
                            <select
                              value={elimination.eliminatedBy2 || ''}
                              onChange={(e) => {
                                const newEliminations = [...ecEliminations];
                                newEliminations[index] = { ...newEliminations[index], eliminatedBy2: e.target.value };
                                setEcEliminations(newEliminations);
                              }}
                              style={inputStyle}
                            >
                              <option value="">Select second wrestler...</option>
                              {[ecStarter1, ecStarter2, ...ecPodEntrants].filter(Boolean).filter(p => p !== elimination.eliminated && p !== elimination.eliminatedBy).map(slug => (
                                <option key={slug} value={slug}>{wrestlers.find(w => w.id === slug)?.name || slug}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      <div style={{ flex: 0.8 }}>
                        <label style={{ color: '#fff', fontSize: 11, marginBottom: 4, display: 'block' }}>
                          Elimination Time:
                        </label>
                        <input
                          type="text"
                          value={elimination.time || ''}
                          onChange={(e) => {
                            const newEliminations = [...ecEliminations];
                            newEliminations[index] = { ...newEliminations[index], time: e.target.value };
                            setEcEliminations(newEliminations);
                          }}
                          placeholder="e.g. 12:30"
                          style={inputStyle}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const newEliminations = ecEliminations.filter((_, i) => i !== index);
                          setEcEliminations(newEliminations);
                        }}
                        style={{
                          background: '#d32f2f',
                          color: 'white',
                          border: 'none',
                          borderRadius: 4,
                          padding: '8px 12px',
                          cursor: 'pointer',
                          fontSize: 12,
                          height: 'fit-content',
                          marginTop: 20
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}

                  {ecEliminations.length < 5 && (
                    <button
                      type="button"
                      onClick={() => {
                        setEcEliminations([...ecEliminations, { eliminated: '', eliminatedBy: '', time: '' }]);
                      }}
                      style={{
                        background: gold,
                        color: '#232323',
                        border: 'none',
                        borderRadius: 4,
                        padding: '8px 16px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        marginTop: 8
                      }}
                    >
                      + Add Elimination
                    </button>
                  )}
                </div>
              )}
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
          ) : (match.matchType === 'Survivor Series-style 10-man Tag Team Elimination match' || match.matchType?.includes('Survivor Series')) ? (
            // Survivor Series matches always use the SurvivorSeriesMatchBuilder (has elimination tracking)
            <SurvivorSeriesMatchBuilder
              key={`survivor-series-${match.matchType}`}
              wrestlers={wrestlers}
              value={match.participants}
              onChange={value => {
                console.log('SurvivorSeriesMatchBuilder onChange called with value:', value);
                const newMatch = { ...match, participants: value };
                setMatch(newMatch);
              }}
              onResultChange={survivorResult => {
                console.log('Survivor Series result:', survivorResult);
                // Store the survivor series data
                const winningTeamNames = survivorResult.winningTeam === 1 
                  ? survivorResult.team1Names.join(' & ')
                  : survivorResult.team2Names.join(' & ');
                setMatch(prev => ({
                  ...prev,
                  survivorSeriesData: survivorResult,
                  winner: winningTeamNames,
                  method: 'Elimination',
                  time: survivorResult.time
                }));
              }}
            />
          ) : (
            <>
              {/* Check if this is a title match - if so, always use visual builder */}
              {(() => {
                const isTitleMatch = match.title && match.title !== 'None' && match.stipulation !== 'No. 1 Contender Match';
                const shouldUseVisualBuilder = isTitleMatch ? true : useVisualBuilder;
                
                return (
                  <>
                    {/* Participant Input Toggle - Hidden for War Games matches and title matches */}
                    {match.matchType !== '5-on-5 War Games Match' && !match.matchType?.includes('War Games') && !isTitleMatch && (
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
                    
                    {isTitleMatch && (
                      <div style={{ marginBottom: 16, padding: 8, background: '#2a2a2a', borderRadius: 4, border: '1px solid #C6A04F' }}>
                        <div style={{ color: '#C6A04F', fontWeight: 600, fontSize: 14 }}>
                          💡 Title Match: Use the "C" button next to participants to mark the defending champion
                        </div>
                      </div>
                    )}

                    {shouldUseVisualBuilder && match.matchType !== '5-on-5 War Games Match' && !match.matchType?.includes('War Games') ? (
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
                );
              })()}
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
          {/* Title outcome should appear above special match winner on add-event form */}
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
          {match.title && match.title !== 'None' && match.stipulation !== 'No. 1 Contender Match' && (
            <div style={{ fontSize: 12, color: '#C6A04F', marginTop: 4, marginBottom: 16, fontStyle: 'italic' }}>
              💡 <strong>Tip:</strong> Click the "C" button next to a participant in the visual builder above to mark them as the defending champion.
            </div>
          )}
          <button type="submit" style={{ marginTop: 8 }}>Add Match</button>
            </>
          )}
        </form>
        <button
          type="button"
          style={{ marginTop: 24 }}
          disabled={
            !eventType || !date || !location ||
            ((eventStatus === 'completed' || eventStatus === 'live') &&
              (!Array.isArray(matches) || matches.length === 0 ||
               matches.some(m => !m.participants || !m.method || !m.result)))
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
  const canEdit = !!user;

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
  const [brEliminations, setBrEliminations] = useState([]);
  // Royal Rumble state (always 30 participants)
  const [rrParticipants, setRrParticipants] = useState(Array(30).fill(''));
  const [rrWinner, setRrWinner] = useState('');
  const [rrEliminations, setRrEliminations] = useState([]);
  // Elimination Chamber state (2 starters, 4 pod entrants)
  const [ecStarter1, setEcStarter1] = useState('');
  const [ecStarter2, setEcStarter2] = useState('');
  const [ecPodEntrants, setEcPodEntrants] = useState(Array(4).fill(''));
  const [ecWinner, setEcWinner] = useState('');
  const [ecEliminations, setEcEliminations] = useState([]);
  const [useVisualBuilder, setUseVisualBuilder] = useState(true); // Toggle for Visual Match Builder
  const [formResetKey, setFormResetKey] = useState(0); // Key to force VisualMatchBuilder re-render
  const [showVacancyForm, setShowVacancyForm] = useState(false);
  const [vacancyForm, setVacancyForm] = useState({
    title: '',
    previousChampion: '',
    reason: ''
  });
  const [saveMessage, setSaveMessage] = useState('');

  const hasUnsavedChangesEditEvent =
    !!event &&
    (
      name !== event.name ||
      date !== event.date ||
      location !== event.location ||
      JSON.stringify(matches || []) !== JSON.stringify(event.matches || [])
    );
  useUnsavedChangesWarning(hasUnsavedChangesEditEvent);

  // Winner options based on participants
  const winnerOptions = match.participants.includes(' vs ')
    ? match.participants.split(' vs ').map(side => side.trim()).filter(Boolean)
    : [];

  // Add a match to the matches list
  const handleAddMatch = (e) => {
    e.preventDefault();
    // --- Battle Royal branch ---
    if (match.matchType === 'Battle Royal' || match.stipulation === 'Battle Royal') {
      const brPart = brParticipants.filter(Boolean);
      const brWin = brWinner;
      let brResult = '';
      if (eventStatus === 'completed' && brWin && brPart.length >= 2) {
        const winnerName = wrestlers.find(w => w.id === brWin)?.name || brWin;
        
        // Format eliminations if they exist
        let eliminationsText = '';
        if (brEliminations && Array.isArray(brEliminations) && brEliminations.length > 0) {
          const validEliminations = brEliminations.filter(e => e.eliminated && e.eliminatedBy);
          if (validEliminations.length > 0) {
            const elimStrings = validEliminations.map(elim => {
              const eliminatedName = wrestlers.find(w => w.id === elim.eliminated)?.name || elim.eliminated;
              const eliminatedByName = wrestlers.find(w => w.id === elim.eliminatedBy)?.name || elim.eliminatedBy;
              const eliminatedByName2 = elim.eliminatedBy2 ? wrestlers.find(w => w.id === elim.eliminatedBy2)?.name || elim.eliminatedBy2 : null;
              if (eliminatedByName2) {
                return `${eliminatedByName} & ${eliminatedByName2} eliminated ${eliminatedName}${elim.time ? ` (${elim.time})` : ''}`;
              }
              return eliminatedByName ? `${eliminatedByName} eliminated ${eliminatedName}${elim.time ? ` (${elim.time})` : ''}` : eliminatedName;
            });
            eliminationsText = ` [Eliminations: ${elimStrings.join(' → ')}]`;
          }
        }
        
        brResult = `${winnerName} won the Battle Royal${eliminationsText}`;
      } else if (eventStatus === 'completed') {
        brResult = 'No winner';
      }
      
      const newMatch = { 
        ...match, 
        participants: brPart, 
        winner: brWin, 
        result: brResult, 
        isLive: match.isLive || false, 
        order: matches.length + 1 
      };
      
      // Always store Battle Royal elimination data to preserve eliminatedBy2
      // Deep clone eliminations to ensure all properties including eliminatedBy2 are preserved
      const clonedEliminations = (brEliminations || []).map(elim => ({ ...elim }));
      newMatch.battleRoyalData = {
        eliminations: clonedEliminations,
        participants: brPart
      };
      
      setMatches([...matches, newMatch]);
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
      setBrEliminations([]);
      return;
    }
    // --- Royal Rumble branch ---
    if (match.matchType === 'Royal Rumble' || match.stipulation === 'Royal Rumble') {
      const rrPart = rrParticipants.filter(Boolean);
      const rrWin = rrWinner;
      let rrResult = '';
      
      if (eventStatus === 'completed' && rrWin && rrPart.length === 30) {
        const winnerName = wrestlers.find(w => w.id === rrWin)?.name || rrWin;
        
        // Format eliminations if they exist
        let eliminationsText = '';
        if (rrEliminations && Array.isArray(rrEliminations) && rrEliminations.length > 0) {
          const validEliminations = rrEliminations.filter(e => e.eliminated && e.eliminatedBy);
          if (validEliminations.length > 0) {
            const elimStrings = validEliminations.map(elim => {
              const eliminatedName = wrestlers.find(w => w.id === elim.eliminated)?.name || elim.eliminated;
              const eliminatedByName = wrestlers.find(w => w.id === elim.eliminatedBy)?.name || elim.eliminatedBy;
              const eliminatedByName2 = elim.eliminatedBy2 ? wrestlers.find(w => w.id === elim.eliminatedBy2)?.name || elim.eliminatedBy2 : null;
              if (eliminatedByName2) {
                return `${eliminatedByName} & ${eliminatedByName2} eliminated ${eliminatedName}${elim.time ? ` (${elim.time})` : ''}`;
              }
              return eliminatedByName ? `${eliminatedByName} eliminated ${eliminatedName}${elim.time ? ` (${elim.time})` : ''}` : eliminatedName;
            });
            eliminationsText = ` [Eliminations: ${elimStrings.join(' → ')}]`;
          }
        }
        
        rrResult = `${winnerName} won the Royal Rumble${eliminationsText}`;
      } else if (eventStatus === 'completed') {
        rrResult = 'No winner';
      }
      
      // Calculate entry order (1-30 based on array index)
      const formatEntryTime = (entryIndex) => {
        const totalSeconds = entryIndex * 90; // 90 seconds per entry
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
      };
      
      const entryOrder = rrPart.map((slug, index) => ({
        slug,
        entryNumber: index + 1,
        entryTime: formatEntryTime(index),
        timeInRing: null,
      }));
      
      const newMatch = { 
        ...match, 
        participants: rrPart, 
        winner: rrWin, 
        result: rrResult, 
        isLive: match.isLive || false,
        order: matches.length + 1
      };
      
      // Store Royal Rumble data with entry order and times
      const clonedEliminations = (rrEliminations || []).map(elim => ({ ...elim }));
    newMatch.royalRumbleData = {
      eliminations: clonedEliminations,
      participants: rrPart,
      entryOrder: entryOrder,
      manualIronman: rrManual,
    };
      
      setMatches([...matches, newMatch]);
      setMatch({
        participants: '',
        result: '',
        method: '',
        time: '',
        matchType: 'Singles Match',
        stipulation: 'None',
        customStipulation: '',
        title: '',
        titleOutcome: '',
        defendingChampion: '',
        notes: '',
        isLive: false
      });
      setResultType('');
      setWinner('');
    setRrParticipants(Array(30).fill(''));
    setRrWinner('');
    setRrEliminations([]);
    setRrManualIronman('');
      return;
    }
    // --- Elimination Chamber branch ---
    if (match.matchType === 'Elimination Chamber' || match.stipulation === 'Elimination Chamber') {
      const starters = [ecStarter1, ecStarter2].filter(Boolean);
      const podEntrants = ecPodEntrants.filter(Boolean);
      const ecWin = ecWinner;
      let ecResult = '';
      
      if (eventStatus === 'completed' && ecWin && starters.length === 2 && podEntrants.length === 4) {
        const winnerName = wrestlers.find(w => w.id === ecWin)?.name || ecWin;
        
        // Format eliminations if they exist
        let eliminationsText = '';
        if (ecEliminations && Array.isArray(ecEliminations) && ecEliminations.length > 0) {
          const validEliminations = ecEliminations.filter(e => e.eliminated && e.eliminatedBy);
          if (validEliminations.length > 0) {
            const elimStrings = validEliminations.map(elim => {
              const eliminatedName = wrestlers.find(w => w.id === elim.eliminated)?.name || elim.eliminated;
              const eliminatedByName = wrestlers.find(w => w.id === elim.eliminatedBy)?.name || elim.eliminatedBy;
              const eliminatedByName2 = elim.eliminatedBy2 ? wrestlers.find(w => w.id === elim.eliminatedBy2)?.name || elim.eliminatedBy2 : null;
              if (eliminatedByName2) {
                return `${eliminatedByName} & ${eliminatedByName2} eliminated ${eliminatedName}${elim.time ? ` (${elim.time})` : ''}`;
              }
              return eliminatedByName ? `${eliminatedByName} eliminated ${eliminatedName}${elim.time ? ` (${elim.time})` : ''}` : eliminatedName;
            });
            eliminationsText = ` [Eliminations: ${elimStrings.join(' → ')}]`;
          }
        }
        
        ecResult = `${winnerName} won the Elimination Chamber${eliminationsText}`;
      } else if (eventStatus === 'completed') {
        ecResult = 'No winner';
      }
      
      // Use manually entered entry times for pod entrants
      const entryOrder = podEntrants.map((slug, index) => ({
        slug,
        entryNumber: index + 1,
        entryTime: ecPodEntryTimes[index] || '' // Use manually entered time
      }));
      
      const allParticipants = [...starters, ...podEntrants];
      
      const newMatch = { 
        ...match, 
        participants: allParticipants, 
        winner: ecWin, 
        result: ecResult, 
        isLive: match.isLive || false,
        order: matches.length + 1
      };
      
      // Store Elimination Chamber data
      const clonedEliminations = (ecEliminations || []).map(elim => ({ ...elim }));
      newMatch.eliminationChamberData = {
        starters: starters,
        podEntrants: podEntrants,
        entryOrder: entryOrder,
        eliminations: clonedEliminations,
        participants: allParticipants
      };
      
      setMatches([...matches, newMatch]);
      setMatch({
        participants: '',
        result: '',
        method: '',
        time: '',
        matchType: 'Singles Match',
        stipulation: 'None',
        customStipulation: '',
        title: '',
        titleOutcome: '',
        defendingChampion: '',
        notes: '',
        isLive: false
      });
      setResultType('');
      setWinner('');
      setEcStarter1('');
      setEcStarter2('');
      setEcPodEntrants(Array(4).fill(''));
      setEcPodEntryTimes(Array(4).fill(''));
      setEcWinner('');
      setEcEliminations([]);
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

  // Helper function to regenerate Battle Royal result format
  const regenerateBattleRoyalResult = (match, wrestlersList) => {
    if ((match.matchType === 'Battle Royal' || match.stipulation === 'Battle Royal') && 
        match.winner && eventStatus === 'completed') {
      
      const winnerName = wrestlersList.find(w => w.id === match.winner)?.name || match.winner;
      
      // Check if there are eliminations to format
      if (match.battleRoyalData && match.battleRoyalData.eliminations && 
          Array.isArray(match.battleRoyalData.eliminations)) {
        const validEliminations = match.battleRoyalData.eliminations.filter(e => e.eliminated && e.eliminatedBy);
        
        if (validEliminations.length > 0) {
          const elimStrings = validEliminations.map(elim => {
            const eliminatedName = wrestlersList.find(w => w.id === elim.eliminated)?.name || elim.eliminated;
            const eliminatedByName = wrestlersList.find(w => w.id === elim.eliminatedBy)?.name || elim.eliminatedBy;
            const eliminatedByName2 = elim.eliminatedBy2 ? wrestlersList.find(w => w.id === elim.eliminatedBy2)?.name || elim.eliminatedBy2 : null;
            if (eliminatedByName2) {
              return `${eliminatedByName} & ${eliminatedByName2} eliminated ${eliminatedName}${elim.time ? ` (${elim.time})` : ''}`;
            }
            return eliminatedByName ? `${eliminatedByName} eliminated ${eliminatedName}${elim.time ? ` (${elim.time})` : ''}` : eliminatedName;
          });
          const eliminationsText = ` [Eliminations: ${elimStrings.join(' → ')}]`;
          return `${winnerName} won the Battle Royal${eliminationsText}`;
        }
      }
      
      // If no eliminations data but there's a winner, return the basic result
      return `${winnerName} won the Battle Royal`;
    }
    return match.result; // Return existing result if not a Battle Royal or no winner
  };

  // Helper function to regenerate Royal Rumble result format
  const regenerateRoyalRumbleResult = (match, wrestlersList) => {
    if ((match.matchType === 'Royal Rumble' || match.stipulation === 'Royal Rumble') && 
        match.winner && eventStatus === 'completed') {
      
      const winnerName = wrestlersList.find(w => w.id === match.winner)?.name || match.winner;
      
      // Check if there are eliminations to format
      if (match.royalRumbleData && match.royalRumbleData.eliminations && 
          Array.isArray(match.royalRumbleData.eliminations)) {
        const validEliminations = match.royalRumbleData.eliminations.filter(e => e.eliminated && e.eliminatedBy);
        
        if (validEliminations.length > 0) {
          const elimStrings = validEliminations.map(elim => {
            const eliminatedName = wrestlersList.find(w => w.id === elim.eliminated)?.name || elim.eliminated;
            const eliminatedByName = wrestlersList.find(w => w.id === elim.eliminatedBy)?.name || elim.eliminatedBy;
            const eliminatedByName2 = elim.eliminatedBy2 ? wrestlersList.find(w => w.id === elim.eliminatedBy2)?.name || elim.eliminatedBy2 : null;
            if (eliminatedByName2) {
              return `${eliminatedByName} & ${eliminatedByName2} eliminated ${eliminatedName}${elim.time ? ` (${elim.time})` : ''}`;
            }
            return eliminatedByName ? `${eliminatedByName} eliminated ${eliminatedName}${elim.time ? ` (${elim.time})` : ''}` : eliminatedName;
          });
          const eliminationsText = ` [Eliminations: ${elimStrings.join(' → ')}]`;
          return `${winnerName} won the Royal Rumble${eliminationsText}`;
        }
      }
      
      // If no eliminations data but there's a winner, return the basic result
      return `${winnerName} won the Royal Rumble`;
    }
    return match.result; // Return existing result if not a Royal Rumble or no winner
  };

  // Helper function to regenerate Elimination Chamber result format
  const regenerateEliminationChamberResult = (match, wrestlersList) => {
    if ((match.matchType === 'Elimination Chamber' || match.stipulation === 'Elimination Chamber') && 
        match.winner && eventStatus === 'completed') {
      
      const winnerName = wrestlersList.find(w => w.id === match.winner)?.name || match.winner;
      
      // Check if there are eliminations to format
      if (match.eliminationChamberData && match.eliminationChamberData.eliminations && 
          Array.isArray(match.eliminationChamberData.eliminations)) {
        const validEliminations = match.eliminationChamberData.eliminations.filter(e => e.eliminated && e.eliminatedBy);
        
        if (validEliminations.length > 0) {
          const elimStrings = validEliminations.map(elim => {
            const eliminatedName = wrestlersList.find(w => w.id === elim.eliminated)?.name || elim.eliminated;
            const eliminatedByName = wrestlersList.find(w => w.id === elim.eliminatedBy)?.name || elim.eliminatedBy;
            const eliminatedByName2 = elim.eliminatedBy2 ? wrestlersList.find(w => w.id === elim.eliminatedBy2)?.name || elim.eliminatedBy2 : null;
            if (eliminatedByName2) {
              return `${eliminatedByName} & ${eliminatedByName2} eliminated ${eliminatedName}${elim.time ? ` (${elim.time})` : ''}`;
            }
            return eliminatedByName ? `${eliminatedByName} eliminated ${eliminatedName}${elim.time ? ` (${elim.time})` : ''}` : eliminatedName;
          });
          const eliminationsText = ` [Eliminations: ${elimStrings.join(' → ')}]`;
          return `${winnerName} won the Elimination Chamber${eliminationsText}`;
        }
      }
      
      // If no eliminations data but there's a winner, return the basic result
      return `${winnerName} won the Elimination Chamber`;
    }
    return match.result; // Return existing result if not an Elimination Chamber or no winner
  };

  // Save the edited event
  const handleSaveEvent = (e, navigateBack = false) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    if (!name || !date || !location) {
      alert('Please fill out all event fields.');
      return;
    }

    // For completed or live events, require at least one match
    if (eventStatus === 'completed' || eventStatus === 'live') {
      if (!Array.isArray(matches) || matches.length === 0) {
        alert('Completed or live events must have at least one match.');
        return;
      }
    }
    
    // Debug: Log the matches state at the start of handleSaveEvent
    console.log('handleSaveEvent - matches state at start:', JSON.stringify(matches, null, 2));
    
    // Regenerate Battle Royal, Royal Rumble, and Elimination Chamber results with new format
    const updatedMatches = matches.map(match => {
      if ((match.matchType === 'Battle Royal' || match.stipulation === 'Battle Royal') && 
          match.battleRoyalData && match.battleRoyalData.eliminations) {
        const newResult = regenerateBattleRoyalResult(match, wrestlers);
        // Preserve battleRoyalData structure including eliminatedBy2 - use spread operator to preserve ALL properties
        const preservedEliminations = match.battleRoyalData.eliminations.map(elim => {
          // Spread all existing properties to ensure nothing is lost
          return { ...elim };
        });
        console.log('handleSaveEvent - match.battleRoyalData.eliminations:', JSON.stringify(match.battleRoyalData.eliminations, null, 2));
        console.log('handleSaveEvent - preservedEliminations:', JSON.stringify(preservedEliminations, null, 2));
        return { 
          ...match, 
          result: newResult,
          battleRoyalData: {
            ...match.battleRoyalData,
            eliminations: preservedEliminations
          }
        };
      }
      if ((match.matchType === 'Royal Rumble' || match.stipulation === 'Royal Rumble') && 
          match.royalRumbleData && match.royalRumbleData.eliminations) {
        const newResult = regenerateRoyalRumbleResult(match, wrestlers);
        // Preserve royalRumbleData structure including eliminatedBy2
        const preservedEliminations = match.royalRumbleData.eliminations.map(elim => {
          return { ...elim };
        });
        return { 
          ...match, 
          result: newResult,
          royalRumbleData: {
            ...match.royalRumbleData,
            eliminations: preservedEliminations
          }
        };
      }
      if ((match.matchType === 'Elimination Chamber' || match.stipulation === 'Elimination Chamber') && 
          match.eliminationChamberData && match.eliminationChamberData.eliminations) {
        const newResult = regenerateEliminationChamberResult(match, wrestlers);
        // Preserve eliminationChamberData structure including eliminatedBy2
        const preservedEliminations = match.eliminationChamberData.eliminations.map(elim => {
          return { ...elim };
        });
        return { 
          ...match, 
          result: newResult,
          eliminationChamberData: {
            ...match.eliminationChamberData,
            eliminations: preservedEliminations
          }
        };
      }
      return match;
    });
    
    updateEvent({
      id: event.id,
      name,
      date,
      location,
      matches: updatedMatches,
      status: eventStatus,
      isLive: eventStatus === 'live'
    });
    // Show a confirmation when staying on the page (top button).
    if (!navigateBack) {
      setSaveMessage('Event details saved.');
      // Optionally clear after a short delay so it doesn't linger forever.
      setTimeout(() => setSaveMessage(''), 3000);
    }
    if (navigateBack) {
      navigate('/');
    }
  };

  return (
    <div style={appBackground}>
      <div style={sectionStyle}>
        <Link
          to="/"
          onClick={e => {
            if (hasUnsavedChangesEditEvent &&
              !window.confirm('You have unsaved changes for this event. Are you sure you want to go back and lose these changes?')
            ) {
              e.preventDefault();
            }
          }}
        >
          ← Back to Events
        </Link>
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
            style={{ marginBottom: 8, background: '#27ae60', color: 'white', padding: '10px 24px', border: 'none', borderRadius: 4, fontWeight: 700 }}
            onClick={e => handleSaveEvent(e, false)}
          >
            Save Event Details
          </button>
        )}
        {saveMessage && (
          <div style={{ marginBottom: 16, color: '#27ae60', fontWeight: 600 }}>
            {saveMessage}
          </div>
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
                          console.log('🔵 EditEvent - onSave callback called');
                          console.log('🔵 EditEvent - updatedMatch.battleRoyalData:', JSON.stringify(updatedMatch.battleRoyalData, null, 2));
                          if (updatedMatch.battleRoyalData && updatedMatch.battleRoyalData.eliminations) {
                            const elimsWithEliminatedBy2 = updatedMatch.battleRoyalData.eliminations.filter(e => e.eliminatedBy2);
                            console.log('🔵 EditEvent - eliminations with eliminatedBy2:', elimsWithEliminatedBy2.length);
                            if (elimsWithEliminatedBy2.length > 0) {
                              console.log('🔵 EditEvent - eliminations with eliminatedBy2:', JSON.stringify(elimsWithEliminatedBy2, null, 2));
                            }
                          }
                          const updated = [...matches];
                          updated[idx] = updatedMatch;
                          console.log('🔵 EditEvent - updated match at index', idx, 'battleRoyalData:', JSON.stringify(updated[idx].battleRoyalData, null, 2));
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
        {canEdit && (
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
                {/* Eliminations Section */}
                {brParticipants.filter(Boolean).length >= 2 && (
                  <div style={{ marginTop: 16, padding: 16, background: '#2a2a2a', borderRadius: 8, border: '1px solid #444' }}>
                    <div style={{ color: gold, fontWeight: 'bold', marginBottom: 12 }}>
                      Eliminations
                    </div>
                    <div style={{ color: '#fff', fontSize: 12, marginBottom: 12 }}>
                      Track each elimination in order.
                    </div>
                    
                    {brEliminations.map((elimination, index) => (
                      <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 8, background: '#333', borderRadius: 4, marginBottom: 8, border: '1px solid #555' }}>
                        <span style={{ color: '#fff', minWidth: '80px', fontSize: 12 }}>Elimination #{index + 1}:</span>
                        
                        <div style={{ flex: 1 }}>
                          <label style={{ color: '#fff', fontSize: 11, marginBottom: 4, display: 'block' }}>
                            Eliminated:
                          </label>
                          <select
                            value={elimination.eliminated || ''}
                            onChange={(e) => {
                              const newEliminations = [...brEliminations];
                              newEliminations[index] = { ...newEliminations[index], eliminated: e.target.value };
                              setBrEliminations(newEliminations);
                            }}
                            style={inputStyle}
                          >
                            <option value="">Select wrestler...</option>
                            {brParticipants.filter(Boolean).filter(p => {
                              // Don't show already eliminated wrestlers (except in this current elimination)
                              const alreadyEliminated = brEliminations
                                .filter((_, i) => i !== index)
                                .map(e => e.eliminated)
                                .includes(p);
                              return !alreadyEliminated;
                            }).map(slug => (
                              <option key={slug} value={slug}>{wrestlers.find(w => w.id === slug)?.name || slug}</option>
                            ))}
                          </select>
                        </div>

                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <label style={{ color: '#fff', fontSize: 11, marginBottom: 4, display: 'block', flex: 1 }}>
                              Eliminated by:
                            </label>
                            {!elimination.eliminatedBy2 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newEliminations = [...brEliminations];
                                  newEliminations[index] = { ...newEliminations[index], eliminatedBy2: '' };
                                  setBrEliminations(newEliminations);
                                }}
                                style={{
                                  background: gold,
                                  color: '#232323',
                                  border: 'none',
                                  borderRadius: 4,
                                  padding: '4px 8px',
                                  cursor: 'pointer',
                                  fontSize: 14,
                                  fontWeight: 'bold',
                                  height: 'fit-content'
                                }}
                                title="Add second eliminator"
                              >
                                +
                              </button>
                            )}
                          </div>
                          <select
                            value={elimination.eliminatedBy || ''}
                            onChange={(e) => {
                              const newEliminations = [...brEliminations];
                              newEliminations[index] = { ...newEliminations[index], eliminatedBy: e.target.value };
                              setBrEliminations(newEliminations);
                            }}
                            style={inputStyle}
                          >
                            <option value="">Select wrestler...</option>
                            {brParticipants.filter(Boolean).filter(p => p !== elimination.eliminated && p !== elimination.eliminatedBy2).map(slug => (
                              <option key={slug} value={slug}>{wrestlers.find(w => w.id === slug)?.name || slug}</option>
                            ))}
                          </select>
                          {elimination.eliminatedBy2 !== undefined && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <label style={{ color: '#fff', fontSize: 11, marginBottom: 4, display: 'block', flex: 1 }}>
                                  Second eliminator:
                                </label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newEliminations = [...brEliminations];
                                    const updatedElim = { ...newEliminations[index] };
                                    delete updatedElim.eliminatedBy2;
                                    newEliminations[index] = updatedElim;
                                    setBrEliminations(newEliminations);
                                  }}
                                  style={{
                                    background: '#d32f2f',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 4,
                                    padding: '4px 8px',
                                    cursor: 'pointer',
                                    fontSize: 14,
                                    fontWeight: 'bold',
                                    height: 'fit-content'
                                  }}
                                  title="Remove second eliminator"
                                >
                                  ×
                                </button>
                              </div>
                              <select
                                value={elimination.eliminatedBy2 || ''}
                                onChange={(e) => {
                                  const newEliminations = [...brEliminations];
                                  newEliminations[index] = { ...newEliminations[index], eliminatedBy2: e.target.value };
                                  setBrEliminations(newEliminations);
                                }}
                                style={inputStyle}
                              >
                                <option value="">Select second wrestler...</option>
                                {brParticipants.filter(Boolean).filter(p => p !== elimination.eliminated && p !== elimination.eliminatedBy).map(slug => (
                                  <option key={slug} value={slug}>{wrestlers.find(w => w.id === slug)?.name || slug}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>

                        <div style={{ flex: 0.8 }}>
                          <label style={{ color: '#fff', fontSize: 11, marginBottom: 4, display: 'block' }}>
                            Time:
                          </label>
                          <input
                            type="text"
                            value={elimination.time || ''}
                            onChange={(e) => {
                              const newEliminations = [...brEliminations];
                              newEliminations[index] = { ...newEliminations[index], time: e.target.value };
                              setBrEliminations(newEliminations);
                            }}
                            placeholder="e.g. 6:52"
                            style={inputStyle}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const newEliminations = brEliminations.filter((_, i) => i !== index);
                            setBrEliminations(newEliminations);
                          }}
                          style={{
                            background: '#d32f2f',
                            color: 'white',
                            border: 'none',
                            borderRadius: 4,
                            padding: '8px 12px',
                            cursor: 'pointer',
                            fontSize: 12,
                            height: 'fit-content',
                            marginTop: 20
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}

                    {brEliminations.length < brParticipants.filter(Boolean).length - 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setBrEliminations([...brEliminations, { eliminated: '', eliminatedBy: '', time: '' }]);
                        }}
                        style={{
                          background: gold,
                          color: '#232323',
                          border: 'none',
                          borderRadius: 4,
                          padding: '8px 16px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          marginTop: 8
                        }}
                      >
                        + Add Elimination
                      </button>
                    )}
                  </div>
                )}

                {/* Winner Selection - After Eliminations */}
                {eventStatus === 'completed' && brParticipants.filter(Boolean).length >= 2 && (
                  <div style={{ marginTop: 16 }}>
                    <label style={{ color: gold, fontWeight: 600 }}>Winner:</label>
                    <select 
                      value={brWinner} 
                      onChange={e => setBrWinner(e.target.value)} 
                      style={inputStyle} 
                      required={eventStatus === 'completed'}
                    >
                      <option value="">Select winner</option>
                      {brParticipants.filter(Boolean).map((slug, i) => {
                        // Auto-select if this is the last eliminator and no winner is set yet
                        const isLastEliminator = brEliminations.length > 0 && 
                          brEliminations[brEliminations.length - 1]?.eliminatedBy === slug;
                        return (
                          <option key={i} value={slug}>
                            {wrestlers.find(w => w.id === slug)?.name || slug}
                            {isLastEliminator && !brWinner ? ' (Last Eliminator)' : ''}
                          </option>
                        );
                      })}
                    </select>
                    <div style={{ fontSize: 12, color: '#bbb', marginTop: 4 }}>
                      The winner is typically the wrestler who eliminated the last opponent.
                    </div>
                  </div>
                )}
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
            ) : (match.matchType === 'Survivor Series-style 10-man Tag Team Elimination match' || match.matchType?.includes('Survivor Series')) ? (
              // Survivor Series matches always use the SurvivorSeriesMatchBuilder (has elimination tracking)
              <SurvivorSeriesMatchBuilder
                key={`survivor-series-edit-${match.matchType}`}
                wrestlers={wrestlers}
                value={match.participants}
                onChange={value => {
                  console.log('SurvivorSeriesMatchBuilder onChange called with value:', value);
                  const newMatch = { ...match, participants: value };
                  setMatch(newMatch);
                }}
                onResultChange={survivorResult => {
                  console.log('Survivor Series result:', survivorResult);
                  // Store the survivor series data
                  const winningTeamNames = survivorResult.winningTeam === 1 
                    ? survivorResult.team1Names.join(' & ')
                    : survivorResult.team2Names.join(' & ');
                  const resultText = `${winningTeamNames} def. ${survivorResult.winningTeam === 1 ? survivorResult.team2Names.join(' & ') : survivorResult.team1Names.join(' & ')} (Survivor: ${survivorResult.survivorName}${survivorResult.time ? `, ${survivorResult.time}` : ''})`;
                  setMatch(prev => ({
                    ...prev,
                    survivorSeriesData: survivorResult,
                    winner: winningTeamNames,
                    method: 'Elimination',
                    time: survivorResult.time,
                    result: resultText
                  }));
                }}
              />
            ) : (
              <>
                {/* Check if this is a title match - if so, always use visual builder */}
                {(() => {
                  const isTitleMatch = match.title && match.title !== 'None' && match.stipulation !== 'No. 1 Contender Match';
                  const shouldUseVisualBuilder = isTitleMatch ? true : useVisualBuilder;
                  
                  return (
                    <>
                      {/* Participant Input Toggle - Hidden for War Games, Survivor Series matches, and title matches */}
                      {match.matchType !== '5-on-5 War Games Match' && !match.matchType?.includes('War Games') && match.matchType !== 'Survivor Series-style 10-man Tag Team Elimination match' && !match.matchType?.includes('Survivor Series') && !isTitleMatch && (
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
                      
                      {isTitleMatch && (
                        <div style={{ marginBottom: 16, padding: 8, background: '#2a2a2a', borderRadius: 4, border: '1px solid #C6A04F' }}>
                          <div style={{ color: '#C6A04F', fontWeight: 600, fontSize: 14 }}>
                            💡 Title Match: Use the "C" button next to participants to mark the defending champion
                          </div>
                        </div>
                      )}

                      {shouldUseVisualBuilder && match.matchType !== '5-on-5 War Games Match' && !match.matchType?.includes('War Games') && match.matchType !== 'Survivor Series-style 10-man Tag Team Elimination match' && !match.matchType?.includes('Survivor Series') ? (
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
                  );
                })()}
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
            {/* Title outcome should appear above special match winner on edit-event match form */}
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
          disabled={
            (eventStatus === 'completed' || eventStatus === 'live') &&
            (!Array.isArray(matches) || matches.length === 0)
          }
          onClick={e => handleSaveEvent(e, true)}
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}

function PrivacyPolicyPage() {
  return (
    <div style={{ color: '#fff', padding: 40, maxWidth: 900, margin: '0 auto' }}>
      <h2 style={{ marginBottom: 16 }}>Privacy Policy</h2>
      <p style={{ marginBottom: 16 }}>
        This Privacy Policy explains how Pro Wrestling Boxscore (“we”, “us”, or “our”) collects,
        uses, and protects information when you visit our website.
      </p>

      <h3 style={{ marginTop: 24, marginBottom: 8 }}>1. Information We Collect</h3>
      <p style={{ marginBottom: 8 }}>
        We do not require you to create an account or log in to use this site. However, we may
        collect the following types of information:
      </p>
      <ul style={{ marginLeft: 20, marginBottom: 16 }}>
        <li style={{ marginBottom: 4 }}>
          <strong>Information you provide directly</strong>, such as your name, email address, and
          message content when you contact us via the contact form or email.
        </li>
        <li style={{ marginBottom: 4 }}>
          <strong>Log and usage data</strong>, such as your IP address, browser type, operating
          system, referring URLs, pages viewed, and the dates/times of your visits. This is
          standard web server log information.
        </li>
        <li style={{ marginBottom: 4 }}>
          <strong>Cookies and similar technologies</strong>, which may be set by us or by
          third-party services (including Google) to remember your preferences and to measure
          traffic and advertising performance.
        </li>
      </ul>

      <h3 style={{ marginTop: 24, marginBottom: 8 }}>2. Use of Cookies and Advertising</h3>
      <p style={{ marginBottom: 8 }}>
        We use Google AdSense and other Google services to display ads on this site. Third-party
        vendors, including Google, use cookies and similar technologies to serve ads based on your
        prior visits to this and other websites.
      </p>
      <p style={{ marginBottom: 8 }}>
        Google&apos;s use of advertising cookies enables it and its partners to serve ads to you
        based on your visit to this site and/or other sites on the Internet. These cookies may be
        used to measure ad performance and prevent the same ads from being shown too often.
      </p>
      <p style={{ marginBottom: 8 }}>
        You can learn more about how Google uses data from partner sites and apps, and how to
        control your ad settings, by visiting Google&apos;s Ads Settings or the Google privacy
        resources available at{' '}
        <a
          href="https://policies.google.com/technologies/ads"
          target="_blank"
          rel="noreferrer"
          style={{ color: '#C6A04F' }}
        >
          Google Ads &amp; Cookies
        </a>
        .
      </p>
      <p style={{ marginBottom: 16 }}>
        You may also be able to opt out of personalized advertising from many companies by visiting
        industry opt-out pages such as the Digital Advertising Alliance (for example,{' '}
        <a
          href="https://optout.aboutads.info"
          target="_blank"
          rel="noreferrer"
          style={{ color: '#C6A04F' }}
        >
          optout.aboutads.info
        </a>
        ).
      </p>

      <h3 style={{ marginTop: 24, marginBottom: 8 }}>3. How We Use Your Information</h3>
      <p style={{ marginBottom: 8 }}>We use the information we collect to:</p>
      <ul style={{ marginLeft: 20, marginBottom: 16 }}>
        <li style={{ marginBottom: 4 }}>Provide, operate, and improve the website and its features.</li>
        <li style={{ marginBottom: 4 }}>Respond to inquiries you send via the contact form or email.</li>
        <li style={{ marginBottom: 4 }}>
          Monitor site usage and performance, including aggregate statistics on page views and traffic.
        </li>
        <li style={{ marginBottom: 4 }}>
          Display and measure advertising, including personalized ads where supported and permitted.
        </li>
      </ul>

      <h3 style={{ marginTop: 24, marginBottom: 8 }}>4. Sharing of Information</h3>
      <p style={{ marginBottom: 8 }}>
        We do not sell or rent your personal information. We may share limited information in the
        following situations:
      </p>
      <ul style={{ marginLeft: 20, marginBottom: 16 }}>
        <li style={{ marginBottom: 4 }}>
          <strong>Service providers and partners</strong>, such as analytics and advertising
          partners (including Google) that process data on our behalf under their own privacy
          policies.
        </li>
        <li style={{ marginBottom: 4 }}>
          <strong>Legal requirements</strong>, when we believe disclosure is necessary to comply
          with a law, regulation, legal process, or governmental request, or to protect the rights,
          property, or safety of us, our users, or others.
        </li>
      </ul>

      <h3 style={{ marginTop: 24, marginBottom: 8 }}>5. Data Retention</h3>
      <p style={{ marginBottom: 16 }}>
        We retain contact form submissions and related correspondence for as long as necessary to
        respond to your inquiry and maintain appropriate records. Log and analytics data may be
        stored for a limited period consistent with our operational needs and the policies of our
        analytics and advertising providers.
      </p>

      <h3 style={{ marginTop: 24, marginBottom: 8 }}>6. Your Choices</h3>
      <ul style={{ marginLeft: 20, marginBottom: 16 }}>
        <li style={{ marginBottom: 4 }}>
          <strong>Browser controls</strong>: Most browsers allow you to block or delete cookies.
          Doing so may affect how some features of the site work.
        </li>
        <li style={{ marginBottom: 4 }}>
          <strong>Advertising preferences</strong>: You can manage Google ad personalization in
          your Google account&apos;s Ads Settings and use industry opt-out tools such as{' '}
          <a
            href="https://optout.aboutads.info"
            target="_blank"
            rel="noreferrer"
            style={{ color: '#C6A04F' }}
          >
            optout.aboutads.info
          </a>
          .
        </li>
        <li style={{ marginBottom: 4 }}>
          <strong>Contacting us</strong>: You can contact us if you have questions or would like to
          request updates or deletion of personal information you previously provided (subject to
          any legal obligations we may have to retain certain records).
        </li>
      </ul>

      <h3 style={{ marginTop: 24, marginBottom: 8 }}>7. Children&apos;s Privacy</h3>
      <p style={{ marginBottom: 16 }}>
        This site is not directed to children under 13, and we do not knowingly collect personal
        information from children under 13. If you believe that a child has provided us with
        personal information, please contact us so we can take appropriate action.
      </p>

      <h3 style={{ marginTop: 24, marginBottom: 8 }}>8. Changes to This Policy</h3>
      <p style={{ marginBottom: 16 }}>
        We may update this Privacy Policy from time to time. When we do, we will revise the “Last
        updated” date at the bottom of this page. Your continued use of the site after any changes
        means you accept the updated policy.
      </p>

      <h3 style={{ marginTop: 24, marginBottom: 8 }}>9. Contact Us</h3>
      <p style={{ marginBottom: 4 }}>
        If you have any questions about this Privacy Policy, you can contact us at:
      </p>
      <p style={{ marginBottom: 4 }}>
        Email:{' '}
        <a
          href="mailto:wrestlingboxscore@gmail.com"
          style={{ color: '#C6A04F', textDecoration: 'underline' }}
        >
          wrestlingboxscore@gmail.com
        </a>
      </p>
      <p style={{ marginTop: 24, fontSize: 13, color: '#aaa' }}>Last updated: January 2026</p>
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
  // Helper function to convert human-readable date to YYYY-MM-DD format
  const convertDateToISO = (dateStr) => {
    if (!dateStr) return null;
    
    // If already in YYYY-MM-DD format, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    
    // Try to parse human-readable format (e.g., "November 1, 2025")
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        console.warn(`Could not parse date: ${dateStr}`);
        return dateStr; // Return original if parsing fails
      }
      
      // Format as YYYY-MM-DD in local timezone (not UTC) to avoid day shift
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.warn(`Error parsing date: ${dateStr}`, error);
      return dateStr; // Return original if parsing fails
    }
  };

  // Helper function to extract winner slug from match
  const extractWinnerSlug = (match, wrestlerMap) => {
    if (!match || !match.status || match.status !== 'completed') return null;
    
    // Try to get winner from match.winner field
    if (match.winner) {
      // Check if it's already a slug in wrestlerMap
      if (wrestlerMap[match.winner]) {
        return match.winner;
      }
      // Try to find by name (case-insensitive, handle variations)
      const normalize = (str) => (str || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
      const found = Object.entries(wrestlerMap).find(([slug, wrestler]) => {
        const matchWinnerNorm = normalize(match.winner);
        const wrestlerNameNorm = normalize(wrestler.name);
        return wrestlerNameNorm === matchWinnerNorm || 
               wrestler.name === match.winner || 
               wrestler.name.toLowerCase() === match.winner.toLowerCase();
      });
      if (found) return found[0];
    }
    
    // Try to extract from result string (e.g., "Winner def. Loser")
    if (match.result && match.result.includes(' def. ')) {
      const winnerPart = match.result.split(' def. ')[0].trim();
      
      // Check if it's a team with parentheses (e.g., "Team Name (slug1 & slug2)")
      const teamMatch = winnerPart.match(/^([^(]+)\s*\(([^)]+)\)$/);
      if (teamMatch) {
        // For tag teams, return the team identifier (could be team name or first slug)
        const slugs = teamMatch[2].split('&').map(s => s.trim()).filter(Boolean);
        // Try to find tag team by slugs, or return first slug
        return slugs[0] || null;
      }
      
      // Check if it's multiple slugs (e.g., "slug1 & slug2")
      if (winnerPart.includes('&')) {
        const slugs = winnerPart.split('&').map(s => s.trim()).filter(Boolean);
        return slugs[0] || null;
      }
      
      // Check if it's a slug in wrestlerMap
      if (wrestlerMap[winnerPart]) {
        return winnerPart;
      }
      
      // Try to find by name (case-insensitive, handle variations)
      const normalize = (str) => (str || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
      const found = Object.entries(wrestlerMap).find(([slug, wrestler]) => {
        const winnerPartNorm = normalize(winnerPart);
        const wrestlerNameNorm = normalize(wrestler.name);
        return wrestlerNameNorm === winnerPartNorm ||
               wrestler.name === winnerPart || 
               wrestler.name.toLowerCase() === winnerPart.toLowerCase();
      });
      if (found) return found[0];
    }
    
    // Also check participants if winner is listed there
    if (match.participants && typeof match.participants === 'string') {
      const parts = match.participants.split(' vs ');
      if (parts.length >= 2 && match.winner) {
        // Check which side the winner is on
        for (const side of parts) {
          const sideSlugs = side.split('&').map(s => s.trim()).filter(Boolean);
          // Check if winner name or slug matches any part of this side
          const normalize = (str) => (str || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
          const matchWinnerNorm = normalize(match.winner);
          
          for (const slug of sideSlugs) {
            if (wrestlerMap[slug]) {
              const wrestlerNameNorm = normalize(wrestlerMap[slug].name);
              if (wrestlerNameNorm === matchWinnerNorm || slug === match.winner) {
                return slug;
              }
            }
          }
        }
      }
    }
    
    return null;
  };

  // Helper function to extract winner name from match
  const extractWinnerName = (match, wrestlerMap) => {
    if (!match || !match.status || match.status !== 'completed') return null;
    
    if (match.winner) {
      // Check if it's a slug
      if (wrestlerMap[match.winner]) {
        return wrestlerMap[match.winner].name;
      }
      // Might already be a name
      return match.winner;
    }
    
    if (match.result && match.result.includes(' def. ')) {
      return match.result.split(' def. ')[0].trim();
    }
    
    return null;
  };

  // Helper function to convert title name to championship ID
  const titleToChampionshipId = (titleName) => {
    const mapping = {
      'Undisputed WWE Championship': 'wwe-championship',
      'World Heavyweight Championship': 'world-heavyweight-championship',
      "Men's IC Championship": 'mens-ic-championship',
      "Men's U.S. Championship": 'mens-us-championship',
      'Raw Tag Team Championship': 'raw-tag-team-championship',
      'SmackDown Tag Team Championship': 'smackdown-tag-team-championship',
      "Men's Speed Championship": 'mens-speed-championship',
      "WWE Women's Championship": 'wwe-womens-championship',
      "Women's World Championship": 'womens-world-championship',
      "Women's IC Championship": 'womens-ic-championship',
      "Women's U.S. Championship": 'womens-us-championship',
      "Women's Tag Team Championship": 'womens-tag-team-championship',
      "Women's Speed Championship": 'womens-speed-championship'
    };
    return mapping[titleName] || null;
  };

  // Improved function to extract winner info (handles both individuals and tag teams)
  const extractWinnerInfo = async (match, wrestlerMap, tagTeamsMap) => {
    if (!match || !match.status || match.status !== 'completed') {
      return { slug: null, name: null };
    }

    // Helper to normalize strings for comparison
    const normalize = (str) => (str || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');

    // 1. Try to get winner from match.winner field
    if (match.winner) {
      // Check if it's a tag team ID
      if (tagTeamsMap[match.winner]) {
        return { slug: match.winner, name: tagTeamsMap[match.winner] };
      }
      
      // Check if it's a tag team name
      const winnerLower = match.winner.toLowerCase();
      if (tagTeamsMap[winnerLower] && typeof tagTeamsMap[winnerLower] === 'object') {
        return { slug: tagTeamsMap[winnerLower].id, name: tagTeamsMap[winnerLower].name };
      }
      
      // Check if it's a slug in wrestlerMap
      if (wrestlerMap[match.winner]) {
        return { slug: match.winner, name: wrestlerMap[match.winner].name };
      }
      
      // Try to find by name in wrestlerMap
      const found = Object.entries(wrestlerMap).find(([slug, wrestler]) => {
        const matchWinnerNorm = normalize(match.winner);
        const wrestlerNameNorm = normalize(wrestler.name);
        return wrestlerNameNorm === matchWinnerNorm || 
               wrestler.name === match.winner || 
               wrestler.name.toLowerCase() === match.winner.toLowerCase();
      });
      if (found) {
        return { slug: found[0], name: found[1].name };
      }
      
      // Might already be a name - check if it matches a tag team
      for (const [key, value] of Object.entries(tagTeamsMap)) {
        if (typeof value === 'object' && normalize(value.name) === normalize(match.winner)) {
          return { slug: value.id, name: value.name };
        }
      }
    }

    // 2. Try to extract from result string (e.g., "Winner def. Loser")
    if (match.result && match.result.includes(' def. ')) {
      const winnerPart = match.result.split(' def. ')[0].trim();
      
      // Check if it's a team with parentheses (e.g., "The Usos (jey-uso & jimmy-uso)")
      const teamMatch = winnerPart.match(/^([^(]+)\s*\(([^)]+)\)$/);
      if (teamMatch) {
        const teamName = teamMatch[1].trim();
        const slugs = teamMatch[2].split('&').map(s => s.trim()).filter(Boolean);
        
        // Try to find tag team by name
        const teamNameLower = teamName.toLowerCase();
        if (tagTeamsMap[teamNameLower] && typeof tagTeamsMap[teamNameLower] === 'object') {
          return { slug: tagTeamsMap[teamNameLower].id, name: tagTeamsMap[teamNameLower].name };
        }
        
        // Try to find tag team by matching slugs with tag_team_members
        if (slugs.length >= 2) {
          const { data: teamMembers, error: membersError } = await supabase
            .from('tag_team_members')
            .select('tag_team_id')
            .in('wrestler_slug', slugs)
            .eq('active', true);
          
          if (!membersError && teamMembers && teamMembers.length > 0) {
            // Find the tag team that has all the slugs
            const teamIds = [...new Set(teamMembers.map(m => m.tag_team_id))];
            for (const teamId of teamIds) {
              const { data: fullTeam, error: teamError } = await supabase
                .from('tag_team_members')
                .select('wrestler_slug')
                .eq('tag_team_id', teamId)
                .eq('active', true);
              
              if (!teamError && fullTeam) {
                const teamSlugs = fullTeam.map(m => m.wrestler_slug);
                const allMatch = slugs.every(slug => teamSlugs.includes(slug));
                if (allMatch && slugs.length === teamSlugs.length) {
                  const { data: team, error: teamNameError } = await supabase
                    .from('tag_teams')
                    .select('id, name')
                    .eq('id', teamId)
                    .single();
                  
                  if (!teamNameError && team) {
                    return { slug: team.id, name: team.name };
                  }
                }
              }
            }
          }
        }
        
        // Fallback: return team name and construct slug
        return { slug: teamName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''), name: teamName };
      }
      
      // Check if it's multiple slugs (e.g., "slug1 & slug2")
      if (winnerPart.includes('&')) {
        const slugs = winnerPart.split('&').map(s => s.trim()).filter(Boolean);
        // Try to find tag team by slugs
        if (slugs.length >= 2) {
          const { data: teamMembers, error: membersError } = await supabase
            .from('tag_team_members')
            .select('tag_team_id')
            .in('wrestler_slug', slugs)
            .eq('active', true);
          
          if (!membersError && teamMembers && teamMembers.length > 0) {
            const teamIds = [...new Set(teamMembers.map(m => m.tag_team_id))];
            for (const teamId of teamIds) {
              const { data: fullTeam, error: teamError } = await supabase
                .from('tag_team_members')
                .select('wrestler_slug')
                .eq('tag_team_id', teamId)
                .eq('active', true);
              
              if (!teamError && fullTeam) {
                const teamSlugs = fullTeam.map(m => m.wrestler_slug);
                const allMatch = slugs.every(slug => teamSlugs.includes(slug));
                if (allMatch && slugs.length === teamSlugs.length) {
                  const { data: team, error: teamNameError } = await supabase
                    .from('tag_teams')
                    .select('id, name')
                    .eq('id', teamId)
                    .single();
                  
                  if (!teamNameError && team) {
                    return { slug: team.id, name: team.name };
                  }
                }
              }
            }
          }
        }
        // Fallback: return first slug and construct name
        return { slug: slugs[0], name: slugs.join(' & ') };
      }
      
      // Check if it's a slug in wrestlerMap
      if (wrestlerMap[winnerPart]) {
        return { slug: winnerPart, name: wrestlerMap[winnerPart].name };
      }
      
      // Try to find by name in wrestlerMap
      const found = Object.entries(wrestlerMap).find(([slug, wrestler]) => {
        const winnerPartNorm = normalize(winnerPart);
        const wrestlerNameNorm = normalize(wrestler.name);
        return wrestlerNameNorm === winnerPartNorm ||
               wrestler.name === winnerPart || 
               wrestler.name.toLowerCase() === winnerPart.toLowerCase();
      });
      if (found) {
        return { slug: found[0], name: found[1].name };
      }
      
      // Try to find as tag team name
      const winnerPartLower = winnerPart.toLowerCase();
      if (tagTeamsMap[winnerPartLower] && typeof tagTeamsMap[winnerPartLower] === 'object') {
        return { slug: tagTeamsMap[winnerPartLower].id, name: tagTeamsMap[winnerPartLower].name };
      }
      
      // Fallback: return as-is (might be a name)
      return { slug: winnerPart.toLowerCase().replace(/\s+/g, '-'), name: winnerPart };
    }

    // 3. Also check participants if winner is listed there
    if (match.participants && typeof match.participants === 'string') {
      const parts = match.participants.split(' vs ');
      if (parts.length >= 2 && match.result) {
        // Determine which side won based on result
        const resultWinner = match.result.includes(' def. ') 
          ? match.result.split(' def. ')[0].trim()
          : null;
        
        if (resultWinner) {
          for (const side of parts) {
            // Check if this side matches the winner
            const sideNorm = normalize(side);
            const resultWinnerNorm = normalize(resultWinner);
            
            if (sideNorm.includes(resultWinnerNorm) || resultWinnerNorm.includes(sideNorm)) {
              // Extract team name if in parentheses format
              const teamMatch = side.match(/^([^(]+)\s*\(([^)]+)\)$/);
              if (teamMatch) {
                const teamName = teamMatch[1].trim();
                const slugs = teamMatch[2].split('&').map(s => s.trim()).filter(Boolean);
                
                // Try to find tag team
                const teamNameLower = teamName.toLowerCase();
                if (tagTeamsMap[teamNameLower] && typeof tagTeamsMap[teamNameLower] === 'object') {
                  return { slug: tagTeamsMap[teamNameLower].id, name: tagTeamsMap[teamNameLower].name };
                }
                
                // Fallback
                return { slug: teamName.toLowerCase().replace(/\s+/g, '-'), name: teamName };
              }
              
              // Check if it's individual wrestlers
              const sideSlugs = side.split('&').map(s => s.trim()).filter(Boolean);
              if (sideSlugs.length === 1 && wrestlerMap[sideSlugs[0]]) {
                return { slug: sideSlugs[0], name: wrestlerMap[sideSlugs[0]].name };
              }
            }
          }
        }
      }
    }

    return { slug: null, name: null };
  };

  // Function to update championships when matches are completed
  const updateChampionships = async (matches, eventId, eventDate, wrestlerMap) => {
    try {
      // Find all matches with title changes
      const titleMatches = matches.filter(match => 
        match.title && 
        match.title !== 'None' && 
        match.status === 'completed' &&
        match.titleOutcome === 'New Champion'
      );

      console.log('Updating championships - found title matches:', titleMatches.length);
      
      // Fetch tag teams once for all matches
      const { data: tagTeams, error: tagTeamsError } = await supabase
        .from('tag_teams')
        .select('id, name')
        .eq('active', true);
      
      const tagTeamsMap = {};
      if (!tagTeamsError && tagTeams) {
        tagTeams.forEach(team => {
          tagTeamsMap[team.id] = team.name;
          tagTeamsMap[team.name.toLowerCase()] = { id: team.id, name: team.name };
        });
      }
      
      for (const match of titleMatches) {
        console.log(`Processing title match: ${match.title}`, {
          matchResult: match.result,
          matchWinner: match.winner,
          matchParticipants: match.participants,
          titleOutcome: match.titleOutcome
        });
        
        const winnerInfo = await extractWinnerInfo(match, wrestlerMap, tagTeamsMap);
        const winnerSlug = winnerInfo.slug;
        const winnerName = winnerInfo.name;
        
        console.log(`Extracted winner - slug: ${winnerSlug}, name: ${winnerName}`);
        
        if (!winnerSlug || !winnerName) {
          console.warn(`Could not extract winner for title match: ${match.title}`, {
            match,
            wrestlerMapKeys: Object.keys(wrestlerMap).slice(0, 10) // Show first 10 keys for debugging
          });
          continue;
        }

        // Get the previous champion from the championships table
        const { data: currentChamp, error: fetchError } = await supabase
          .from('championships')
          .select('*')
          .eq('title_name', match.title)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found"
          console.error(`Error fetching current champion for ${match.title}:`, fetchError);
          continue;
        }

        const previousChampion = currentChamp?.current_champion || 'VACANT';
        const previousChampionSlug = currentChamp?.current_champion_slug || 'vacant';

        // Convert event date to YYYY-MM-DD format to avoid timezone issues
        const formattedDate = convertDateToISO(eventDate);
        console.log(`Date conversion: "${eventDate}" -> "${formattedDate}"`);

        // Get championship ID from title name
        const championshipId = titleToChampionshipId(match.title);

        // Update the championship
        const updateData = {
          title_name: match.title,
          current_champion: winnerName,
          current_champion_slug: winnerSlug,
          previous_champion: previousChampion,
          previous_champion_slug: previousChampionSlug,
          date_won: formattedDate,
          event_id: eventId
        };
        
        // Only include id if we have it (for upsert)
        if (championshipId) {
          updateData.id = championshipId;
        }

        const { error: updateError } = await supabase
          .from('championships')
          .upsert(updateData, {
            onConflict: championshipId ? 'id' : 'title_name'
          });

        if (updateError) {
          console.error(`Error updating championship ${match.title}:`, updateError);
        } else {
          console.log(`✅ Updated ${match.title}: ${winnerName} (${winnerSlug})`);
          console.log(`   Previous: ${previousChampion} (${previousChampionSlug})`);
          console.log(`   Event: ${eventId}, Date: ${eventDate}`);
        }
      }
    } catch (error) {
      console.error('Error updating championships:', error);
      // Don't throw - we don't want to block event updates if championship update fails
    }
  };

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
      
      // Update championships if there are any completed title matches with "New Champion"
      if (updatedEvent.matches && Array.isArray(updatedEvent.matches)) {
        const hasNewChampion = updatedEvent.matches.some(match => 
          match.title && 
          match.title !== 'None' && 
          match.status === 'completed' &&
          match.titleOutcome === 'New Champion'
        );
        if (hasNewChampion) {
          await updateChampionships(updatedEvent.matches, updatedEvent.id, updatedEvent.date, wrestlerMap);
        }
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
        <title>Pro Wrestling Boxscore - WWE Results Tonight, RAW & SmackDown Event Results</title>
        <meta
          name="description"
          content="See WWE results tonight with full match cards, including RAW results tonight and SmackDown results tonight, plus championship updates and box score-style coverage."
        />
        <meta
          name="keywords"
          content="WWE results tonight, RAW results tonight, SmackDown results tonight, WWE, wrestling, event results, match cards, wrestlers, SmackDown, RAW, NXT, pay-per-view, championship, live results, wrestling stats, WWE news"
        />
        <link rel="canonical" href="https://prowrestlingboxscore.com/" />
        {/* Open Graph and Twitter tags as above */}
      </Helmet>
      <Router>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<EventList events={events} />} />
            <Route
              path="/event/:eventId"
              element={
                <EventBoxScore
                  events={events}
                  onDelete={deleteEvent}
                  onEditMatch={handleEditMatch}
                  onRealTimeCommentaryUpdate={handleRealTimeCommentaryUpdate}
                  wrestlerMap={wrestlerMap}
                  wrestlers={wrestlers}
                />
              }
            />
            <Route
              path="/event/:eventId/match/:matchOrder"
              element={
                <MatchPageNewWrapper
                  events={events}
                  onEditMatch={handleEditMatch}
                  onRealTimeCommentaryUpdate={handleRealTimeCommentaryUpdate}
                  wrestlerMap={wrestlerMap}
                  wrestlers={wrestlers}
                />
              }
            />
            <Route path="/add-event" element={<AddEvent addEvent={addEvent} wrestlers={wrestlers} />} />
            <Route
              path="/edit-event/:eventId"
              element={<EditEvent events={events} updateEvent={updateEvent} wrestlers={wrestlers} />}
            />
            <Route path="/wrestlers" element={<WrestlersPage wrestlers={wrestlers} />} />
            <Route path="/championships" element={<ChampionshipsPage wrestlers={wrestlers} />} />
            <Route path="/participant-demo" element={<ParticipantSelectionDemo wrestlers={wrestlers} />} />
            <Route
              path="/about"
              element={
                <>
                  <Helmet>
                    <title>About Pro Wrestling Boxscore</title>
                    <meta
                      name="description"
                      content="Learn about Pro Wrestling Boxscore, our mission, and how we deliver fast, accurate WWE results for fans."
                    />
                    <link rel="canonical" href="https://prowrestlingboxscore.com/about" />
                  </Helmet>
                  <div style={{ color: '#fff', padding: 40, maxWidth: 900, margin: '0 auto' }}>
                    <h2>About Us</h2>
                    <p>
                      Pro Wrestling Boxscore delivers fast, match-by-match WWE results for fans on the move. Can&apos;t
                      watch Raw, SmackDown, or a premium live event in real time? We break down every match, winner, and
                      key moment—so you&apos;re always in the know, no matter where you are.
                    </p>
                  </div>
                </>
              }
            />
            <Route
              path="/contact"
              element={
                <>
                  <Helmet>
                    <title>Contact Pro Wrestling Boxscore</title>
                    <meta
                      name="description"
                      content="Contact Pro Wrestling Boxscore with questions, suggestions, or collaboration requests. Email: wrestlingboxscore@gmail.com"
                    />
                    <link rel="canonical" href="https://prowrestlingboxscore.com/contact" />
                  </Helmet>
                  <div style={{ color: '#fff', padding: 40, maxWidth: 900, margin: '0 auto' }}>
                    <h2>Contact</h2>
                    <p>
                      Please contact us with questions, suggestions, corrections, or if you would like to collaborate or
                      contribute to the site. Our e-mail is{' '}
                      <a
                        href="mailto:wrestlingboxscore@gmail.com"
                        style={{ color: '#C6A04F', textDecoration: 'underline' }}
                      >
                        wrestlingboxscore@gmail.com
                      </a>
                    </p>
                  </div>
                </>
              }
            />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
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
  
  if (!event) {
    return <div style={{ padding: 24, color: '#fff' }}>Event not found.</div>;
  }
  
  // Sort matches by order (same as event page) to ensure consistent lookup
  const sortedMatches = [...event.matches].sort((a, b) => {
    const orderA = a.order || 0;
    const orderB = b.order || 0;
    return orderA - orderB;
  });
  
  // Use the matchOrder as an index (1-based) to find the match in the sorted array
  // matchOrder comes from the URL and represents the position in the sorted list
  const matchOrderNum = parseInt(matchOrder, 10);
  const matchIndex = !isNaN(matchOrderNum) && matchOrderNum > 0 ? matchOrderNum - 1 : -1;
  const match = matchIndex >= 0 && matchIndex < sortedMatches.length ? sortedMatches[matchIndex] : null;
  
  const [isEditing, setIsEditing] = React.useState(false);
  const canEdit = !!user;

  if (!match) {
    return <div style={{ padding: 24, color: '#fff' }}>Match not found.</div>;
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
        {canEdit && (
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
      canEdit={canEdit}
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
    case 'Survivor Series-style 10-man Tag Team Elimination match':
      // Survivor Series: 2 teams with 5 participants each
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