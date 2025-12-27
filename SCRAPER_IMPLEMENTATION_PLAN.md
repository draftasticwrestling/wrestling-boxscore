# Fantasy League Scraper Implementation Plan

## Overview
This document outlines the implementation plan for creating a scraper that extracts data from wrestlingboxscore.com and calculates fantasy league points based on your scoring system.

## Scoring System Summary

### General Rules
- **Standard Match Victory**: Full points
- **DQ/Disqualification Victory**: Half points
- **No Contest**: Appearance points only (no victory/defense points)
- **Successful Title Defense**: +4 points (or +2 if via DQ)
- **Initial Title Win**: +5 points
- **Main Event Points**: Only awarded if match is NOT the featured/titled match of the PLE

**Battle Royal Scoring (Universal - applies to all events):**
- Entering the Battle Royal: 1 point
- Eliminating a BR Participant: 2 points
- Winning the Battle Royal: 8 points

### Event Categories

#### 1. Raw/SmackDown (Weekly Shows)
**Raw:**
- Main Eventing: 3 points
- Winning the Main Event: 4 points
- Being on Match Card (non-main event): 1 point
- Winning Your Match (non-main event): 2 points
- Successful Title Defense: 4 points
- Title Changes Hands: 5 points

**SmackDown:**
- Main Eventing: 3 points
- Winning the Main Event: 4 points
- Being on Match Card (non-main event): 1 point
- Winning Your Match (non-main event): 2 points
- Successful Title Defense: 4 points
- Title Changes Hands: 5 points

#### 2. Major PLE (Big Four)
**WrestleMania:**
- Winning Main Event Night Two: 35 points
- Main Eventing Night Two: 25 points
- Winning Night One Main Event: 25 points
- Main Eventing Night One: 20 points
- Winning Non-ME Match: 12 points
- Being on Non-ME Card: 6 points

**SummerSlam:**
- Winning Main Event (either night): 20 points
- Main Eventing Night Two: 15 points
- Main Eventing Night One: 10 points
- Winning Your Match: 10 points
- Being on Non-ME Card: 5 points

**Survivor Series:**
- Winning the Main Event: 15 points
- Main Eventing: 12 points
- Winning Your Match: 10 points
- Being on Non-ME Card: 5 points
- Being on War Games Team: 8 points
- Winning War Games: 14 points
- Wrestler Who Makes the Pin: 10 points
- Entry Order Bonus: 1-5 points (first entrant = 5, fifth = 1)

**Royal Rumble:**
- Winning the Royal Rumble: 30 points
- Points for Each Person Eliminated: 3 points
- Iron Man/Iron Woman: 12 points
- Person Who Eliminates the Most: 12 points
- Winning the Main Event (non-Rumble): 15 points
- Main Eventing (non-Rumble): 12 points
- Winning Your Match (non-Rumble): 10 points
- Being on Non-ME Card: 5 points
- Being in the Royal Rumble: 2 points

#### 3. Medium PLE
**Elimination Chamber:**
- Winning the Elimination Chamber: 30 points
- Qualifying for Elimination Chamber: 10 points
- Eliminating an Opponent in Chamber: 10 points
- Longest Lasting Participant: 15 points
- Winning the Main Event: 15 points
- Main Eventing: 9 points
- Winning Your Match: 8 points
- Being on Match Card (non-main event): 4 points

**Crown Jewel:**
- Winning the Crown Jewel Championship: 20 points
- Crown Jewel Championship: 10 points
- Winning Main Event (non CJ Championship): 15 points
- Main Eventing (non CJ Championship): 9 points
- Winning Your Match: 8 points
- Being on Match Card (non-main event): 4 points

**Night of Champions:**
- Winning the Main Event: 15 points
- Main Eventing: 9 points
- Winning Your Match: 8 points
- Being on Match Card (non-main event): 4 points

**King & Queen of the Ring:**
- King or Queen of the Ring: 20 points
- Finals Qualification: 10 points
- Semi-Finals Qualification: 7 points (in addition to Raw/Smackdown match points)
- First Round Qualification: 3 points (in addition to Raw/Smackdown match points)

**Money in the Bank:**
- Money in the Bank Winner: 25 points
- Earning Spot in Ladder Match: 12 points
- Winning the Main Event: 15 points
- Main Eventing: 9 points
- Winning Your Match: 8 points
- Being on Match Card (non-main event): 4 points

