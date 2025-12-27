import { logger } from '../utils/logger.js';
import { 
  EVENT_TYPES, 
  getPLECategory, 
  isPLE 
} from '../parsers/eventClassifier.js';
import {
  isMainEvent,
  isBattleRoyal,
  isTitleMatch,
  isTitleChange,
  isTitleDefense,
  getMatchType
} from '../extractors/matches.js';
import { extractMatchParticipants } from '../parsers/participantParser.js';

/**
 * Main points calculator for fantasy league scoring
 */

/**
 * Check if match result is via DQ
 * @param {Object} match - Match object
 * @returns {boolean} True if DQ
 */
function isDQ(match) {
  const method = (match.method || '').toLowerCase();
  return method.includes('dq') || method.includes('disqualification');
}

/**
 * Check if match is No Contest
 * @param {Object} match - Match object
 * @returns {boolean} True if No Contest
 */
function isNoContest(match) {
  const method = (match.method || '').toLowerCase();
  return method.includes('no contest');
}

/**
 * Calculate points for a wrestler in a match
 * @param {Object} match - Match object
 * @param {Object} event - Event object
 * @param {Array} allMatches - All matches from the same event
 * @param {string} wrestlerName - Wrestler name/slug
 * @returns {Object} Points breakdown
 */
export function calculateMatchPoints(match, event, allMatches, wrestlerName) {
  const points = {
    matchPoints: 0,
    titlePoints: 0,
    specialPoints: 0,
    mainEventPoints: 0,
    battleRoyalPoints: 0,
    total: 0,
    breakdown: []
  };
  
  const eventType = event.classifiedType || 'unknown';
  const isMain = isMainEvent(match, allMatches);
  const isDQResult = isDQ(match);
  const isNC = isNoContest(match);
  const isBR = isBattleRoyal(match);
  const isTitle = isTitleMatch(match);
  const titleChanged = isTitleChange(match);
  const titleDefended = isTitleDefense(match);
  
  const matchData = extractMatchParticipants(match);
  const isWinner = matchData.winners.some(w => 
    w.toLowerCase().includes(wrestlerName.toLowerCase()) ||
    wrestlerName.toLowerCase().includes(w.toLowerCase())
  );
  const isParticipant = matchData.participants.some(p =>
    p.toLowerCase().includes(wrestlerName.toLowerCase()) ||
    wrestlerName.toLowerCase().includes(p.toLowerCase())
  );
  
  if (!isParticipant) {
    return points; // Not in this match
  }
  
  // No Contest: Only appearance points (handled by event-specific scoring)
  if (isNC) {
    // Still get appearance points from event-specific scoring
    points.breakdown.push('No Contest - appearance points only');
  }
  
  // Battle Royal points (universal)
  if (isBR) {
    points.battleRoyalPoints += 1; // Entering
    points.breakdown.push('Battle Royal entry: +1');
    
    if (isWinner) {
      points.battleRoyalPoints += 8; // Winning
      points.breakdown.push('Battle Royal winner: +8');
    }
    // Note: Eliminations would need to be tracked separately
  }
  
  // Title points
  if (isTitle) {
    if (titleChanged && isWinner) {
      points.titlePoints += 5;
      points.breakdown.push('Title win: +5');
    } else if (titleDefended && isWinner) {
      if (isDQResult) {
        points.titlePoints += 2; // Half points for DQ
        points.breakdown.push('Title defense (DQ): +2');
      } else {
        points.titlePoints += 4;
        points.breakdown.push('Title defense: +4');
      }
    }
  }
  
  // Event-specific scoring
  const eventPoints = calculateEventSpecificPoints(
    match, event, allMatches, wrestlerName, isMain, isWinner, isDQResult, isNC, isTitle
  );
  
  points.matchPoints = eventPoints.matchPoints;
  points.specialPoints = eventPoints.specialPoints;
  points.mainEventPoints = eventPoints.mainEventPoints;
  points.breakdown.push(...eventPoints.breakdown);
  
  // Apply DQ penalty (half points for match points)
  if (isDQResult && isWinner && !isNC) {
    points.matchPoints = Math.floor(points.matchPoints / 2);
    points.breakdown.push('DQ victory - match points halved');
  }
  
  // Calculate total
  points.total = points.matchPoints + 
                 points.titlePoints + 
                 points.specialPoints + 
                 points.mainEventPoints + 
                 points.battleRoyalPoints;
  
  return points;
}

