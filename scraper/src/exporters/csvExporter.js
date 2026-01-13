import { createObjectCsvWriter } from 'csv-writer';
import { logger } from '../utils/logger.js';
import { format } from 'date-fns';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Export point records to CSV
 * @param {Array} records - Array of point records
 * @param {Array} summary - Summary by wrestler
 * @param {string} outputPath - Output file path
 * @returns {Promise<string>} Path to created file
 */
export async function exportToCSV(records, summary, outputPath = null) {
  const outputDir = process.env.OUTPUT_DIR || path.join(__dirname, '../../output');
  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
  
  if (!outputPath) {
    outputPath = path.join(outputDir, `fantasy-points-${timestamp}.csv`);
  }
  
  logger.info(`Exporting to CSV: ${outputPath}`);
  
  const csvWriter = createObjectCsvWriter({
    path: outputPath,
    header: [
      { id: 'wrestlerName', title: 'Wrestler Name' },
      { id: 'eventDate', title: 'Event Date' },
      { id: 'eventName', title: 'Event Name' },
      { id: 'eventType', title: 'Event Type' },
      { id: 'matchOrder', title: 'Match Order' },
      { id: 'matchType', title: 'Match Type' },
      { id: 'result', title: 'Result' },
      { id: 'method', title: 'Method' },
      { id: 'title', title: 'Title' },
      { id: 'titleOutcome', title: 'Title Outcome' },
      { id: 'isMainEvent', title: 'Is Main Event' },
      { id: 'points', title: 'Total Points' },
      { id: 'matchPoints', title: 'Match Points' },
      { id: 'titlePoints', title: 'Title Points' },
      { id: 'specialPoints', title: 'Special Points' },
      { id: 'mainEventPoints', title: 'Main Event Points' },
      { id: 'battleRoyalPoints', title: 'Battle Royal Points' },
      { id: 'breakdown', title: 'Point Breakdown' }
    ]
  });
  
  await csvWriter.writeRecords(records);
  logger.info(`✓ Exported ${records.length} records to CSV`);
  
  // Also export summary
  if (summary && summary.length > 0) {
    const summaryPath = path.join(outputDir, `fantasy-points-summary-${timestamp}.csv`);
    const summaryWriter = createObjectCsvWriter({
      path: summaryPath,
      header: [
        { id: 'wrestlerName', title: 'Wrestler Name' },
        { id: 'totalPoints', title: 'Total Points' }
      ]
    });
    
    await summaryWriter.writeRecords(summary);
    logger.info(`✓ Exported summary to: ${summaryPath}`);
  }
  
  return outputPath;
}


