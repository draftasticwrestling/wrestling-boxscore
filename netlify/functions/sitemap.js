/**
 * Dynamic sitemap: returns sitemap XML with current events from Supabase.
 * So new events are in the sitemap as soon as they're added (no deploy needed).
 * Netlify rewrites /sitemap.xml to this function (see netlify.toml).
 */

const { createClient } = require('@supabase/supabase-js');

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

exports.handler = async () => {
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

      if (!error && data && data.length > 0) {
        data.forEach((e) => {
          urls.push({
            loc: `/event/${e.id}`,
            lastmod: e.date && /^\d{4}-\d{2}-\d{2}$/.test(e.date) ? e.date : today,
            changefreq: 'weekly',
            priority: '0.85',
          });
        });
      }
    } catch (_) {
      // fallback: static URLs only
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(urlToXml).join('\n')}
</urlset>
`;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=300',
    },
    body: xml,
  };
};