#### 4. Minor PLE
**Saturday Night's Main Event, Backlash, Evolution, Clash in Paris, Wrestlepalooza:**
- Winning the Main Event: 12 points
- Main Eventing: 7 points
- Winning Your Match: 6 points
- Being on Match Card (non-main event): 3 points

#### 5. Title Points (Monthly)
Awarded to whoever holds the belt at the end of the last day of each month:

**Men's Division:**
- Undisputed WWE Champion: 10 points
- Heavy Weight Champion: 10 points
- Intercontinental Champion: 8 points
- US Champion: 7 points
- Tag Team Champion (per member): 4 points

**Women's Division:**
- WWE Women's Champion: 10 points
- Women's World Champion: 10 points
- Intercontinental Champion: 8 points
- US Champion: 7 points
- Tag Team Champion (per member): 4 points

## Data Requirements

### From Events Table
- Event name (to determine event type)
- Event date
- Event location
- Matches (JSONB array)

### From Matches (JSONB structure)
- `order`: Match order (to determine main event)
- `participants`: Participant names/slugs
- `result`: Match result string
- `method`: Win method (Pinfall, DQ, No Contest, etc.)
- `time`: Match duration
- `stipulation`: Match stipulation
- `title`: Championship title (if any)
- `titleOutcome`: Title outcome (Champion Retains, New Champion, etc.)
- `specialWinnerType`: Special winner type (Royal Rumble winner, MITB winner, etc.)
- `matchType`: Type of match (Singles, Tag Team, Battle Royal, etc.)
- `status`: Match status (completed, etc.)

### From Wrestlers Table
- Wrestler ID/slug
- Wrestler name
- Brand (RAW, SmackDown, NXT)

### From Championships (if stored in DB)
- Current champion
- Title name
- Date won
- Brand

## Implementation Steps

### Phase 1: Project Setup

1. **Create Scraper Directory**
   ```bash
   mkdir scraper
   cd scraper
   npm init -y
   ```

2. **Install Dependencies**
   ```bash
   npm install @supabase/supabase-js dotenv csv-writer date-fns
   ```

