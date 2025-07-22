import React, { useState, useEffect } from 'react';
import WrestlerAutocomplete from './WrestlerAutocomplete';
import { supabase } from '../supabaseClient';

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
  borderRadius: '4px',
  padding: '6px',
  margin: '2px',
  minWidth: '120px',
  maxWidth: '130px',
  position: 'relative',
};

const vsStyle = {
  color: '#fff',
  fontSize: '14px',
  fontWeight: 'bold',
  textAlign: 'center',
  margin: '4px 2px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const suggestionStyle = {
  background: '#2a2a2a',
  border: '1px solid #444',
  borderRadius: '3px',
  padding: '4px',
  margin: '2px 0',
  cursor: 'pointer',
  fontSize: '10px',
  color: '#C6A04F',
  transition: 'all 0.2s ease',
};

const suggestionHoverStyle = {
  ...suggestionStyle,
  background: '#3a3a3a',
  borderColor: '#C6A04F',
};

const dismissButtonStyle = {
  background: 'none',
  border: 'none',
  color: '#666',
  cursor: 'pointer',
  fontSize: '8px',
  padding: '1px 3px',
  borderRadius: '2px',
  transition: 'all 0.2s ease',
};

const dismissButtonHoverStyle = {
  ...dismissButtonStyle,
  background: '#333',
  color: '#999',
};

