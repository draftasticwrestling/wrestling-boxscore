// Tag Team Utility Functions
// These functions help detect and manage tag team relationships

/**
 * Check if two wrestlers are tag team partners
 * @param {Object} wrestler1 - First wrestler object
 * @param {Object} wrestler2 - Second wrestler object
 * @returns {boolean} - True if they are tag team partners
 */
export function areTagTeamPartners(wrestler1, wrestler2) {
  if (!wrestler1 || !wrestler2) return false;
  
  return (
    wrestler1.tag_team_id && 
    wrestler2.tag_team_id && 
    wrestler1.tag_team_id === wrestler2.tag_team_id &&
    wrestler1.tag_team_partner_slug === wrestler2.id &&
    wrestler2.tag_team_partner_slug === wrestler1.id
  );
}

/**
 * Get the tag team name for two wrestlers
 * @param {Object} wrestler1 - First wrestler object
 * @param {Object} wrestler2 - Second wrestler object
 * @returns {string|null} - Tag team name or null if not partners
 */
export function getTagTeamName(wrestler1, wrestler2) {
  if (!areTagTeamPartners(wrestler1, wrestler2)) return null;
  return wrestler1.tag_team_name || wrestler2.tag_team_name;
}

/**
 * Find all tag team partners for a given wrestler
 * @param {string} wrestlerSlug - Wrestler slug
 * @param {Array} allWrestlers - Array of all wrestler objects
 * @returns {Array} - Array of partner wrestler objects
 */
export function getTagTeamPartners(wrestlerSlug, allWrestlers) {
  const wrestler = allWrestlers.find(w => w.id === wrestlerSlug);
  if (!wrestler || !wrestler.tag_team_id) return [];
  
  return allWrestlers.filter(w => 
    w.id !== wrestlerSlug && 
    w.tag_team_id === wrestler.tag_team_id
  );
}

/**
 * Get all members of a tag team
 * @param {string} tagTeamId - Tag team ID
 * @param {Array} allWrestlers - Array of all wrestler objects
 * @returns {Array} - Array of wrestler objects in the team
 */
export function getTagTeamMembers(tagTeamId, allWrestlers) {
  return allWrestlers.filter(w => w.tag_team_id === tagTeamId);
}

/**
 * Check if a group of wrestlers form a complete tag team
 * @param {Array} wrestlerSlugs - Array of wrestler slugs
 * @param {Array} allWrestlers - Array of all wrestler objects
 * @returns {Object|null} - Tag team info or null if not a complete team
 */
export function isCompleteTagTeam(wrestlerSlugs, allWrestlers) {
  if (wrestlerSlugs.length < 2) return null;
  
  const wrestlers = allWrestlers.filter(w => wrestlerSlugs.includes(w.id));
  if (wrestlers.length !== wrestlerSlugs.length) return null;
  
  // Check if all wrestlers are in the same team
  const firstWrestler = wrestlers[0];
  if (!firstWrestler.tag_team_id) return null;
  
  const allInSameTeam = wrestlers.every(w => w.tag_team_id === firstWrestler.tag_team_id);
  if (!allInSameTeam) return null;
  
  // Get all team members to check if this is the complete team
  const allTeamMembers = getTagTeamMembers(firstWrestler.tag_team_id, allWrestlers);
  const isComplete = allTeamMembers.length === wrestlers.length && 
                     allTeamMembers.every(w => wrestlerSlugs.includes(w.id));
  
  if (!isComplete) return null;
  
  return {
    teamId: firstWrestler.tag_team_id,
    teamName: firstWrestler.tag_team_name,
    members: wrestlers,
    memberCount: wrestlers.length
  };
}

/**
 * Suggest tag team partners when a wrestler is selected
 * @param {string} selectedWrestlerSlug - Currently selected wrestler
 * @param {Array} allWrestlers - Array of all wrestler objects
 * @returns {Array} - Array of suggested partner wrestler objects
 */
export function suggestTagTeamPartners(selectedWrestlerSlug, allWrestlers) {
  const partners = getTagTeamPartners(selectedWrestlerSlug, allWrestlers);
  
  // Sort by brand (same brand first), then by name
  return partners.sort((a, b) => {
    const selectedWrestler = allWrestlers.find(w => w.id === selectedWrestlerSlug);
    if (!selectedWrestler) return 0;
    
    // Same brand first
    if (a.brand === selectedWrestler.brand && b.brand !== selectedWrestler.brand) return -1;
    if (b.brand === selectedWrestler.brand && a.brand !== selectedWrestler.brand) return 1;
    
    // Then by name
    return a.name.localeCompare(b.name);
  });
}

