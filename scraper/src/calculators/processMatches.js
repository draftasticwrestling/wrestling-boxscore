import { logger } from '../utils/logger.js';
import { extractMatchesFromEvents } from '../extractors/events.js';
import { calculateMatchPoints } from './pointsCalculator.js';
import { isMainEvent } from '../extractors/matches.js';

/**
 * Process all matches and calculate points for each wrestler
 * @param {Array} events - Array of events
 * @returns {Array} Array of point records for each wrestler/match combination
 */
export function processAllMatches(events) {
  logger.info('Processing matches and calculating points...');
  
  const allRecords = [];
  const wrestlerPoints = new Map(); // Track total points per wrestler
  
  // Extract all matches with event context
  const matches = extractMatchesFromEvents(events);
  
  for (const match of matches) {
    const event = events.find(e => e.id === match.eventId);
    if (!event) continue;
    
    // Get all matches from this event to determine main event
    const eventMatches = event.matches || [];
    
    // Process each participant in the match
    let participants = [];
    if (match.participants) {
      if (typeof match.participants === 'string') {
        participants = match.participants.split(/\s+vs\.?\s+/i);
      } else if (Array.isArray(match.participants)) {
        participants = match.participants;
      } else {
        logger.warn(`Unexpected participants format in match ${match.order}: ${typeof match.participants}`);
        continue;
      }
    }
    
    for (const participant of participants) {
      // Parse participant (handle tag teams)
      const participantNames = parseParticipant(participant);
      
      for (const wrestlerName of participantNames) {
        const points = calculateMatchPoints(match, event, eventMatches, wrestlerName);
        
        if (points.total > 0 || points.breakdown.length > 0) {
          const record = {
            wrestlerName: wrestlerName.trim(),
            eventName: event.name,
            eventDate: event.date,
            eventType: event.classifiedType,
            matchOrder: match.order,
            matchType: match.matchType || 'Unknown',
            result: match.result || '',
            method: match.method || '',
            title: match.title || 'None',
            titleOutcome: match.titleOutcome || 'None',
            isMainEvent: isMainEvent(match, eventMatches),
            points: points.total,
            matchPoints: points.matchPoints,
            titlePoints: points.titlePoints,
            specialPoints: points.specialPoints,
            mainEventPoints: points.mainEventPoints,
            battleRoyalPoints: points.battleRoyalPoints,
            breakdown: points.breakdown.join('; ')
          };
          
          allRecords.push(record);
          
          // Track total points per wrestler
          if (!wrestlerPoints.has(wrestlerName.trim())) {
            wrestlerPoints.set(wrestlerName.trim(), 0);
          }
          wrestlerPoints.set(
            wrestlerName.trim(),
            wrestlerPoints.get(wrestlerName.trim()) + points.total
          );
        }
      }
    }
  }
  
  logger.info(`✓ Processed ${allRecords.length} wrestler/match records`);
  logger.info(`✓ Calculated points for ${wrestlerPoints.size} unique wrestlers`);
  
  return {
    records: allRecords,
    summary: Array.from(wrestlerPoints.entries())
      .map(([name, points]) => ({ wrestlerName: name, totalPoints: points }))
      .sort((a, b) => b.totalPoints - a.totalPoints)
  };
}

/**
 * Parse participant string to extract individual wrestler names
 * Handles tag teams: "Team Name (member1 & member2)"
 */
function parseParticipant(participantStr) {
  if (!participantStr) return [];
  
  const names = [];
  
  // Check for tag team format: "Team (member1 & member2)"
  const teamMatch = participantStr.match(/^(.+?)\s*\(([^)]+)\)$/);
  
  if (teamMatch) {
    // Extract individual members
    const members = teamMatch[2].split(/[&,]/).map(m => m.trim());
    names.push(...members);
  } else {
    // Single wrestler
    names.push(participantStr.trim());
  }
  
  return names.filter(Boolean);
}

