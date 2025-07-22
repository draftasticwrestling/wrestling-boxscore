import React, { useState, useEffect, useMemo } from 'react';
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

const buttonStyle = {
  background: '#333',
  color: '#fff',
  border: '1px solid #555',
  borderRadius: '4px',
  padding: '6px 12px',
  cursor: 'pointer',
  fontSize: '14px',
  marginRight: '8px',
  marginBottom: '8px',
};

const activeButtonStyle = {
  ...buttonStyle,
  background: gold,
  color: '#232323',
  borderColor: gold,
};

const tagTeamInputStyle = {
  ...inputStyle,
  marginBottom: '8px',
};

export default function ImprovedParticipantsInput({ 
  wrestlers = [], 
  value, 
  onChange, 
  matchType = 'singles', // 'singles', 'tag', 'battle-royal', 'multi-way'
  maxParticipants = 30,
  placeholder = 'Select participants...'
}) {
  // Ensure wrestlers is always an array
  const safeWrestlers = Array.isArray(wrestlers) ? wrestlers : [];
  const [participants, setParticipants] = useState([]);
  const [tagTeamNames, setTagTeamNames] = useState({});
  const [matchFormat, setMatchFormat] = useState(matchType);
  const [searchTerm, setSearchTerm] = useState('');

  // Parse initial value on mount
  useEffect(() => {
    parseInitialValue(value);
  }, [value]);

  // Parse the initial value from string format
  const parseInitialValue = (initialValue) => {
    if (!initialValue) {
      setParticipants([]);
      setTagTeamNames({});
      return;
    }

    if (Array.isArray(initialValue)) {
      // Battle Royal or array format
      setParticipants(initialValue.map(slug => ({ slug, name: getWrestlerName(slug) })));
      setMatchFormat('battle-royal');
    } else if (typeof initialValue === 'string') {
      // String format - parse "Team A (wrestler1 & wrestler2) vs Team B (wrestler3 & wrestler4)"
      const sides = initialValue.split(' vs ');
      const parsedParticipants = [];
      const parsedTagTeams = {};

      sides.forEach((side, sideIndex) => {
        const teamMatch = side.match(/^([^(]+)\s*\(([^)]+)\)$/);
        if (teamMatch) {
          // Tag team with name
          const teamName = teamMatch[1].trim();
          const wrestlerSlugs = teamMatch[2].split('&').map(s => s.trim());
          parsedTagTeams[sideIndex] = teamName;
          
          wrestlerSlugs.forEach(slug => {
            parsedParticipants.push({ slug, name: getWrestlerName(slug) });
          });
        } else {
          // Individual wrestlers
          const wrestlerSlugs = side.split('&').map(s => s.trim());
          wrestlerSlugs.forEach(slug => {
            parsedParticipants.push({ slug, name: getWrestlerName(slug) });
          });
        }
      });

      setParticipants(parsedParticipants);
      setTagTeamNames(parsedTagTeams);
      
      // Determine format based on structure
      if (sides.length === 2 && Object.keys(parsedTagTeams).length > 0) {
        setMatchFormat('tag');
      } else if (parsedParticipants.length > 4) {
        setMatchFormat('battle-royal');
      } else if (sides.length > 2) {
        setMatchFormat('multi-way');
      } else {
        setMatchFormat('singles');
      }
    }
  };

  // Get wrestler name from slug
  const getWrestlerName = (slug) => {
    const wrestler = safeWrestlers.find(w => w.id === slug || w.slug === slug);
    return wrestler ? wrestler.name : slug;
  };

  // Filter wrestlers based on search term
  const filteredWrestlers = useMemo(() => {
    if (!searchTerm) return safeWrestlers.slice(0, 20); // Show first 20 if no search
    
    return safeWrestlers
      .filter(w => 
        w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.id.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .slice(0, 10);
  }, [safeWrestlers, searchTerm]);

  // Add wrestler to participants
  const addWrestler = (wrestler) => {
    if (participants.length >= maxParticipants) return;
    
    const newParticipant = { slug: wrestler.id, name: wrestler.name };
    const updatedParticipants = [...participants, newParticipant];
    setParticipants(updatedParticipants);
    setSearchTerm('');
    updateParentValue(updatedParticipants);
  };

  // Remove wrestler from participants
  const removeWrestler = (index) => {
    const updatedParticipants = participants.filter((_, i) => i !== index);
    setParticipants(updatedParticipants);
    updateParentValue(updatedParticipants);
  };

  // Update tag team name
  const updateTagTeamName = (index, name) => {
    const updatedTagTeams = { ...tagTeamNames, [index]: name };
    setTagTeamNames(updatedTagTeams);
    updateParentValue(participants, updatedTagTeams);
  };

  // Update parent component value
  const updateParentValue = (participantList, tagTeams = tagTeamNames) => {
    if (matchFormat === 'battle-royal') {
      // Battle Royal: array of slugs
      onChange(participantList.map(p => p.slug));
    } else if (matchFormat === 'tag') {
      // Tag team: "Team A (wrestler1 & wrestler2) vs Team B (wrestler3 & wrestler4)"
      const sides = [];
      const participantsPerSide = Math.ceil(participantList.length / 2);
      
      for (let i = 0; i < participantList.length; i += participantsPerSide) {
        const sideParticipants = participantList.slice(i, i + participantsPerSide);
        const sideIndex = i / participantsPerSide;
        const teamName = tagTeams[sideIndex] || '';
        const wrestlerNames = sideParticipants.map(p => p.slug).join(' & ');
        
        if (teamName) {
          sides.push(`${teamName} (${wrestlerNames})`);
        } else {
          sides.push(wrestlerNames);
        }
      }
      
      onChange(sides.join(' vs '));
    } else {
      // Singles or multi-way: "wrestler1 vs wrestler2 vs wrestler3"
      const sides = [];
      const participantsPerSide = matchFormat === 'singles' ? 1 : Math.ceil(participantList.length / 2);
      
      for (let i = 0; i < participantList.length; i += participantsPerSide) {
        const sideParticipants = participantList.slice(i, i + participantsPerSide);
        sides.push(sideParticipants.map(p => p.slug).join(' & '));
      }
      
      onChange(sides.join(' vs '));
    }
  };

  // Clear all participants
  const clearAll = () => {
    setParticipants([]);
    setTagTeamNames({});
    onChange('');
  };

  // Render match format selector
  const renderFormatSelector = () => (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ color: '#fff', fontWeight: 500, marginBottom: '8px', display: 'block' }}>
        Match Format:
      </label>
      <div>
        {[
          { key: 'singles', label: 'Singles' },
          { key: 'tag', label: 'Tag Team' },
          { key: 'multi-way', label: 'Multi-Way' },
          { key: 'battle-royal', label: 'Battle Royal' }
        ].map(format => (
          <button
            key={format.key}
            type="button"
            style={matchFormat === format.key ? activeButtonStyle : buttonStyle}
            onClick={() => setMatchFormat(format.key)}
          >
            {format.label}
          </button>
        ))}
      </div>
    </div>
  );

  // Render wrestler search
  const renderWrestlerSearch = () => (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ color: '#fff', fontWeight: 500, marginBottom: '8px', display: 'block' }}>
        Add Wrestler:
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search wrestlers..."
          style={inputStyle}
        />
        {searchTerm && filteredWrestlers.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: '#333',
            border: '1px solid #555',
            borderRadius: '4px',
            maxHeight: '200px',
            overflowY: 'auto',
            zIndex: 1000,
          }}>
            {filteredWrestlers.map(wrestler => (
              <div
                key={wrestler.id}
                onClick={() => addWrestler(wrestler)}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #444',
                  display: 'flex',
                  alignItems: 'center',
                }}
                onMouseEnter={(e) => e.target.style.background = '#444'}
                onMouseLeave={(e) => e.target.style.background = '#333'}
              >
                <img
                  src={wrestler.image_url}
                  alt={wrestler.name}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    marginRight: '12px',
                    objectFit: 'cover'
                  }}
                />
                <div>
                  <div style={{ color: '#fff', fontWeight: '500' }}>{wrestler.name}</div>
                  <div style={{ color: '#bbb', fontSize: '12px' }}>{wrestler.brand || 'Unassigned'}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Render participants list
  const renderParticipantsList = () => (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <label style={{ color: '#fff', fontWeight: 500 }}>
          Participants ({participants.length}/{maxParticipants}):
        </label>
        {participants.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            style={{
              ...buttonStyle,
              background: '#dc3545',
              borderColor: '#dc3545',
              fontSize: '12px',
              padding: '4px 8px',
            }}
          >
            Clear All
          </button>
        )}
      </div>
      
      {participants.length === 0 ? (
        <div style={{ 
          padding: '16px', 
          textAlign: 'center', 
          color: '#bbb', 
          background: '#1a1a1a', 
          borderRadius: '4px',
          border: '1px dashed #444'
        }}>
          No participants selected. Use the search above to add wrestlers.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '8px' }}>
          {matchFormat === 'tag' ? (
            // Tag team layout
            renderTagTeamLayout()
          ) : (
            // Regular layout
            participants.map((participant, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px',
                  background: '#1a1a1a',
                  borderRadius: '4px',
                  border: '1px solid #444'
                }}
              >
                <img
                  src={safeWrestlers.find(w => w.id === participant.slug)?.image_url}
                  alt={participant.name}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    marginRight: '12px',
                    objectFit: 'cover'
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#fff', fontWeight: '500' }}>{participant.name}</div>
                  <div style={{ color: '#bbb', fontSize: '12px' }}>
                    {safeWrestlers.find(w => w.id === participant.slug)?.brand || 'Unassigned'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeWrestler(index)}
                  style={{
                    background: '#dc3545',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );

  // Render tag team layout
  const renderTagTeamLayout = () => {
    const sides = [];
    const participantsPerSide = Math.ceil(participants.length / 2);
    
    for (let i = 0; i < participants.length; i += participantsPerSide) {
      const sideParticipants = participants.slice(i, i + participantsPerSide);
      const sideIndex = i / participantsPerSide;
      
      sides.push(
        <div key={sideIndex} style={{ border: '1px solid #555', borderRadius: '4px', padding: '12px' }}>
          <div style={{ marginBottom: '8px' }}>
            <input
              type="text"
              value={tagTeamNames[sideIndex] || ''}
              onChange={(e) => updateTagTeamName(sideIndex, e.target.value)}
              placeholder={`Team ${sideIndex + 1} name (optional)`}
              style={tagTeamInputStyle}
            />
          </div>
          <div style={{ display: 'grid', gap: '8px' }}>
            {sideParticipants.map((participant, participantIndex) => (
              <div
                key={participantIndex}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px',
                  background: '#1a1a1a',
                  borderRadius: '4px',
                  border: '1px solid #444'
                }}
              >
                <img
                  src={safeWrestlers.find(w => w.id === participant.slug)?.image_url}
                  alt={participant.name}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    marginRight: '12px',
                    objectFit: 'cover'
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#fff', fontWeight: '500' }}>{participant.name}</div>
                  <div style={{ color: '#bbb', fontSize: '12px' }}>
                    {safeWrestlers.find(w => w.id === participant.slug)?.brand || 'Unassigned'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeWrestler(i + participantIndex)}
                  style={{
                    background: '#dc3545',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    return sides;
  };

  return (
    <div>
      {renderFormatSelector()}
      {renderWrestlerSearch()}
      {renderParticipantsList()}
      
      {/* Preview of final format */}
      {participants.length > 0 && (
        <div style={{ marginTop: '16px', padding: '12px', background: '#1a1a1a', borderRadius: '4px', border: '1px solid #555' }}>
          <div style={{ color: gold, fontWeight: '500', marginBottom: '8px' }}>Preview:</div>
          <div style={{ color: '#fff', fontFamily: 'monospace', fontSize: '14px' }}>
            {matchFormat === 'battle-royal' 
              ? participants.map(p => p.slug).join(', ')
              : matchFormat === 'tag'
              ? (() => {
                  const sides = [];
                  const participantsPerSide = Math.ceil(participants.length / 2);
                  for (let i = 0; i < participants.length; i += participantsPerSide) {
                    const sideParticipants = participants.slice(i, i + participantsPerSide);
                    const sideIndex = i / participantsPerSide;
                    const teamName = tagTeamNames[sideIndex] || '';
                    const wrestlerNames = sideParticipants.map(p => p.slug).join(' & ');
                    sides.push(teamName ? `${teamName} (${wrestlerNames})` : wrestlerNames);
                  }
                  return sides.join(' vs ');
                })()
              : (() => {
                  const sides = [];
                  const participantsPerSide = matchFormat === 'singles' ? 1 : Math.ceil(participants.length / 2);
                  for (let i = 0; i < participants.length; i += participantsPerSide) {
                    const sideParticipants = participants.slice(i, i + participantsPerSide);
                    sides.push(sideParticipants.map(p => p.slug).join(' & '));
                  }
                  return sides.join(' vs ');
                })()
            }
          </div>
        </div>
      )}
    </div>
  );
} 