/**
 * Format a tag team for display
 * @param {Array} wrestlerSlugs - Array of wrestler slugs
 * @param {Array} allWrestlers - Array of all wrestler objects
 * @returns {Object} - Formatted tag team info
 */
export function formatTagTeam(wrestlerSlugs, allWrestlers) {
  const teamInfo = isCompleteTagTeam(wrestlerSlugs, allWrestlers);
  
  if (teamInfo) {
    // It's a complete tag team
    return {
      type: 'complete-team',
      teamName: teamInfo.teamName,
      members: teamInfo.members,
      displayName: teamInfo.teamName,
      format: `${teamInfo.teamName} (${wrestlerSlugs.join(' & ')})`
    };
  } else {
    // It's a partial team or individual wrestlers
    const wrestlers = allWrestlers.filter(w => wrestlerSlugs.includes(w.id));
    const hasTeamMembers = Array.isArray(wrestlers) && wrestlers.some(w => w.tag_team_id);
    
    if (hasTeamMembers) {
      // Some wrestlers are in teams, suggest completion
      const teamMembers = wrestlers.filter(w => w.tag_team_id);
      const teamIds = [...new Set(teamMembers.map(w => w.tag_team_id))];
      
      return {
        type: 'partial-team',
        members: wrestlers,
        displayName: wrestlerSlugs.join(' & '),
        format: wrestlerSlugs.join(' & '),
        suggestions: teamIds.map(teamId => {
          const allTeamMembers = getTagTeamMembers(teamId, allWrestlers);
          const missingMembers = allTeamMembers.filter(w => !wrestlerSlugs.includes(w.id));
          return {
            teamId,
            teamName: allTeamMembers[0]?.tag_team_name,
            missingMembers,
            message: `Add ${missingMembers.map(w => w.name).join(' & ')} to complete "${allTeamMembers[0]?.tag_team_name}"`
          };
        })
      };
    } else {
      // Individual wrestlers
      return {
        type: 'individuals',
        members: wrestlers,
        displayName: wrestlerSlugs.join(' & '),
        format: wrestlerSlugs.join(' & ')
      };
    }
  }
}

/**
 * Get tag team suggestions for the Visual Match Builder
 * @param {Array} currentParticipants - Current participant slugs
 * @param {Array} allWrestlers - Array of all wrestler objects
 * @returns {Array} - Array of suggestion objects
 */
export function getTagTeamSuggestions(currentParticipants, allWrestlers) {
  const suggestions = [];
  
  // Check each current participant for tag team partners
  currentParticipants.forEach(participantSlug => {
    const partners = suggestTagTeamPartners(participantSlug, allWrestlers);
    partners.forEach(partner => {
      if (!currentParticipants.includes(partner.id)) {
        suggestions.push({
          type: 'tag-team-partner',
          wrestler: partner,
          reason: `Tag team partner of ${allWrestlers.find(w => w.id === participantSlug)?.name}`,
          priority: 1
        });
      }
    });
  });
  
  // Check for incomplete teams
  const wrestlers = allWrestlers.filter(w => currentParticipants.includes(w.id));
  const teamIds = [...new Set(wrestlers.filter(w => w.tag_team_id).map(w => w.tag_team_id))];
  
  teamIds.forEach(teamId => {
    const allTeamMembers = getTagTeamMembers(teamId, allWrestlers);
    const missingMembers = allTeamMembers.filter(w => !currentParticipants.includes(w.id));
    
    if (missingMembers.length > 0) {
      missingMembers.forEach(member => {
        suggestions.push({
          type: 'complete-team',
          wrestler: member,
          reason: `Complete "${allTeamMembers[0]?.tag_team_name}" team`,
          priority: 2
        });
      });
    }
  });
  
  // Remove duplicates and sort by priority
  const uniqueSuggestions = suggestions.filter((suggestion, index, self) => 
    index === self.findIndex(s => s.wrestler.id === suggestion.wrestler.id)
  );
  
  return uniqueSuggestions.sort((a, b) => a.priority - b.priority);
} 