import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { parseDate, isDateInRange } from '../utils/dateUtils.js';
import { classifyEventType } from '../parsers/eventClassifier.js';

/**
 * Fetch events from Supabase
 * @param {Object} options - Query options
 * @param {string} options.startDate - Start date (YYYY-MM-DD or "Month Day, Year")
 * @param {string} options.endDate - End date (YYYY-MM-DD or "Month Day, Year")
 * @param {string} options.eventType - Filter by event type (optional)
 * @returns {Promise<Array>} Array of events
 */
export async function fetchEvents(options = {}) {
  const { startDate, endDate, eventType } = options;
  
  try {
    logger.info('Fetching events from Supabase...');
    
    // Build query
    let query = supabase.from('events').select('*');
    
    // Add date filtering if provided
    if (startDate || endDate) {
      // Note: Supabase date filtering would need date column to be properly formatted
      // For now, we'll fetch all and filter in memory
    }
    
    const { data, error } = await query.order('date', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    logger.info(`✓ Fetched ${data.length} events`);
    
    // Classify events
    const classifiedData = data.map(event => ({
      ...event,
      classifiedType: classifyEventType(event.name)
    }));
    
    // Filter by date range if provided
    let filteredData = classifiedData;
    if (startDate || endDate) {
      filteredData = classifiedData.filter(event => 
        isDateInRange(event.date, startDate, endDate)
      );
      if (startDate) {
        logger.info(`✓ Filtered to ${filteredData.length} events from ${startDate} onwards`);
      } else {
        logger.info(`✓ Filtered to ${filteredData.length} events in date range`);
      }
    }
    
    // Filter by event type if provided
    if (eventType) {
      filteredData = filteredData.filter(event => 
        event.name.toLowerCase().includes(eventType.toLowerCase())
      );
      logger.info(`✓ Filtered to ${filteredData.length} events of type: ${eventType}`);
    }
    
    return filteredData;
  } catch (error) {
    logger.error('Error fetching events:', error.message);
    throw error;
  }
}

/**
 * Fetch a single event by ID
 * @param {string} eventId - Event ID
 * @returns {Promise<Object>} Event object
 */
export async function fetchEventById(eventId) {
  try {
    logger.debug(`Fetching event: ${eventId}`);
    
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    logger.error(`Error fetching event ${eventId}:`, error.message);
    throw error;
  }
}

/**
 * Get all matches from events
 * @param {Array} events - Array of events
 * @returns {Array} Flattened array of matches with event context
 */
export function extractMatchesFromEvents(events) {
  const matches = [];
  
  for (const event of events) {
    if (!event.matches || !Array.isArray(event.matches)) {
      logger.warn(`Event ${event.id} has no matches or invalid matches array`);
      continue;
    }
    
    for (const match of event.matches) {
      matches.push({
        ...match,
        eventId: event.id,
        eventName: event.name,
        eventDate: event.date,
        eventLocation: event.location
      });
    }
  }
  
  logger.info(`✓ Extracted ${matches.length} matches from ${events.length} events`);
  return matches;
}