3. **Set Up Environment Variables**
   Create `.env` file:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_anon_key
   ```

### Phase 2: Data Extraction

4. **Create Supabase Client**
   - Initialize Supabase client with credentials
   - Test connection

5. **Build Data Extraction Functions**
   - `fetchEvents(dateRange?)`: Fetch events from Supabase
   - `fetchWrestlers()`: Fetch wrestler data
   - `fetchChampionships()`: Fetch current championship holders (if in DB)
   - `parseMatchData(match)`: Parse individual match JSONB

### Phase 3: Event Classification

6. **Create Event Type Classifier**
   - Function to identify event type from event name:
     - RAW / SmackDown (weekly shows)
     - WrestleMania (night 1/2)
     - SummerSlam (night 1/2)
     - Survivor Series
     - Royal Rumble
     - Elimination Chamber
     - Crown Jewel
     - Night of Champions
     - King & Queen of the Ring
     - Money in the Bank
     - Minor PLE (Saturday Night's Main Event, Backlash, Evolution, Clash, Wrestlepalooza)

### Phase 4: Match Analysis

7. **Create Match Parser**
   - Parse participants (handle singles, tag teams, multi-person)
   - Identify winners and losers from result string
   - Determine if match is main event (last match or highest order)
   - Identify match type (Battle Royal, Elimination Chamber, etc.)
   - Extract special winner types
   - Handle tag team participants

8. **Create Participant Extractor**
   - Parse participant strings/slugs
   - Handle tag teams
   - Map to wrestler IDs
   - Handle special cases (battle royals, multi-person matches)

### Phase 5: Points Calculation

9. **Create Points Calculator**
   - `calculateMatchPoints(match, eventType, isMainEvent)`: Calculate base match points
   - `calculateTitlePoints(match, eventType)`: Calculate title win/defense points
   - `calculateSpecialMatchPoints(match, eventType)`: Calculate special match bonuses
   - `calculateMainEventPoints(match, eventType, isFeaturedMatch)`: Calculate main event points
   - `applyDQPenalty(points, method)`: Apply half points for DQ
   - `calculateRoyalRumblePoints(match)`: Special Royal Rumble calculations
   - `calculateEliminationChamberPoints(match)`: Special Elimination Chamber calculations
   - `calculateWarGamesPoints(match)`: Special War Games calculations

10. **Implement Scoring Logic**
    - Apply general rules (DQ = half points, No Contest = appearance only)
    - Apply Battle Royal scoring (universal: entry = 1, elimination = 2, win = 8)
    - Apply event-specific scoring
    - Calculate title points (win = +5, defense = +4)
    - Handle special match types
    - Calculate main event bonuses (if not featured match)

### Phase 6: Title Points Calculation

11. **Create Monthly Title Points Calculator**
    - Function to determine title holders at end of month
    - Map titles to point values
    - Calculate points per wrestler
    - Handle tag team members (4 points each)

### Phase 7: Data Output

12. **Create CSV/Excel Exporter**
    - Generate spreadsheet with columns:
      - Wrestler Name
      - Event Date
      - Event Name
      - Event Type
      - Match Type
      - Result (Win/Loss)
      - Match Points
      - Title Points
      - Special Match Points
      - Main Event Points
      - Total Points
      - Notes (DQ, No Contest, etc.)
    - Include summary by wrestler
    - Include monthly title points summary

### Phase 8: Testing & Refinement

13. **Test with Real Data**
    - Run scraper on historical events
    - Verify point calculations match manual calculations
    - Test edge cases:
      - Tag team matches
      - Battle royals
      - Multi-night events
      - DQ victories
      - No contests
      - Title changes
      - Special match winners

14. **Add Error Handling**
    - Handle missing data
    - Handle malformed match data
    - Log warnings for unclear cases
    - Validate event types

### Phase 9: Automation

15. **Create Automation Script**
    - Script to run scraper on schedule
    - Options:
      - Manual trigger
      - Cron job (local)
      - GitHub Actions (cloud)
    - Auto-save to spreadsheet location
    - Optional: Auto-upload to Google Sheets

### Phase 10: Documentation

16. **Create Documentation**
    - README with setup instructions
    - Data field documentation
    - Scoring calculation examples
    - Troubleshooting guide
    - Example outputs

## File Structure

```
scraper/
├── package.json
├── .env
├── .gitignore
├── README.md
├── src/
│   ├── index.js (main entry point)
│   ├── config/
│   │   └── supabase.js (Supabase client setup)
│   ├── extractors/
│   │   ├── events.js (event data extraction)
│   │   ├── matches.js (match data extraction)
│   │   └── wrestlers.js (wrestler data extraction)
│   ├── parsers/
│   │   ├── eventClassifier.js (classify event types)
│   │   ├── matchParser.js (parse match data)
│   │   └── participantParser.js (parse participants)
│   ├── calculators/
│   │   ├── pointsCalculator.js (main points calculator)
│   │   ├── titlePoints.js (title points calculator)
│   │   └── specialMatches.js (special match calculators)
│   ├── exporters/
│   │   └── csvExporter.js (CSV export functionality)
│   └── utils/
│       ├── dateUtils.js (date helpers)
│       └── logger.js (logging utilities)
└── output/
    └── (generated CSV files)
```

## Key Functions to Implement

### Event Classification
```javascript
function classifyEventType(eventName) {
  // Returns: 'raw', 'smackdown', 'wrestlemania-night-1', etc.
}
```

### Points Calculation
```javascript
function calculatePoints(match, event, wrestlerId) {
  // Returns points object with breakdown
  return {
    matchPoints: number,
    titlePoints: number,
    specialPoints: number,
    mainEventPoints: number,
    total: number
  };
}
```

### Participant Parsing
```javascript
function parseParticipants(participantsString, resultString) {
  // Returns: { winners: [], losers: [] }
}
```

## Next Steps

1. Start with Phase 1: Set up the project structure
2. Implement basic data extraction (Phase 2)
3. Build event classifier (Phase 3)
4. Create match parser (Phase 4)
5. Implement points calculator (Phase 5)
6. Test with sample data
7. Refine and add edge cases
8. Create export functionality
9. Add automation
10. Document everything

## Notes

- The scraper should handle both current and historical data
- Consider caching wrestler data to reduce API calls
- Add validation to ensure data integrity
- Consider adding a dry-run mode for testing
- May need to handle championship data from ChampionshipsPage.jsx if not in DB

