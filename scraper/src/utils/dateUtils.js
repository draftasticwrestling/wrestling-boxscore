import { parse, format, isAfter, isBefore, startOfMonth, endOfMonth } from 'date-fns';

/**
 * Date utility functions for parsing and formatting dates
 */

/**
 * Parse various date formats from the database
 * @param {string} dateStr - Date string in various formats
 * @returns {Date|null} - Parsed date or null if invalid
 */
export function parseDate(dateStr) {
  if (!dateStr) return null;
  
  // Try parsing as ISO date (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return parse(dateStr, 'yyyy-MM-dd', new Date());
  }
  
  // Try parsing as "Month Day, Year" format
  try {
    return parse(dateStr, 'MMMM d, yyyy', new Date());
  } catch (e) {
    // Try standard Date parsing
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  }
}

/**
 * Format date to YYYY-MM-DD
 */
export function formatDate(date) {
  if (!date) return null;
  return format(date, 'yyyy-MM-dd');
}

/**
 * Check if date is within range (inclusive of start and end dates)
 */
export function isDateInRange(date, startDate, endDate) {
  if (!date) return false;
  const d = parseDate(date);
  if (!d) return false;
  
  const start = startDate ? parseDate(startDate) : null;
  const end = endDate ? parseDate(endDate) : null;
  
  // For start date: include if date is on or after start (>=)
  if (start && isBefore(d, start)) return false;
  
  // For end date: include if date is on or before end (<=)
  if (end && isAfter(d, end)) return false;
  
  return true;
}

/**
 * Get start and end of month for a given date
 */
export function getMonthRange(dateStr) {
  const date = parseDate(dateStr);
  if (!date) return null;
  
  return {
    start: startOfMonth(date),
    end: endOfMonth(date)
  };
}

