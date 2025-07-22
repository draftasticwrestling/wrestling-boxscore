# Tag Team System

## Overview

The tag team system automatically detects when wrestlers are tag team partners and suggests team names, making match creation more intuitive and accurate.

## Database Schema

### Tables

1. **`tag_teams`** - Stores team information
   - `id` - Unique team identifier (e.g., 'new-day', 'usos')
   - `name` - Team name (e.g., 'The New Day', 'The Usos')
   - `description` - Team description
   - `brand` - WWE brand (RAW, SmackDown, NXT)
   - `active` - Whether the team is currently active

2. **`tag_team_members`** - Many-to-many relationship between teams and wrestlers
   - `tag_team_id` - References tag_teams.id
   - `wrestler_slug` - References wrestlers.id
   - `member_order` - Order of members in the team
   - `active` - Whether this membership is active

3. **`wrestlers`** - Enhanced with tag team columns
   - `tag_team_id` - Current team ID
   - `tag_team_name` - Current team name
   - `tag_team_partner_slug` - Direct reference to partner

### Automatic Updates

The system uses PostgreSQL triggers to automatically:
- Update wrestler tag team info when team membership changes
- Maintain partner references between wrestlers
- Keep team names synchronized

## Frontend Integration

### Tag Team Detection

When users select wrestlers in the Visual Match Builder:

1. **Partner Detection**: If you select one member of a tag team, the system suggests their partner
2. **Team Completion**: If you select some but not all members of a team, it suggests the missing members
3. **Automatic Naming**: When a complete team is selected, the team name is automatically applied

### Visual Feedback

- **Partner Suggestions**: When you select a wrestler, their tag team partners appear as suggestions
- **Team Indicators**: Wrestler cards show team affiliations
- **Completion Prompts**: System suggests adding missing team members

## Usage Examples

### Example 1: Tag Team Match
1. User selects "Kofi Kingston"
2. System suggests "Xavier Woods" (his tag team partner)
3. User adds "Xavier Woods"
4. System automatically applies team name "The New Day"
5. Final format: `The New Day (kofi-kingston & xavier-woods)`

### Example 2: Multi-Way Tag Team Match
1. User creates two sides
2. Side 1: Selects "Jimmy Uso" → suggests "Jey Uso" → becomes "The Usos"
3. Side 2: Selects "Montez Ford" → suggests "Angelo Dawkins" → becomes "The Street Profits"
4. Final format: `The Usos (jimmy-uso & jey-uso) vs The Street Profits (montez-ford & angelo-dawkins)`

### Example 3: Incomplete Team
1. User selects "Finn Balor" (from The Judgment Day)
2. System suggests "Damian Priest", "Dominik Mysterio", "Rhea Ripley"
3. User only adds "Damian Priest"
4. System shows: "Add Dominik Mysterio & Rhea Ripley to complete 'The Judgment Day'"

## Benefits

1. **Error Prevention**: No more manual team name entry or typos
2. **Intuitive Workflow**: Natural partner suggestions guide users
3. **Consistency**: Team names are standardized across the database
4. **Flexibility**: Supports teams of 2-4 members
5. **Real-time Feedback**: Immediate suggestions and validation

## Implementation

### Database Setup
```sql
-- Run the tag_team_schema.sql file to set up the database
```

### Frontend Integration
```javascript
import { 
  areTagTeamPartners, 
  getTagTeamName, 
  suggestTagTeamPartners,
  formatTagTeam 
} from './utils/tagTeamUtils';

// Check if two wrestlers are partners
const arePartners = areTagTeamPartners(wrestler1, wrestler2);

// Get team name for partners
const teamName = getTagTeamName(wrestler1, wrestler2);

// Get partner suggestions
const suggestions = suggestTagTeamPartners(selectedWrestler, allWrestlers);

// Format a group of wrestlers as a team
const teamInfo = formatTagTeam(wrestlerSlugs, allWrestlers);
```

## Sample Tag Teams

The system includes pre-configured tag teams:

- **The New Day**: Kofi Kingston, Xavier Woods, Big E
- **The Usos**: Jimmy Uso, Jey Uso
- **The Street Profits**: Montez Ford, Angelo Dawkins
- **Imperium**: Gunther, Ludwig Kaiser, Giovanni Vinci
- **Damage CTRL**: Bayley, Iyo Sky, Dakota Kai
- **The Judgment Day**: Finn Balor, Damian Priest, Dominik Mysterio, Rhea Ripley
- **Legado del Fantasma**: Santos Escobar, Joaquin Wilde, Cruz del Toro, Zelina Vega
- **Alpha Academy**: Chad Gable, Otis

## Future Enhancements

1. **Dynamic Team Management**: Admin interface to add/remove teams
2. **Historical Teams**: Track team changes over time
3. **Team Statistics**: Win/loss records for teams
4. **Championship Tracking**: Tag team championship history
5. **Faction Support**: Larger groups beyond 4 members 