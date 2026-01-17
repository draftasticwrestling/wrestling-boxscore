#!/usr/bin/env node

/**
 * Pro Wrestling Boxscore Fantasy League Scraper
 * Main entry point for the scraper
 */

import { testConnection } from './config/supabase.js';
import { logger } from './utils/logger.js';
import { fetchEvents } from './extractors/events.js';
import { fetchWrestlers } from './extractors/wrestlers.js';
import { processAllMatches } from './calculators/processMatches.js';
import { exportToCSV } from './exporters/csvExporter.js';

async function main() {
  logger.info('Starting Pro Wrestling Boxscore Scraper...');
  logger.info('');
  
  // Test Supabase connection
  const connected = await testConnection();
  if (!connected) {
    logger.error('Failed to connect to Supabase. Please check your .env file.');
    logger.error('Make sure SUPABASE_URL and SUPABASE_ANON_KEY are set correctly.');
    process.exit(1);
  }
  
  logger.info('');
  logger.info('Fetching data...');
  
  try {
    // Fetch events - season started May 2, 2025
    const seasonStartDate = '2025-05-02';
    const events = await fetchEvents({ startDate: seasonStartDate });
    logger.info(`✓ Found ${events.length} events (from ${seasonStartDate} onwards)`);
    
    // Fetch wrestlers (for reference, though we parse from match data)
    const wrestlers = await fetchWrestlers();
    logger.info(`✓ Found ${wrestlers.length} wrestlers`);
    
    logger.info('');
    logger.info('Processing matches and calculating points...');
    
    // Process all matches and calculate points
    const { records, summary } = processAllMatches(events);
    
    logger.info('');
    logger.info('Top 10 Wrestlers by Total Points:');
    summary.slice(0, 10).forEach((w, i) => {
      logger.info(`  ${i + 1}. ${w.wrestlerName}: ${w.totalPoints} points`);
    });
    
    logger.info('');
    logger.info('Exporting to CSV...');
    
    // Export to CSV
    const csvPath = await exportToCSV(records, summary);
    
    logger.info('');
    logger.info('✓ Scraper completed successfully!');
    logger.info(`✓ CSV file created: ${csvPath}`);
    logger.info(`✓ Total records: ${records.length}`);
    logger.info(`✓ Unique wrestlers: ${summary.length}`);
    
  } catch (error) {
    logger.error('Error during processing:', error);
    logger.error(error.stack);
    process.exit(1);
  }
}

// Run main function
main().catch(error => {
  logger.error('Fatal error:', error);
  process.exit(1);
});