/**
 * Calculate event-specific points
 */
function calculateEventSpecificPoints(match, event, allMatches, wrestlerName, isMain, isWinner, isDQ, isNC, isTitle) {
  const eventType = event.classifiedType || 'unknown';
  const category = getPLECategory(eventType);
  const points = {
    matchPoints: 0,
    specialPoints: 0,
    mainEventPoints: 0,
    breakdown: []
  };
  
  // Weekly shows (RAW/SmackDown)
  if (eventType === EVENT_TYPES.RAW || eventType === EVENT_TYPES.SMACKDOWN) {
    if (isMain) {
      if (isWinner) {
        points.matchPoints += 4; // Winning main event
        points.breakdown.push('Winning main event: +4');
      }
      points.mainEventPoints += 3; // Main eventing
      points.breakdown.push('Main eventing: +3');
    } else {
      if (isWinner && !isNC) {
        points.matchPoints += 2; // Winning non-main event
        points.breakdown.push('Winning match: +2');
      }
      if (!isNC) {
        points.matchPoints += 1; // Being on card
        points.breakdown.push('On match card: +1');
      }
    }
    
    // Title points are handled separately, but note them
    if (isTitle && isTitleChange(match) && isWinner) {
      points.breakdown.push('Title change: +5 (included in title points)');
    }
    
    return points;
  }
  
  // Major PLE - WrestleMania
  if (eventType === EVENT_TYPES.WRESTLEMANIA_NIGHT_1) {
    if (isMain) {
      if (isWinner) {
        points.matchPoints += 25;
        points.breakdown.push('Winning WrestleMania Night 1 main event: +25');
      }
      points.mainEventPoints += 20;
      points.breakdown.push('Main eventing WrestleMania Night 1: +20');
    } else {
      if (isWinner && !isNC) {
        points.matchPoints += 12;
        points.breakdown.push('Winning WrestleMania match: +12');
      }
      if (!isNC) {
        points.matchPoints += 6;
        points.breakdown.push('On WrestleMania card: +6');
      }
    }
    return points;
  }
  
  if (eventType === EVENT_TYPES.WRESTLEMANIA_NIGHT_2) {
    if (isMain) {
      if (isWinner) {
        points.matchPoints += 35;
        points.breakdown.push('Winning WrestleMania Night 2 main event: +35');
      }
      points.mainEventPoints += 25;
      points.breakdown.push('Main eventing WrestleMania Night 2: +25');
    } else {
      if (isWinner && !isNC) {
        points.matchPoints += 12;
        points.breakdown.push('Winning WrestleMania match: +12');
      }
      if (!isNC) {
        points.matchPoints += 6;
        points.breakdown.push('On WrestleMania card: +6');
      }
    }
    return points;
  }
  
  // SummerSlam
  if (eventType === EVENT_TYPES.SUMMERSLAM_NIGHT_1 || eventType === EVENT_TYPES.SUMMERSLAM_NIGHT_2) {
    if (isMain) {
      if (isWinner) {
        points.matchPoints += 20;
        points.breakdown.push('Winning SummerSlam main event: +20');
      }
      if (eventType === EVENT_TYPES.SUMMERSLAM_NIGHT_2) {
        points.mainEventPoints += 15;
        points.breakdown.push('Main eventing SummerSlam Night 2: +15');
      } else {
        points.mainEventPoints += 10;
        points.breakdown.push('Main eventing SummerSlam Night 1: +10');
      }
    } else {
      if (isWinner && !isNC) {
        points.matchPoints += 10;
        points.breakdown.push('Winning SummerSlam match: +10');
      }
      if (!isNC) {
        points.matchPoints += 5;
        points.breakdown.push('On SummerSlam card: +5');
      }
    }
    return points;
  }
  
  // Survivor Series
  if (eventType === EVENT_TYPES.SURVIVOR_SERIES) {
    if (isMain) {
      if (isWinner) {
        points.matchPoints += 15;
        points.breakdown.push('Winning Survivor Series main event: +15');
      }
      points.mainEventPoints += 12;
      points.breakdown.push('Main eventing Survivor Series: +12');
    } else {
      if (isWinner && !isNC) {
        points.matchPoints += 10;
        points.breakdown.push('Winning Survivor Series match: +10');
      }
      if (!isNC) {
        points.matchPoints += 5;
        points.breakdown.push('On Survivor Series card: +5');
      }
    }
    
    // War Games specific (would need additional match data)
    const matchType = getMatchType(match).toLowerCase();
    if (matchType.includes('war games')) {
      points.specialPoints += 8;
      points.breakdown.push('War Games team: +8');
      if (isWinner) {
        points.specialPoints += 14;
        points.breakdown.push('Winning War Games: +14');
      }
    }
    
    return points;
  }
  
  // Royal Rumble
  if (eventType === EVENT_TYPES.ROYAL_RUMBLE) {
    // Check if this is the Rumble match itself
    const matchType = getMatchType(match).toLowerCase();
    const isRumbleMatch = matchType.includes('royal rumble') || 
                          match.specialWinnerType?.toLowerCase().includes('royal rumble');
    
    if (isRumbleMatch) {
      points.specialPoints += 2; // Being in Rumble
      points.breakdown.push('Royal Rumble participant: +2');
      
      if (isWinner) {
        points.specialPoints += 30; // Winning Rumble
        points.breakdown.push('Royal Rumble winner: +30');
        // Note: Eliminations and Iron Man would need additional tracking
      }
    } else {
      // Non-Rumble match
      if (isMain) {
        if (isWinner) {
          points.matchPoints += 15;
          points.breakdown.push('Winning Royal Rumble main event: +15');
        }
        points.mainEventPoints += 12;
        points.breakdown.push('Main eventing Royal Rumble: +12');
      } else {
        if (isWinner && !isNC) {
          points.matchPoints += 10;
          points.breakdown.push('Winning Royal Rumble match: +10');
        }
        if (!isNC) {
          points.matchPoints += 5;
          points.breakdown.push('On Royal Rumble card: +5');
        }
      }
    }
    
    return points;
  }
  
  // Medium PLE - Elimination Chamber
  if (eventType === EVENT_TYPES.ELIMINATION_CHAMBER) {
    const matchType = getMatchType(match).toLowerCase();
    const isChamberMatch = matchType.includes('elimination chamber') ||
                          match.specialWinnerType?.toLowerCase().includes('elimination chamber');
    
    if (isChamberMatch) {
      // Qualifying points (would need to check if this is a qualifier)
      if (match.stipulation?.toLowerCase().includes('qualifier')) {
        points.specialPoints += 10;
        points.breakdown.push('Elimination Chamber qualifier: +10');
      }
      
      if (isWinner) {
        points.specialPoints += 30;
        points.breakdown.push('Winning Elimination Chamber: +30');
        // Note: Eliminations would need additional tracking
      }
    }
    
    if (isMain) {
      if (isWinner && !isChamberMatch) {
        points.matchPoints += 15;
        points.breakdown.push('Winning Elimination Chamber main event: +15');
      }
      if (!isChamberMatch) {
        points.mainEventPoints += 9;
        points.breakdown.push('Main eventing Elimination Chamber: +9');
      }
    } else {
      if (isWinner && !isNC && !isChamberMatch) {
        points.matchPoints += 8;
        points.breakdown.push('Winning Elimination Chamber match: +8');
      }
      if (!isNC && !isChamberMatch) {
        points.matchPoints += 4;
        points.breakdown.push('On Elimination Chamber card: +4');
      }
    }
    
    return points;
  }
  
  // Crown Jewel
  if (eventType === EVENT_TYPES.CROWN_JEWEL) {
    // Check if this is the Crown Jewel Championship match
    const isCJChampionship = match.title?.toLowerCase().includes('crown jewel') ||
                             match.stipulation?.toLowerCase().includes('crown jewel championship');
    
    if (isCJChampionship) {
      if (isWinner) {
        points.specialPoints += 20;
        points.breakdown.push('Winning Crown Jewel Championship: +20');
      } else {
        points.specialPoints += 10;
        points.breakdown.push('Crown Jewel Championship match: +10');
      }
    }
    
    if (isMain && !isCJChampionship) {
      if (isWinner) {
        points.matchPoints += 15;
        points.breakdown.push('Winning Crown Jewel main event: +15');
      }
      points.mainEventPoints += 9;
      points.breakdown.push('Main eventing Crown Jewel: +9');
    } else if (!isCJChampionship) {
      if (isWinner && !isNC) {
        points.matchPoints += 8;
        points.breakdown.push('Winning Crown Jewel match: +8');
      }
      if (!isNC) {
        points.matchPoints += 4;
        points.breakdown.push('On Crown Jewel card: +4');
      }
    }
    
    return points;
  }
  
  // Night of Champions
  if (eventType === EVENT_TYPES.NIGHT_OF_CHAMPIONS) {
    if (isMain) {
      if (isWinner) {
        points.matchPoints += 15;
        points.breakdown.push('Winning Night of Champions main event: +15');
      }
      points.mainEventPoints += 9;
      points.breakdown.push('Main eventing Night of Champions: +9');
    } else {
      if (isWinner && !isNC) {
        points.matchPoints += 8;
        points.breakdown.push('Winning Night of Champions match: +8');
      }
      if (!isNC) {
        points.matchPoints += 4;
        points.breakdown.push('On Night of Champions card: +4');
      }
    }
    return points;
  }
  
  // Money in the Bank
  if (eventType === EVENT_TYPES.MONEY_IN_THE_BANK) {
    const matchType = getMatchType(match).toLowerCase();
    const isMITBMatch = matchType.includes('money in the bank') ||
                       match.specialWinnerType?.toLowerCase().includes('money in the bank');
    
    if (isMITBMatch) {
      if (match.stipulation?.toLowerCase().includes('qualifier') || 
          match.stipulation?.toLowerCase().includes('ladder match')) {
        points.specialPoints += 12;
        points.breakdown.push('MITB ladder match participant: +12');
      }
      
      if (isWinner) {
        points.specialPoints += 25;
        points.breakdown.push('Money in the Bank winner: +25');
      }
    }
    
    if (isMain) {
      if (isWinner && !isMITBMatch) {
        points.matchPoints += 15;
        points.breakdown.push('Winning MITB main event: +15');
      }
      if (!isMITBMatch) {
        points.mainEventPoints += 9;
        points.breakdown.push('Main eventing MITB: +9');
      }
    } else {
      if (isWinner && !isNC && !isMITBMatch) {
        points.matchPoints += 8;
        points.breakdown.push('Winning MITB match: +8');
      }
      if (!isNC && !isMITBMatch) {
        points.matchPoints += 4;
        points.breakdown.push('On MITB card: +4');
      }
    }
    
    return points;
  }
  
  // Minor PLE (Saturday Night's Main Event, Backlash, Evolution, Clash, Wrestlepalooza)
  if ([
    EVENT_TYPES.SATURDAY_NIGHTS_MAIN_EVENT,
    EVENT_TYPES.BACKLASH,
    EVENT_TYPES.EVOLUTION,
    EVENT_TYPES.CLASH_IN_PARIS,
    EVENT_TYPES.WRESTLEPALOOZA
  ].includes(eventType)) {
    if (isMain) {
      if (isWinner) {
        points.matchPoints += 12;
        points.breakdown.push('Winning minor PLE main event: +12');
      }
      points.mainEventPoints += 7;
      points.breakdown.push('Main eventing minor PLE: +7');
    } else {
      if (isWinner && !isNC) {
        points.matchPoints += 6;
        points.breakdown.push('Winning minor PLE match: +6');
      }
      if (!isNC) {
        points.matchPoints += 3;
        points.breakdown.push('On minor PLE card: +3');
      }
    }
    return points;
  }
  
  // Default/Unknown event type
  logger.warn(`Unknown event type: ${eventType} for event ${event.name}`);
  return points;
}

