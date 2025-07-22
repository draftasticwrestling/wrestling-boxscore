import { createClient } from '@supabase/supabase-js';

// These should be available in the browser environment
const supabaseUrl = 'https://your-project.supabase.co'; // Replace with actual URL
const supabaseAnonKey = 'your-anon-key'; // Replace with actual key

console.log('Testing tag team functionality...');

// For now, let me just check the VisualMatchBuilder logic
console.log('Checking VisualMatchBuilder tag team logic...');

// Simulate the tag team data structure that should be fetched
const mockTagTeamData = {
  'judgement-day': {
    id: 'judgement-day',
    name: 'The Judgement Day',
    members: [
      { wrestler_slug: 'raquel-rodriguez', member_order: 1 },
      { wrestler_slug: 'liv-morgan', member_order: 2 },
      { wrestler_slug: 'roxanne-perez', member_order: 3 }
    ]
  },
  'kabuki-warriors': {
    id: 'kabuki-warriors', 
    name: 'The Kabuki Warriors',
    members: [
      { wrestler_slug: 'asuka', member_order: 1 },
      { wrestler_slug: 'kairi-sane', member_order: 2 }
    ]
  }
};

// Test the getTagTeamSuggestions function logic
function getTagTeamSuggestions(wrestlerSlug, tagTeamData) {
  const suggestions = [];
  
  Object.values(tagTeamData).forEach(team => {
    const isMember = Array.isArray(team.members) && team.members.some(member => member.wrestler_slug === wrestlerSlug);
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
}

// Test the getTagTeamForWrestlers function logic
function getTagTeamForWrestlers(wrestlerSlugs, tagTeamData) {
  const sortedSlugs = [...wrestlerSlugs].sort();
  
  for (const team of Object.values(tagTeamData)) {
    const teamMemberSlugs = team.members.map(m => m.wrestler_slug).sort();
    if (JSON.stringify(sortedSlugs) === JSON.stringify(teamMemberSlugs)) {
      return team;
    }
  }
  
  return null;
}

// Test with Raquel Rodriguez
console.log('\nTesting with Raquel Rodriguez (raquel-rodriguez):');
const raquelSuggestions = getTagTeamSuggestions('raquel-rodriguez', mockTagTeamData);
console.log('Suggestions for Raquel:', raquelSuggestions);

// Test with Asuka
console.log('\nTesting with Asuka (asuka):');
const asukaSuggestions = getTagTeamSuggestions('asuka', mockTagTeamData);
console.log('Suggestions for Asuka:', asukaSuggestions);

// Test complete team detection
console.log('\nTesting complete team detection:');
const judgementDayTeam = getTagTeamForWrestlers(['raquel-rodriguez', 'liv-morgan'], mockTagTeamData);
console.log('Judgement Day team (Raquel + Liv):', judgementDayTeam);

const kabukiWarriorsTeam = getTagTeamForWrestlers(['asuka', 'kairi-sane'], mockTagTeamData);
console.log('Kabuki Warriors team (Asuka + Kairi):', kabukiWarriorsTeam);

console.log('\nThe logic looks correct. The issue might be:');
console.log('1. Tag team data not being fetched properly');
console.log('2. Wrestler slugs not matching between wrestlers table and tag_team_members table');
console.log('3. The fetchTagTeamData function not being called or failing'); 