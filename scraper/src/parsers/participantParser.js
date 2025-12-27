import { logger } from '../utils/logger.js';
import { findWrestler } from '../extractors/wrestlers.js';

/**
 * Parse participants from match data
 * Handles various formats: "Wrestler A vs. Wrestler B", "Team (member1 & member2)", etc.
 */

/**
 * Parse participants string into individual wrestlers
 * @param {string} participantsStr - Participants string (e.g., "John Cena vs. Randy Orton")
 * @returns {Array} Array of participant names/slugs
 */
export function parseParticipants(participantsStr) {
  if (!participantsStr) return [];
  
  // Handle different input types
  let str = participantsStr;
  if (typeof participantsStr !== 'string') {
    if (Array.isArray(participantsStr)) {
      str = participantsStr.join(' vs ');
    } else {
      str = String(participantsStr);
    }
  }
  
  // Split by "vs" or "vs." (case insensitive)
  const parts = str.split(/\s+vs\.?\s+/i);
  
  const allParticipants = [];
  
  for (const part of parts) {
    // Handle tag teams: "Team Name (member1 & member2)"
    const teamMatch = part.match(/^(.+?)\s*\(([^)]+)\)$/);
    
    if (teamMatch) {
      // It's a tag team
      const teamName = teamMatch[1].trim();
      const members = teamMatch[2].split(/[&,]/).map(m => m.trim()).filter(Boolean);
      
      // Add team name and individual members
      allParticipants.push({
        type: 'team',
        name: teamName,
        members: members
      });
      
      // Also add individual members
      members.forEach(member => {
        allParticipants.push({
          type: 'individual',
          name: member
        });
      });
    } else {
      // Individual wrestler
      allParticipants.push({
        type: 'individual',
        name: part.trim()
      });
    }
  }
  
  return allParticipants;
}

/**
 * Parse result string to identify winners and losers
 * @param {string} resultStr - Result string (e.g., "John Cena def. Randy Orton")
 * @param {string} participantsStr - Participants string for fallback
 * @returns {Object} { winners: [], losers: [] }
 */
export function parseWinnersAndLosers(resultStr, participantsStr) {
  const result = {
    winners: [],
    losers: [],
    unclear: []
  };
  
  if (!resultStr && !participantsStr) {
    return result;
  }
  
  // Common patterns for results:
  // "Wrestler A def. Wrestler B"
  // "Wrestler A defeats Wrestler B"
  // "Wrestler A wins"
  // "Wrestler A & Wrestler B def. Team C"
  
  const lowerResult = (resultStr || '').toLowerCase();
  
  // Check for "def." or "defeats" or "wins"
  const defMatch = lowerResult.match(/(.+?)\s+(?:def\.?|defeats?|wins?)\s+(.+)/);
  
  if (defMatch) {
    const winnerPart = defMatch[1].trim();
    const loserPart = defMatch[2].trim();
    
    // Parse winners
    const winners = parseParticipants(winnerPart);
    result.winners = winners.map(p => p.name || p);
    
    // Parse losers
    const losers = parseParticipants(loserPart);
    result.losers = losers.map(p => p.name || p);
    
    return result;
  }
  
  // Check for "wins" at the end
  const winsMatch = lowerResult.match(/(.+?)\s+wins?$/);
  if (winsMatch) {
    const winnerPart = winsMatch[1].trim();
    const winners = parseParticipants(winnerPart);
    result.winners = winners.map(p => p.name || p);
    
    // Try to find losers from participants
    if (participantsStr) {
      const allParts = parseParticipants(participantsStr);
      const winnerNames = result.winners.map(w => w.toLowerCase());
      result.losers = allParts
        .filter(p => !winnerNames.includes((p.name || p).toLowerCase()))
        .map(p => p.name || p);
    }
    
    return result;
  }
  
  // If we can't parse, try to extract from participants
  if (participantsStr && !resultStr) {
    logger.warn(`Could not parse result, using participants: ${participantsStr}`);
    const allParts = parseParticipants(participantsStr);
    result.unclear = allParts.map(p => p.name || p);
  } else {
    logger.warn(`Could not parse result string: ${resultStr}`);
    result.unclear = [resultStr];
  }
  
  return result;
}

/**
 * Extract participants from match object
 * @param {Object} match - Match object
 * @returns {Object} Parsed match data with winners/losers
 */
export function extractMatchParticipants(match) {
  const participantsStr = match.participants || '';
  const resultStr = match.result || '';
  
  const participants = parseParticipants(participantsStr);
  const { winners, losers, unclear } = parseWinnersAndLosers(resultStr, participantsStr);
  
  return {
    participants: participants.map(p => p.name || p),
    winners: winners,
    losers: losers,
    unclear: unclear,
    hasResult: !!resultStr,
    isTagTeam: participants.some(p => p.type === 'team')
  };
}

/**
 * Normalize wrestler name/slug for matching
 * @param {string} name - Wrestler name or slug
 * @returns {string} Normalized name
 */
export function normalizeWrestlerName(name) {
  if (!name) return '';
  
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

