import cron from 'node-cron';
import Feed from '../models/Feed.js';
import { fetchRecentVulnerabilities } from './osv.js';

export const startFeedCron = () => {
  refreshFeed();
  cron.schedule('0 */6 * * *', () => {
    console.log('[CRON] Refreshing vulnerability feed...');
    refreshFeed();
  });
};

const refreshFeed = async () => {
  try {
    const vulns = await fetchRecentVulnerabilities();
    if (vulns.length > 0) {
      await Feed.deleteMany({});
      await Feed.insertMany(vulns);
      console.log(`[CRON] Feed updated with ${vulns.length} entries.`);
    }
  } catch (err) {
    console.error('[CRON] Feed refresh error:', err.message);
  }
};
