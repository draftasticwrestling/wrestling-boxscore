import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';
import { events as initialEvents } from './events';
import { supabase } from './supabaseClient';
import MatchEdit from './components/MatchEdit';
import MatchPage from './components/MatchPage';
import BeltIcon from './components/BeltIcon';
import BriefcaseIcon from './components/BriefcaseIcon';
import CrownIcon from './components/CrownIcon';
import TrophyIcon from './components/TrophyIcon';
import ChamberIcon from './components/ChamberIcon';
import WarGamesIcon from './components/WarGamesIcon';
import SurvivorIcon from './components/SurvivorIcon';
import {
  STIPULATION_OPTIONS,
  METHOD_OPTIONS,
  TITLE_OPTIONS,
  SPECIAL_WINNER_OPTIONS,
  TITLE_OUTCOME_OPTIONS
} from './options';

// Place these at the top level, after imports
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
  "Last Man Standing",
  "Last Woman Standing",
  "Non-Title Match",
  "Custom/Other"
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
    console.log('Rendering wrestler:', name, logoSrc);
    return (
      <img src={logoSrc} alt={alt || name} style={style} onError={() => setImgError(true)} />
    );
  }
  return <strong style={textStyle}>{name}</strong>;
}

function EventList({ events }) {
  return (
    <div style={appBackground}>
      <div style={sectionStyle}>
        {/* Header row: title only */}
        <div style={{ textAlign: 'center', marginBottom: 0 }}>
          <h1 style={{ color: gold, margin: 0, fontSize: 36, lineHeight: 1 }}>Wrestling Box Score</h1>
        </div>
        {/* Logo centered below title */}
        <img src="/images/banner.png" alt="Wrestling Boxscore Banner" style={{
          display: 'block',
          margin: '24px auto 24px auto',
          maxWidth: 480,
          width: '100%',
        }} />
        {/* Remove Champions button, only show Add Event */}
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, marginBottom: 24 }}>
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
        </div>
        {/* WWE Event Results heading */}
        <h1 style={{
          textAlign: 'center',
          color: gold,
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
    </div>
  );
}

// Add a function to format the result string
function formatResult(winner, others) {
  if (others.length === 1) return `${winner} def. ${others[0]}`;
  if (others.length === 2) return `${winner} def. ${others[0]} and ${others[1]}`;
  return `${winner} def. ${others.slice(0, -1).join(', ')} and ${others[others.length - 1]}`;
}

