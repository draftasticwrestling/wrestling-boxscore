import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

/**
 * Fetch all wrestlers from Supabase
 * @returns {Promise<Array>} Array of wrestlers
 */
export async function fetchWrestlers() {
  try {
    logger.info('Fetching wrestlers from Supabase...');
    
    const { data, error } = await supabase
      .from('wrestlers')
      .select('*')
      .order('name');
    
    if (error) {
      throw error;
    }
    
    logger.info(`✓ Fetched ${data.length} wrestlers`);
    return data;
  } catch (error) {
    logger.error('Error fetching wrestlers:', error.message);
    throw error;
  }
}

/**
 * Create a map of wrestler slugs to wrestler data for quick lookup
 * @param {Array} wrestlers - Array of wrestler objects
 * @returns {Map} Map of slug -> wrestler data
 */
export function createWrestlerMap(wrestlers) {
  const wrestlerMap = new Map();
  
  for (const wrestler of wrestlers) {
    // Use id (slug) as key
    if (wrestler.id) {
      wrestlerMap.set(wrestler.id.toLowerCase(), wrestler);
    }
    // Also map by name for fallback
    if (wrestler.name) {
      wrestlerMap.set(wrestler.name.toLowerCase(), wrestler);
    }
  }
  
  logger.info(`✓ Created wrestler map with ${wrestlerMap.size} entries`);
  return wrestlerMap;
}

/**
 * Find wrestler by slug or name
 * @param {string} identifier - Wrestler slug or name
 * @param {Map} wrestlerMap - Wrestler map
 * @returns {Object|null} Wrestler object or null
 */
export function findWrestler(identifier, wrestlerMap) {
  if (!identifier) return null;
  
  const key = identifier.toLowerCase().trim();
  return wrestlerMap.get(key) || null;
}


