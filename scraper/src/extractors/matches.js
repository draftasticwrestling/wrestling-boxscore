import { logger } from '../utils/logger.js';

/**
 * Extract and normalize match data
 * This module provides utilities for working with match data from events
 */

/**
 * Validate match structure
 * @param {Object} match - Match object
 * @returns {boolean} True if valid
 */
export function isValidMatch(match) {
  if (!match || typeof match !== 'object') {
    return false;
  }
  
  // Match should have at least participants or result
  if (!match.participants && !match.result) {
    return false;
  }
  
  return true;
}

/**
 * Get match status
 * @param {Object} match - Match object
 * @returns {string} Match status
 */
export function getMatchStatus(match) {
  return match.status || 'unknown';
}

/**
 * Check if match is completed
 * @param {Object} match - Match object
 * @returns {boolean} True if completed
 */
export function isMatchCompleted(match) {
  return getMatchStatus(match) === 'completed';
}

/**
 * Get match order (for determining main event)
 * @param {Object} match - Match object
 * @returns {number} Match order
 */
export function getMatchOrder(match) {
  return match.order || 0;
}

/**
 * Check if match is main event
 * @param {Object} match - Match object
 * @param {Array} allMatches - All matches from the same event
 * @returns {boolean} True if main event
 */
export function isMainEvent(match, allMatches) {
  if (!allMatches || allMatches.length === 0) {
    return false;
  }
  
  // Main event is typically the last match (highest order)
  const maxOrder = Math.max(...allMatches.map(m => getMatchOrder(m)));
  return getMatchOrder(match) === maxOrder;
}

/**
 * Get match type
 * @param {Object} match - Match object
 * @returns {string} Match type
 */
export function getMatchType(match) {
  return match.matchType || match.stipulation || 'Unknown';
}

/**
 * Check if match is a Battle Royal
 * @param {Object} match - Match object
 * @returns {boolean} True if Battle Royal
 */
export function isBattleRoyal(match) {
  const matchType = getMatchType(match).toLowerCase();
  const participantsStr = typeof match.participants === 'string' 
    ? match.participants 
    : Array.isArray(match.participants) 
      ? match.participants.join(' ') 
      : '';
  const participants = participantsStr.toLowerCase();
  
  return matchType.includes('battle royal') || 
         participants.includes('battle royal') ||
         (match.specialWinnerType && match.specialWinnerType.toLowerCase().includes('battle royal'));
}

/**
 * Check if match is a title match
 * @param {Object} match - Match object
 * @returns {boolean} True if title match
 */
export function isTitleMatch(match) {
  return match.title && match.title !== 'None' && match.title !== '';
}

/**
 * Get title outcome
 * @param {Object} match - Match object
 * @returns {string} Title outcome
 */
export function getTitleOutcome(match) {
  return match.titleOutcome || 'None';
}

/**
 * Check if title changed hands
 * @param {Object} match - Match object
 * @returns {boolean} True if title changed
 */
export function isTitleChange(match) {
  return getTitleOutcome(match) === 'New Champion';
}

/**
 * Check if title was successfully defended
 * @param {Object} match - Match object
 * @returns {boolean} True if title defended
 */
export function isTitleDefense(match) {
  return getTitleOutcome(match) === 'Champion Retains' || 
         getTitleOutcome(match) === 'Successful Defense';
}

