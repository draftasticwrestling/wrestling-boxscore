/**
 * Build-time script: fetches event IDs from Supabase and generates sitemap.xml
 * so Google can discover and index event pages. Run before vite build.
 *
 * Requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the environment
 * (e.g. in Netlify build env). If missing, only static URLs are included.
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = 'https://prowrestlingboxscore.com';

const staticUrls = [
  { loc: '/', changefreq: 'daily', priority: '1.0' },
  { loc: '/raw', changefreq: 'daily', priority: '0.9' },
  { loc: '/smackdown', changefreq: 'daily', priority: '0.9' },
  { loc: '/ple', changefreq: 'weekly', priority: '0.9' },
  { loc: '/wrestlers', changefreq: 'weekly', priority: '0.8' },
  { loc: '/championships', changefreq: 'weekly', priority: '0.8' },
  { loc: '/about', changefreq: 'monthly', priority: '0.5' },
  { loc: '/contact', changefreq: 'monthly', priority: '0.5' },
  { loc: '/privacy', changefreq: 'yearly', priority: '0.3' },
];

function escapeXml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urlToXml({ loc, lastmod, changefreq, priority }) {
  const lastmodStr = lastmod ? `\n    <lastmod>${escapeXml(lastmod)}</lastmod>` : '';
  const changefreqStr = changefreq ? `\n    <changefreq>${escapeXml(changefreq)}</changefreq>` : '';
  const priorityStr = priority != null ? `\n    <priority>${escapeXml(priority)}</priority>` : '';
  return `  <url>
    <loc>${escapeXml(BASE + loc)}</loc>${lastmodStr}${changefreqStr}${priorityStr}
  </url>`;
}

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [...staticUrls.map((u) => ({ ...u, lastmod: today }))];

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseAnonKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data, error } = await supabase
        .from('events')
        .select('id, date')
        .order('date', { ascending: false });

      if (error) {
        console.warn('generate-sitemap: Supabase events fetch failed:', error.message);
      } else if (data && data.length > 0) {
        const eventUrls = data.map((e) => ({
          loc: `/event/${e.id}`,
          lastmod: e.date && /^\d{4}-\d{2}-\d{2}$/.test(e.date) ? e.date : today,
          changefreq: 'weekly',
          priority: '0.85',
        }));
        urls.push(...eventUrls);
        console.log('generate-sitemap: added', eventUrls.length, 'event URLs');
      }
    } catch (err) {
      console.warn('generate-sitemap: error fetching events:', err.message);
    }
  } else {
    console.warn('generate-sitemap: no Supabase env vars; only static URLs included');
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(urlToXml).join('\n')}
</urlset>
`;

  const outPath = join(__dirname, '..', 'public', 'sitemap.xml');
  writeFileSync(outPath, xml, 'utf8');
  console.log('generate-sitemap: wrote', outPath, 'with', urls.length, 'URLs');

  const sitemapUrl = `${BASE}/sitemap.xml`;
  const pingUrls = [
    `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
    `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
  ];
  for (const url of pingUrls) {
    try {
      const res = await fetch(url);
      if (res.ok) console.log('generate-sitemap: pinged', url.split('/')[2]);
      else console.warn('generate-sitemap: ping', url.split('/')[2], res.status);
    } catch (e) {
      console.warn('generate-sitemap: ping failed', url.split('/')[2], e.message);
    }
  }
}

main().catch((err) => {
  console.error('generate-sitemap failed:', err);
  process.exit(1);
});