// Function to get the appropriate special winner icon
function getSpecialWinnerIcon(specialWinnerType) {
  switch (specialWinnerType) {
    case "Women's Money in the Bank winner":
    case "Men's Money in the Bank winner":
      return <BriefcaseIcon size={32} />;
    case "King of the Ring winner":
    case "Queen of the Ring winner":
      return <CrownIcon size={32} />;
    case "Men's Royal Rumble winner":
    case "Women's Royal Rumble winner":
      return <TrophyIcon size={32} />;
    case "Men's Elimination Chamber winner":
    case "Women's Elimination Chamber winner":
      return <ChamberIcon size={32} />;
    case "Men's War Games winner":
    case "Women's War Games winner":
      return <WarGamesIcon size={32} />;
    case "Men's Ultimate Survivor":
    case "Women's Ultimate Survivor":
      return <SurvivorIcon size={32} />;
    default:
      return null;
  }
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
const getParticipantsDisplay = (participants) => {
  if (Array.isArray(participants)) {
    return participants.map(team => team.join(' & ')).join(' vs ');
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

// Event Box Score Component (with discreet Edit/Delete below the match card)
function EventBoxScore({ events, onDelete, onEditMatch, wrestlerMap }) {
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 24, marginBottom: 8 }}>
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
        <h3 style={{ marginTop: 24, color: gold }}>Match Results</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {matchesWithCardType.map((match, index) => {
            const [expanded, setExpanded] = React.useState(false);
            // Parse participants into sides (split by 'vs')
            const teams = getTeams(match.participants);
            // For each side, split by '&' for tag teams
            const teamStrings = teams.map(team => team.join(' & '));
            // Winner logic
            const winner = match.result && match.result.includes(' def. ')
              ? match.result.split(' def. ')[0]
              : (match.result ? match.result : '');
            // Find which side is the winner - check tag team names first, then individual names
            let winnerIndex = -1;
            if (match.tagTeams) {
              // Check tag team names first
              for (let i = 0; i < teams.length; i++) {
                if (match.tagTeams[i] && winner.startsWith(match.tagTeams[i])) {
                  winnerIndex = i;
                  break;
                }
              }
            }
            // If no tag team match found, check individual names
            if (winnerIndex === -1) {
              winnerIndex = teamStrings.findIndex(side => winner.startsWith(side));
            }
            const isTitleMatch = match.title && match.title !== 'None';
            // SVG triangle arrows for winner indication
            const triangleRight = (
              <svg width="14" height="18" viewBox="0 0 8 16" style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 8 }}>
                <polygon points="0,8 8,0 8,16" fill="#fff" />
              </svg>
            );
            const triangleLeft = (
              <svg width="14" height="18" viewBox="0 0 8 16" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }}>
                <polygon points="8,8 0,0 0,16" fill="#fff" />
              </svg>
            );
            const triangleDown = (
              <svg width="16" height="8" viewBox="0 0 16 8" style={{ display: 'block', margin: '0 auto 2px auto' }}>
                <polygon points="8,8 0,0 16,0" fill="#fff" />
              </svg>
            );
            // Top label: stipulation and/or title
            let topLabel = '';
            if (isTitleMatch && match.stipulation && match.stipulation !== 'None') {
              topLabel = `${match.stipulation} — ${match.title}`;
            } else if (isTitleMatch) {
              topLabel = match.title;
            } else if (match.stipulation && match.stipulation !== 'None') {
              topLabel = match.stipulation;
            }
            // Layout for 2+ sides
            const isMultiSide = teams.length > 2;
            const isTwoSide = teams.length === 2;
            return (
              <div
                key={match.order}
                onClick={() => navigate(`/event/${event.id}/match/${match.order}`)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  background: '#232323',
                  borderRadius: 12,
                  boxShadow: '0 0 12px #C6A04F22',
                  padding: '18px 24px',
                  cursor: 'pointer',
                  border: '1px solid #444',
                  transition: 'background 0.2s',
                  position: 'relative',
                  minHeight: 120,
                  marginBottom: 2,
                }}
              >
                {/* Top label: stipulation/title */}
                {topLabel && (
                  <div style={{
                    color: gold,
                    fontWeight: 700,
                    fontSize: 15,
                    marginBottom: 8,
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>{topLabel}</div>
                )}
                {/* For 3+ sides, center match info above participants */}
                {isMultiSide ? (
                  <>
                    {/* Match Info Block */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                      <div style={{ fontWeight: 700, color: gold, fontSize: 15, marginBottom: 2, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 320 }}>{match.cardType}{isTitleMatch ? ' - Title Match' : ''}</div>
                      <div style={{ fontWeight: 700, color: '#fff', fontSize: 20, marginBottom: 2, textAlign: 'center' }}>{match.result && match.result !== 'No winner' ? 'Final' : match.result}</div>
                      <div style={{ color: '#bbb', fontSize: 15, marginBottom: 2, textAlign: 'center' }}>{match.method}</div>
                      <div style={{ color: '#bbb', fontSize: 15, textAlign: 'center' }}>{match.time}</div>
                    </div>
                    {/* Participants Row */}
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: 32, width: '100%' }}>
                      {teamStrings.map((teamStr, sideIdx) => {
                        const { teamName, slugs } = parseTeamString(teamStr);
                        const individualNames = slugs.map(slug => wrestlerMap[slug]?.name || slug).join(' & ');
                        return (
                          <div key={sideIdx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 90 }}>
                            {/* Arrow above winner */}
                            <div style={{ height: 22, marginBottom: 2, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                              {winnerIndex === sideIdx ? triangleDown : <span style={{ display: 'inline-block', width: 16, height: 8 }} />}
                            </div>
                            <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 8 }}>
                              {slugs.map((wrestler, i) => (
                                <div key={i} style={{ width: 64, height: 64, borderRadius: '50%', background: '#444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64 * 0.6, color: '#7da2c1' }}>
                                  {wrestlerMap[wrestler]?.image_url
                                    ? <img src={wrestlerMap[wrestler].image_url} alt={wrestlerMap[wrestler].name} style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} />
                                    : <span role="img" aria-label="wrestler">&#128100;</span>
                                  }
                                </div>
                              ))}
                            </div>
                            <span style={{ fontWeight: 700, color: winnerIndex === sideIdx ? gold : '#fff', fontSize: 18, textAlign: 'center', marginBottom: 2 }}>
                              {teamName ? (
                                <>
                                  <div style={{ fontSize: 20, fontWeight: 800, color: winnerIndex === sideIdx ? gold : '#fff' }}>{teamName}</div>
                                  <div style={{ fontSize: 15, color: '#bbb', fontStyle: 'italic' }}>{individualNames}</div>
                                </>
                              ) : individualNames}
                            </span>
                            {/* Belt icon under winner if title match */}
                            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: 24, marginTop: 2 }}>
                              {isTitleMatch && winnerIndex === sideIdx ? (
                                <>
                                  <BeltIcon />
                                  {match.titleOutcome && match.titleOutcome !== 'None' && (
                                    <div style={{ 
                                      fontSize: 10, 
                                      color: match.titleOutcome === 'New Champion' ? '#4CAF50' : '#FFC107',
                                      fontWeight: 600,
                                      marginTop: 2,
                                      textAlign: 'center'
                                    }}>
                                      {match.titleOutcome}
                                    </div>
                                  )}
                                </>
                              ) : 
                               match.specialWinnerType && match.specialWinnerType !== 'None' && winnerIndex === sideIdx ? 
                               getSpecialWinnerIcon(match.specialWinnerType) : 
                               <span style={{ display: 'inline-block', width: 32, height: 16 }} />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : !isMultiSide ? (
                  <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', width: '100%' }}>
                    {/* Left participant */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 120 }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 8 }}>
                        {teamStrings[0].split('&').map((wrestler, i) => (
                          <div key={i} style={{ width: 64, height: 64, borderRadius: '50%', background: '#444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64 * 0.6, color: '#7da2c1' }}>
                            {wrestlerMap[wrestler]?.image_url
                              ? <img src={wrestlerMap[wrestler].image_url} alt={wrestlerMap[wrestler].name} style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} />
                              : <span role="img" aria-label="wrestler">&#128100;</span>
                            }
                          </div>
                        ))}
                      </div>
                      <span style={{ fontWeight: 700, color: winnerIndex === 0 ? gold : '#fff', fontSize: 18, textAlign: 'center', marginBottom: 2 }}>
                        {teamStrings[0]}
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: 24, marginTop: 2 }}>
                        {isTitleMatch && winnerIndex === 0 ? (
                          <>
                            <BeltIcon />
                            {match.titleOutcome && match.titleOutcome !== 'None' && (
                              <div style={{ 
                                fontSize: 11, 
                                color: match.titleOutcome === 'New Champion' ? '#4CAF50' : '#FFC107',
                                fontWeight: 600,
                                marginTop: 2,
                                textAlign: 'center'
                              }}>
                                {match.titleOutcome}
                              </div>
                            )}
                          </>
                        ) : 
                         match.specialWinnerType && match.specialWinnerType !== 'None' && winnerIndex === 0 ? 
                         getSpecialWinnerIcon(match.specialWinnerType) : 
                         <span style={{ display: 'inline-block', width: 32, height: 16 }} />}
                      </div>
                    </div>
                    {/* Left arrow (always reserve space) */}
                    <div style={{ width: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {winnerIndex === 0 ? triangleRight : <span style={{ display: 'inline-block', width: 14, height: 18, opacity: 0 }} />}
                    </div>
                    {/* Center match details */}
                    <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: 180, margin: 0, padding: 0 }}>
                      <div style={{ fontWeight: 700, color: gold, fontSize: 15, marginBottom: 2, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 320 }}>{match.cardType}{isTitleMatch ? ' - Title Match' : ''}</div>
                      <div style={{ fontWeight: 700, color: '#fff', fontSize: 20, marginBottom: 2, textAlign: 'center' }}>{match.result && match.result !== 'No winner' ? 'Final' : match.result}</div>
                      <div style={{ color: '#bbb', fontSize: 15, marginBottom: 2, textAlign: 'center' }}>{match.method}</div>
                      <div style={{ color: '#bbb', fontSize: 15, textAlign: 'center' }}>{match.time}</div>
                    </div>
                    {/* Right arrow (always reserve space) */}
                    <div style={{ width: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {winnerIndex === 1 ? triangleLeft : <span style={{ display: 'inline-block', width: 14, height: 18, opacity: 0 }} />}
                    </div>
                    {/* Right participant */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 120 }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 8 }}>
                        {teamStrings[1].split('&').map((wrestler, i) => (
                          <div key={i} style={{ width: 64, height: 64, borderRadius: '50%', background: '#444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64 * 0.6, color: '#7da2c1' }}>
                            {wrestlerMap[wrestler]?.image_url
                              ? <img src={wrestlerMap[wrestler].image_url} alt={wrestlerMap[wrestler].name} style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} />
                              : <span role="img" aria-label="wrestler">&#128100;</span>
                            }
                          </div>
                        ))}
                      </div>
                      <span style={{ fontWeight: 700, color: winnerIndex === 1 ? gold : '#fff', fontSize: 18, textAlign: 'center', marginBottom: 2 }}>
                        {teamStrings[1]}
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: 24, marginTop: 2 }}>
                        {isTitleMatch && winnerIndex === 1 ? (
                          <>
                            <BeltIcon />
                            {match.titleOutcome && match.titleOutcome !== 'None' && (
                              <div style={{ 
                                fontSize: 11, 
                                color: match.titleOutcome === 'New Champion' ? '#4CAF50' : '#FFC107',
                                fontWeight: 600,
                                marginTop: 2,
                                textAlign: 'center'
                              }}>
                                {match.titleOutcome}
                              </div>
                            )}
                          </>
                        ) : 
                         match.specialWinnerType && match.specialWinnerType !== 'None' && winnerIndex === 1 ? 
                         getSpecialWinnerIcon(match.specialWinnerType) : 
                         <span style={{ display: 'inline-block', width: 32, height: 16 }} />}
                      </div>
                    </div>
                  </div>
                ) : null}
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
                    <div><strong>Participants:</strong> {getParticipantsDisplay(match.participants)}</div>
                    <div><strong>Winner:</strong> {match.result && match.result.includes(' def. ')
                      ? match.result.split(' def. ')[0]
                      : (match.result || 'None')}</div>
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
                          <span style={{ color: '#bbb', fontSize: 13, marginRight: 6 }}>{new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {c.text}
                        </div>
                      ))}
                    </div>
                  )}
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
  const [editingMatchIdx, setEditingMatchIdx] = useState(null);
  const [expanded, setExpanded] = React.useState(false);

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
            <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {matches.map((m, idx) => (
                <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '8px 0', borderBottom: '1px solid #333' }}>
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
      // Only send allowed fields to Supabase
      const allowedFields = ['id', 'name', 'date', 'location', 'matches', 'status', 'isLive'];
      const sanitizedEvent = {};
      for (const key of allowedFields) {
        if (updatedEvent[key] !== undefined) sanitizedEvent[key] = updatedEvent[key];
      }
      // Remove any accidental top-level titleOutcome field
      if ('titleOutcome' in sanitizedEvent) {
        delete sanitizedEvent.titleOutcome;
      }
      console.log('Sanitized event for update:', sanitizedEvent);
      const { data, error } = await supabase
        .from('events')
        .update(sanitizedEvent)
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
      // Check for new champions and update championships
      checkForNewChampions(eventToUpdate, updatedMatches);
    }
  };

  // Function to check for new champions and update championships
  const checkForNewChampions = async (event, matches) => {
    try {
      for (const match of matches) {
        if (match.titleOutcome === 'New Champion' && match.title && match.title !== 'None') {
          console.log(`New champion detected: ${match.title} - ${match.result}`);
          
          // Extract winner name from result
          const winnerName = match.result.split(' def. ')[0];
          
          // Find winner slug from wrestlerMap
          const winnerSlug = Object.keys(wrestlerMap).find(slug => 
            wrestlerMap[slug]?.name === winnerName
          );
          
          if (winnerSlug) {
            // Update championship in database
            const championshipId = match.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            
            const { error } = await supabase
              .from('championships')
              .upsert({
                id: championshipId,
                title_name: match.title,
                current_champion: winnerName,
                current_champion_slug: winnerSlug,
                date_won: event.date,
                event_id: event.id,
                match_order: match.order,
                updated_at: new Date().toISOString()
              }, { onConflict: 'id' });
            
            if (error) {
              console.error('Error updating championship:', error);
            } else {
              console.log(`✅ Championship updated: ${match.title} - ${winnerName}`);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking for new champions:', error);
    }
  };

  useEffect(() => {
    async function fetchWrestlers() {
      const { data } = await supabase.from('wrestlers').select('*');
      setWrestlers(data);
      const map = {};
      data.forEach(w => { map[w.id] = w; });
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
    <Router>
      <Routes>
        <Route path="/" element={<EventList events={events} />} />
        <Route path="/event/:eventId" element={<EventBoxScore events={events} onDelete={deleteEvent} onEditMatch={handleEditMatch} wrestlerMap={wrestlerMap} />} />
        <Route path="/event/:eventId/match/:matchOrder" element={<MatchPage events={events} onEditMatch={handleEditMatch} />} />
        <Route path="/add-event" element={<AddEvent addEvent={addEvent} />} />
        <Route path="/edit-event/:eventId" element={<EditEvent events={events} updateEvent={updateEvent} />} />
        {/* <Route path="/championships" element={<ChampionshipsDisplay wrestlerMap={wrestlerMap} />} /> */}
      </Routes>
    </Router>
  );
}

export default App;

// Helper to parse a team string like "The New Day (kofi-kingston & xavier-woods)" or just "kofi-kingston & xavier-woods"
function parseTeamString(teamStr) {
  const tagTeamMatch = teamStr.match(/^([^(]+)\s*\(([^)]+)\)$/);
  if (tagTeamMatch) {
    const teamName = tagTeamMatch[1].trim();
    const slugs = tagTeamMatch[2].split('&').map(s => s.trim());
    return { teamName, slugs };
  } else {
    // No team name, just slugs
    const slugs = teamStr.split('&').map(s => s.trim());
    return { teamName: null, slugs };
  }
}