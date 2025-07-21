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

const actionButtonStyle = {
  background: gold,
  color: '#232323',
  border: '1px solid gold',
  borderRadius: '4px',
  padding: '8px 16px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 'bold',
  marginRight: '8px',
  marginBottom: '8px',
};

const participantCardStyle = {
  background: '#1a1a1a',
  border: '1px solid #444',
  borderRadius: '8px',
  padding: '12px',
  margin: '8px',
  minWidth: '200px',
  position: 'relative',
};

const vsStyle = {
  color: '#fff',
  fontSize: '24px',
  fontWeight: 'bold',
  textAlign: 'center',
  margin: '16px 8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export default function VisualMatchBuilder({ 
  wrestlers, 
  value, 
  onChange, 
  maxParticipants = 30
}) {
  const [matchStructure, setMatchStructure] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredWrestlers, setFilteredWrestlers] = useState([]);

  // Parse initial value on mount
  useEffect(() => {
    parseInitialValue(value);
  }, [value]);

  // Filter wrestlers based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredWrestlers(wrestlers.slice(0, 20));
    } else {
      const filtered = wrestlers
        .filter(w => 
          w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          w.id.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .slice(0, 10);
      setFilteredWrestlers(filtered);
    }
  }, [wrestlers, searchTerm]);

  // Parse the initial value from string format
  const parseInitialValue = (initialValue) => {
    if (!initialValue) {
      setMatchStructure([]);
      return;
    }

    if (Array.isArray(initialValue)) {
      // Battle Royal format
      setMatchStructure([{ type: 'battle-royal', participants: initialValue }]);
    } else if (typeof initialValue === 'string') {
      // Parse string format
      const sides = initialValue.split(' vs ');
      const structure = sides.map(side => {
        const teamMatch = side.match(/^([^(]+)\s*\(([^)]+)\)$/);
        if (teamMatch) {
          // Tag team with name
          const teamName = teamMatch[1].trim();
          const wrestlerSlugs = teamMatch[2].split('&').map(s => s.trim());
          return { type: 'team', name: teamName, participants: wrestlerSlugs };
        } else {
          // Individual wrestlers
          const wrestlerSlugs = side.split('&').map(s => s.trim());
          return { type: 'individual', participants: wrestlerSlugs };
        }
      });
      setMatchStructure(structure);
    }
  };

  // Add a new opponent (new side)
  const addOpponent = () => {
    const newStructure = [...matchStructure, { type: 'individual', participants: [''] }];
    setMatchStructure(newStructure);
    updateParentValue(newStructure);
  };

  // Add a teammate to the current side
  const addTeammate = (sideIndex) => {
    const newStructure = [...matchStructure];
    if (newStructure[sideIndex].type === 'individual') {
      newStructure[sideIndex] = { type: 'team', name: '', participants: newStructure[sideIndex].participants };
    }
    newStructure[sideIndex].participants.push('');
    setMatchStructure(newStructure);
    updateParentValue(newStructure);
  };

  // Remove a participant
  const removeParticipant = (sideIndex, participantIndex) => {
    const newStructure = [...matchStructure];
    newStructure[sideIndex].participants.splice(participantIndex, 1);
    
    // If no participants left, remove the side
    if (newStructure[sideIndex].participants.length === 0) {
      newStructure.splice(sideIndex, 1);
    }
    // If only one participant left, convert back to individual
    else if (newStructure[sideIndex].participants.length === 1 && newStructure[sideIndex].type === 'team') {
      newStructure[sideIndex] = { type: 'individual', participants: newStructure[sideIndex].participants };
    }
    
    setMatchStructure(newStructure);
    updateParentValue(newStructure);
  };

  // Update a participant
  const updateParticipant = (sideIndex, participantIndex, wrestlerSlug) => {
    const newStructure = [...matchStructure];
    newStructure[sideIndex].participants[participantIndex] = wrestlerSlug;
    setMatchStructure(newStructure);
    updateParentValue(newStructure);
  };

  // Update team name
  const updateTeamName = (sideIndex, teamName) => {
    const newStructure = [...matchStructure];
    newStructure[sideIndex].name = teamName;
    setMatchStructure(newStructure);
    updateParentValue(newStructure);
  };

  // Convert to team
  const convertToTeam = (sideIndex) => {
    const newStructure = [...matchStructure];
    newStructure[sideIndex] = { 
      type: 'team', 
      name: '', 
      participants: newStructure[sideIndex].participants 
    };
    setMatchStructure(newStructure);
    updateParentValue(newStructure);
  };

  // Convert to individual
  const convertToIndividual = (sideIndex) => {
    const newStructure = [...matchStructure];
    newStructure[sideIndex] = { 
      type: 'individual', 
      participants: newStructure[sideIndex].participants 
    };
    setMatchStructure(newStructure);
    updateParentValue(newStructure);
  };

  // Update parent component value
  const updateParentValue = (structure) => {
    // Determine match type based on structure
    const totalParticipants = structure.flatMap(side => side.participants).filter(Boolean).length;
    const isBattleRoyal = totalParticipants > 8; // If more than 8 participants, treat as battle royal
    
    if (isBattleRoyal) {
      // Battle Royal: array of slugs
      const allParticipants = structure.flatMap(side => side.participants).filter(Boolean);
      onChange(allParticipants);
    } else {
      // Regular match: string format
      const sides = structure.map(side => {
        const validParticipants = side.participants.filter(Boolean);
        if (side.type === 'team' && side.name && validParticipants.length > 0) {
          return `${side.name} (${validParticipants.join(' & ')})`;
        } else if (validParticipants.length > 0) {
          return validParticipants.join(' & ');
        } else {
          return '';
        }
      }).filter(Boolean); // Remove empty sides
      onChange(sides.join(' vs '));
    }
  };

  // Clear all participants
  const clearAll = () => {
    setMatchStructure([]);
    onChange('');
  };

  // Get wrestler name from slug
  const getWrestlerName = (slug) => {
    const wrestler = wrestlers.find(w => w.id === slug);
    return wrestler ? wrestler.name : slug;
  };

  // Get wrestler brand from slug
  const getWrestlerBrand = (slug) => {
    const wrestler = wrestlers.find(w => w.id === slug);
    return wrestler ? wrestler.brand : 'Unassigned';
  };

  // Get wrestler image from slug
  const getWrestlerImage = (slug) => {
    const wrestler = wrestlers.find(w => w.id === slug);
    return wrestler ? wrestler.image_url : null;
  };

  // Render action buttons
  const renderActionButtons = () => (
    <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
      <button
        type="button"
        onClick={addOpponent}
        style={actionButtonStyle}
      >
        + Opponent
      </button>
      {matchStructure.length > 0 && (
        <button
          type="button"
          onClick={() => addTeammate(matchStructure.length - 1)}
          style={actionButtonStyle}
        >
          + Teammate
        </button>
      )}
      {matchStructure.length > 0 && (
        <button
          type="button"
          onClick={clearAll}
          style={{
            ...buttonStyle,
            background: '#dc3545',
            borderColor: '#dc3545',
          }}
        >
          Clear All
        </button>
      )}
    </div>
  );

  // Render participant card
  const renderParticipantCard = (wrestlerSlug, sideIndex, participantIndex) => {
    const hasWrestler = wrestlerSlug && wrestlerSlug.trim() !== '';
    const wrestlerName = hasWrestler ? getWrestlerName(wrestlerSlug) : '';
    const wrestlerBrand = hasWrestler ? getWrestlerBrand(wrestlerSlug) : '';
    const wrestlerImage = hasWrestler ? getWrestlerImage(wrestlerSlug) : null;

    return (
      <div key={participantIndex} style={participantCardStyle}>
        {hasWrestler && (
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            {wrestlerImage && (
              <img
                src={wrestlerImage}
                alt={wrestlerName}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  marginRight: '12px',
                  objectFit: 'cover'
                }}
              />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontWeight: '500', fontSize: '14px' }}>
                {wrestlerName}
              </div>
              <div style={{ color: '#bbb', fontSize: '12px' }}>
                {wrestlerBrand}
              </div>
            </div>
            <button
              type="button"
              onClick={() => removeParticipant(sideIndex, participantIndex)}
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
        )}
        
        {/* Wrestler selector */}
        <WrestlerAutocomplete
          wrestlers={wrestlers}
          value={wrestlerSlug || ''}
          onChange={(value) => updateParticipant(sideIndex, participantIndex, value)}
          placeholder="Search and select wrestler..."
        />
      </div>
    );
  };

  // Render side (opponent/team)
  const renderSide = (side, sideIndex) => {
    const isTeam = side.type === 'team';
    const canAddTeammate = side.participants.length < 4; // Max 4 per team

    return (
      <div key={sideIndex} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Team name input for teams */}
        {isTeam && (
          <input
            type="text"
            value={side.name || ''}
            onChange={(e) => updateTeamName(sideIndex, e.target.value)}
            placeholder="Team name (optional)"
            style={{
              ...inputStyle,
              marginBottom: '8px',
              textAlign: 'center',
              width: '200px'
            }}
          />
        )}



        {/* Participants */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {side.participants.map((participant, participantIndex) => 
            renderParticipantCard(participant, sideIndex, participantIndex)
          )}
          
          {/* Add teammate button */}
          {canAddTeammate && (
            <button
              type="button"
              onClick={() => addTeammate(sideIndex)}
              style={{
                ...buttonStyle,
                marginTop: '8px',
                fontSize: '12px',
                padding: '4px 8px'
              }}
            >
              + Add Teammate
            </button>
          )}
        </div>
      </div>
    );
  };

  // Render match structure
  const renderMatchStructure = () => {
    if (matchStructure.length === 0) {
      return (
        <div style={{ 
          padding: '40px', 
          textAlign: 'center', 
          color: '#bbb', 
          background: '#1a1a1a', 
          borderRadius: '8px',
          border: '2px dashed #444'
        }}>
          <div style={{ fontSize: '18px', marginBottom: '8px' }}>No participants yet</div>
          <div style={{ fontSize: '14px' }}>Click "+ Opponent" to start building your match</div>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
        {matchStructure.map((side, sideIndex) => (
          <React.Fragment key={sideIndex}>
            {renderSide(side, sideIndex)}
            {sideIndex < matchStructure.length - 1 && (
              <div style={vsStyle}>VS</div>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  // Render preview
  const renderPreview = () => {
    if (matchStructure.length === 0) return null;

    const totalParticipants = matchStructure.flatMap(side => side.participants).filter(Boolean).length;
    const isBattleRoyal = totalParticipants > 8;
    
    const previewValue = isBattleRoyal 
      ? matchStructure.flatMap(side => side.participants).filter(Boolean)
      : matchStructure.map(side => {
          const validParticipants = side.participants.filter(Boolean);
          if (side.type === 'team' && side.name && validParticipants.length > 0) {
            return `${side.name} (${validParticipants.join(' & ')})`;
          } else if (validParticipants.length > 0) {
            return validParticipants.join(' & ');
          } else {
            return '';
          }
        }).filter(Boolean).join(' vs ');

    return (
      <div style={{ marginTop: '24px', padding: '16px', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #555' }}>
        <div style={{ color: gold, fontWeight: '500', marginBottom: '8px' }}>Final Format:</div>
        <div style={{ color: '#fff', fontFamily: 'monospace', fontSize: '14px', wordBreak: 'break-all' }}>
          {Array.isArray(previewValue) ? previewValue.join(', ') : previewValue}
        </div>
      </div>
    );
  };

  return (
    <div>
      {renderActionButtons()}
      {renderMatchStructure()}
      {renderPreview()}
    </div>
  );
} 