export default function VisualMatchBuilder({ 
  wrestlers, 
  value, 
  onChange, 
  maxParticipants = 30,
  initialStructure = null
}) {
  // Note: For Gauntlet Matches, participants are displayed in order of entry
  // The first participant starts, then each subsequent participant enters after the previous match ends
  // The winner of the final match wins the entire Gauntlet Match
  const [matchStructure, setMatchStructure] = useState(() => {
    if (initialStructure) {
      return initialStructure;
    }
    return [{ type: 'individual', participants: [''] }];
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredWrestlers, setFilteredWrestlers] = useState([]);
  const [tagTeamData, setTagTeamData] = useState({});
  const [tagTeamSuggestions, setTagTeamSuggestions] = useState({});
  const [hoveredSuggestion, setHoveredSuggestion] = useState(null);
  const [hoveredDismissButton, setHoveredDismissButton] = useState(null);
  const [isUpdatingFromInitialStructure, setIsUpdatingFromInitialStructure] = useState(false);

  // Handle initial structure on mount
  useEffect(() => {
    if (initialStructure) {
      setMatchStructure(initialStructure);
    } else if (value) {
      parseInitialValue(value);
    }
  }, []); // Only run on mount

  // Update structure when initialStructure prop changes
  useEffect(() => {
    if (initialStructure) {
      // Only reset if we're starting fresh (no wrestlers selected yet)
      const hasWrestlers = matchStructure.some(side => 
        side.participants.some(participant => participant && participant.trim() !== '')
      );
      
      if (!hasWrestlers) {
        setIsUpdatingFromInitialStructure(true);
        setMatchStructure(initialStructure);
        // Reset the flag after the state update
        setTimeout(() => {
          setIsUpdatingFromInitialStructure(false);
        }, 50);
      }
    }
  }, [initialStructure]);

  // Fetch tag team data on mount
  useEffect(() => {
    fetchTagTeamData();
  }, []);

  // Fetch tag team data from database
  const fetchTagTeamData = async () => {
    try {
      const { data: tagTeams, error } = await supabase
        .from('tag_teams')
        .select('*');
      
      if (error) {
        console.error('Error fetching tag teams:', error);
        return;
      }

      const { data: tagTeamMembers, error: membersError } = await supabase
        .from('tag_team_members')
        .select('*');
      
      if (membersError) {
        console.error('Error fetching tag team members:', error);
        return;
      }

      // Build tag team data structure
      const teamData = {};
      tagTeams.forEach(team => {
        teamData[team.id] = {
          ...team,
          members: tagTeamMembers
            .filter(member => member.tag_team_id === team.id)
            .sort((a, b) => a.member_order - b.member_order)
        };
      });

      setTagTeamData(teamData);
    } catch (error) {
      console.error('Error fetching tag team data:', error);
    }
  };

  // Get tag team suggestions for a wrestler
  const getTagTeamSuggestions = (wrestlerSlug) => {
    // Only show tag team suggestions for tag team match types
    const tagTeamMatchTypes = [
      'Tag Team',
      '3-way Tag Team', 
      '4-way Tag Team',
      '6-person Tag Team',
      '8-person Tag Team'
    ];
    
    // Check if the initial structure indicates a tag team match
    const isTagTeamMatch = matchStructure.some(side => side.type === 'team');
    
    // Don't show tag team suggestions for individual match types like Gauntlet Match
    if (!isTagTeamMatch) {
      return [];
    }
    
    const suggestions = [];
    
    Object.values(tagTeamData).forEach(team => {
      const isMember = team.members.some(member => member.wrestler_slug === wrestlerSlug);
      if (isMember) {
        const otherMembers = team.members
          .filter(member => member.wrestler_slug !== wrestlerSlug)
          .map(member => member.wrestler_slug);
        suggestions.push({
          teamName: team.name,
          teamId: team.id,
          members: otherMembers
        });
      }
    });
    
    return suggestions;
  };

  // Check if wrestlers form a complete tag team
  const getTagTeamForWrestlers = (wrestlerSlugs) => {
    const sortedSlugs = [...wrestlerSlugs].sort();
    
    for (const team of Object.values(tagTeamData)) {
      const teamMemberSlugs = team.members.map(m => m.wrestler_slug).sort();
      if (JSON.stringify(sortedSlugs) === JSON.stringify(teamMemberSlugs)) {
        return team;
      }
    }
    
    return null;
  };

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
      // Keep the initial participant when no value is provided
      setMatchStructure([{ type: 'individual', participants: [''] }]);
      return;
    }

    if (Array.isArray(initialValue)) {
      // Battle Royal format
      setMatchStructure([{ type: 'battle-royal', participants: initialValue }]);
    } else if (typeof initialValue === 'string') {
      // Check if it's a Gauntlet Match (contains arrows)
      if (initialValue.includes(' → ')) {
        // Gauntlet Match format: participant1 → participant2 → participant3
        const participants = initialValue.split(' → ').map(s => s.trim());
        const structure = participants.map(participant => ({
          type: 'individual',
          participants: [participant]
        }));
        setMatchStructure(structure);
      } else {
        // Regular match format: side1 vs side2
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

  // Add teammate from suggestion
  const addTeammateFromSuggestion = (sideIndex, suggestion) => {
    const newStructure = [...matchStructure];
    
    // Convert to team if not already
    if (newStructure[sideIndex].type === 'individual') {
      newStructure[sideIndex] = { 
        type: 'team', 
        name: suggestion.teamName, 
        participants: newStructure[sideIndex].participants 
      };
    }
    
    // Get the current wrestler that was selected
    const currentWrestler = newStructure[sideIndex].participants.find(p => p && p.trim() !== '');
    
    // Create the complete team with current wrestler + suggested teammates
    const completeTeam = [currentWrestler, ...suggestion.members];
    
    // Replace the participants array with the complete team
    newStructure[sideIndex].participants = completeTeam;
    
    // Set team name
    newStructure[sideIndex].name = suggestion.teamName;
    
    setMatchStructure(newStructure);
    updateParentValue(newStructure);
    
    // Clear suggestions after adding
    setTagTeamSuggestions(prev => {
      const newSuggestions = { ...prev };
      delete newSuggestions[`${sideIndex}-0`];
      return newSuggestions;
    });
  };

  // Remove a participant
  const removeParticipant = (sideIndex, participantIndex) => {
    const newStructure = [...matchStructure];
    newStructure[sideIndex].participants.splice(participantIndex, 1);
    
    // If no participants left, add an empty participant instead of removing the side
    if (newStructure[sideIndex].participants.length === 0) {
      newStructure[sideIndex].participants.push('');
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
    console.log('updateParticipant called with:', { sideIndex, participantIndex, wrestlerSlug });
    console.log('Current matchStructure before update:', JSON.stringify(matchStructure, null, 2));
    
    const newStructure = [...matchStructure];
    newStructure[sideIndex].participants[participantIndex] = wrestlerSlug;
    
    console.log('New structure after update:', JSON.stringify(newStructure, null, 2));
    
    // Get tag team suggestions for this wrestler
    const suggestions = getTagTeamSuggestions(wrestlerSlug);
    if (suggestions.length > 0) {
      setTagTeamSuggestions(prev => ({
        ...prev,
        [`${sideIndex}-${participantIndex}`]: suggestions
      }));
    }
    
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
    // Prevent infinite loops
    if (isUpdatingFromInitialStructure) {
      console.log('Skipping updateParentValue due to isUpdatingFromInitialStructure flag');
      return;
    }
    
    // Determine match type based on structure
    const totalParticipants = structure.flatMap(side => side.participants).filter(Boolean).length;
    const isBattleRoyal = totalParticipants > 8; // If more than 8 participants, treat as battle royal
    const isGauntletMatch = structure.length >= 5 && structure.every(side => side.type === 'individual');
    
    console.log('updateParentValue called with structure:', structure);
    console.log('totalParticipants:', totalParticipants, 'isBattleRoyal:', isBattleRoyal, 'isGauntletMatch:', isGauntletMatch);
    
    if (isBattleRoyal) {
      // Battle Royal: array of slugs
      const allParticipants = structure.flatMap(side => side.participants).filter(Boolean);
      onChange(allParticipants);
    } else if (isGauntletMatch) {
      // Gauntlet Match: participants in order with arrows
      const participants = structure.map(side => {
        const participant = side.participants.filter(Boolean)[0];
        return participant || '';
      }).filter(Boolean);
      
      const participantsString = participants.join(' → ');
      console.log('Gauntlet Match - sending:', participantsString);
      onChange(participantsString);
    } else {
      // Regular match: string format
      const sides = structure.map(side => {
        const participants = side.participants.filter(Boolean);
        return participants.length > 0 ? participants.join(' & ') : '';
      });
      
      console.log('Regular match - sides array:', sides);
      
      // Build the participants string incrementally
      let participantsString = '';
      
      if (sides[0] && sides[1]) {
        // Both wrestlers selected
        participantsString = `${sides[0]} vs ${sides[1]}`;
        console.log('Both wrestlers - sending:', participantsString);
      } else if (sides[0] && !sides[1]) {
        // Only first wrestler selected
        participantsString = `${sides[0]} vs `;
        console.log('First wrestler only - sending:', participantsString);
      } else if (!sides[0] && sides[1]) {
        // Only second wrestler selected
        participantsString = ` vs ${sides[1]}`;
        console.log('Second wrestler only - sending:', participantsString);
      } else {
        // No wrestlers selected
        participantsString = '';
        console.log('No wrestlers - sending empty string');
      }
      
      onChange(participantsString);
    }
  };

  // Clear all participants
  const clearAll = () => {
    setMatchStructure([{ type: 'individual', participants: [''] }]);
    onChange('');
  };

  // Get wrestler name from slug
  const getWrestlerName = (slug) => {
    console.log('getWrestlerName called with slug:', slug);
    console.log('wrestlers array sample:', wrestlers.slice(0, 3));
    const wrestler = wrestlers.find(w => w.id === slug || w.slug === slug);
    console.log('Found wrestler:', wrestler);
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

  // Dismiss tag team suggestions for a wrestler
  const dismissTagTeamSuggestions = (sideIndex, participantIndex) => {
    setTagTeamSuggestions(prev => {
      const newSuggestions = { ...prev };
      delete newSuggestions[`${sideIndex}-${participantIndex}`];
      return newSuggestions;
    });
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
      <button
        type="button"
        onClick={() => addTeammate(matchStructure.length - 1)}
        style={actionButtonStyle}
      >
        + Teammate
      </button>
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
        {hasWrestler ? (
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
            {wrestlerImage && (
              <img
                src={wrestlerImage}
                alt={wrestlerName}
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  marginRight: '6px',
                  objectFit: 'cover'
                }}
              />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#fff', fontWeight: '500', fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {wrestlerName}
              </div>
              <div style={{ color: '#bbb', fontSize: '9px' }}>
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
                width: '16px',
                height: '16px',
                cursor: 'pointer',
                fontSize: '9px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: '3px'
              }}
            >
              ×
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#333', marginRight: '6px' }} />
            <div style={{ flex: 1 }}>
              <div style={{ color: '#666', fontSize: '11px' }}>Select wrestler</div>
            </div>
          </div>
        )}
        
        {/* Wrestler selector */}
        <WrestlerAutocomplete
          key={`${sideIndex}-${participantIndex}`}
          wrestlers={wrestlers}
          value={wrestlerSlug || ''}
          onChange={(value) => {
            console.log(`WrestlerAutocomplete onChange for side ${sideIndex}, participant ${participantIndex}:`, value);
            updateParticipant(sideIndex, participantIndex, value);
          }}
          placeholder="Search..."
        />
        
        {/* Tag team suggestions */}
        {hasWrestler && tagTeamSuggestions[`${sideIndex}-${participantIndex}`] && (
          <div style={{ marginTop: '6px' }}>
            <div style={{ color: '#C6A04F', fontSize: '10px', marginBottom: '2px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Partners:</span>
              <button
                type="button"
                onClick={() => dismissTagTeamSuggestions(sideIndex, participantIndex)}
                style={hoveredDismissButton === `${sideIndex}-${participantIndex}` ? dismissButtonHoverStyle : dismissButtonStyle}
                onMouseEnter={() => setHoveredDismissButton(`${sideIndex}-${participantIndex}`)}
                onMouseLeave={() => setHoveredDismissButton(null)}
                title="Dismiss partner suggestions (wrestler competing individually)"
              >
                ×
              </button>
            </div>
            {tagTeamSuggestions[`${sideIndex}-${participantIndex}`].map((suggestion, idx) => {
              const suggestionKey = `${sideIndex}-${participantIndex}-${idx}`;
              const isHovered = hoveredSuggestion === suggestionKey;
              
              return (
                <div 
                  key={idx} 
                  style={isHovered ? suggestionHoverStyle : suggestionStyle}
                  onClick={() => addTeammateFromSuggestion(sideIndex, suggestion)}
                  onMouseEnter={() => setHoveredSuggestion(suggestionKey)}
                  onMouseLeave={() => setHoveredSuggestion(null)}
                  title={`Click to add ${suggestion.teamName} members`}
                >
                  <div style={{ fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px' }}>{suggestion.teamName}</span>
                    <span style={{ fontSize: '8px', color: '#888' }}>+</span>
                  </div>
                  <div style={{ fontSize: '9px', color: '#bbb' }}>
                    {suggestion.members.map(slug => getWrestlerName(slug)).join(', ')}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Render side (opponent/team)
  const renderSide = (side, sideIndex) => {
    const isTeam = side.participants.length > 1;
    const canAddTeammate = side.participants.length < 4; // Max 4 per team

    return (
      <div key={sideIndex} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '140px', maxWidth: '140px' }}>
        {/* Team name input for teams */}
        {isTeam && (
          <input
            type="text"
            value={side.name || ''}
            onChange={(e) => updateTeamName(sideIndex, e.target.value)}
            placeholder="Team name"
            style={{
              ...inputStyle,
              marginBottom: '4px',
              textAlign: 'center',
              width: '120px',
              fontSize: '11px',
              padding: '3px 4px'
            }}
          />
        )}

        {/* Participants */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
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
                marginTop: '2px',
                fontSize: '9px',
                padding: '2px 4px'
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
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        flexWrap: 'wrap',
        gap: '4px',
        maxWidth: '100%'
      }}>
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
    const totalParticipants = matchStructure.flatMap(side => side.participants).filter(Boolean).length;
    const isBattleRoyal = totalParticipants > 8;
    const isGauntletMatch = matchStructure.length >= 5 && matchStructure.every(side => side.type === 'individual');
    
    let previewValue;
    if (totalParticipants === 0) {
      previewValue = 'No participants selected';
    } else if (isBattleRoyal) {
      previewValue = matchStructure.flatMap(side => side.participants).filter(Boolean);
    } else if (isGauntletMatch) {
      // Gauntlet Match: participants in order with arrows
      previewValue = matchStructure.map(side => {
        const participant = side.participants.filter(Boolean)[0];
        return participant || '';
      }).filter(Boolean).join(' → ');
    } else {
      previewValue = matchStructure.map(side => {
        const validParticipants = side.participants.filter(Boolean);
        if (side.type === 'team' && side.name && validParticipants.length > 0) {
          return `${side.name} (${validParticipants.join(' & ')})`;
        } else if (validParticipants.length > 0) {
          return validParticipants.join(' & ');
        } else {
          return '';
        }
      }).filter(Boolean).join(' vs ');
    }

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