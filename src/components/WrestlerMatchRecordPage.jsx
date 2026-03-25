import React, { useMemo, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import MatchCard from './MatchCard';
import {
  getMatchesForWrestlerForYear,
  getMatchRecordStatsForYear,
} from '../utils/matchOutcomes';
import { getEventSlug } from '../utils/eventSlug';

const gold = '#C6A04F';

export default function WrestlerMatchRecordPage({ events, wrestlers, wrestlerMap }) {
  const { slug } = useParams();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const map = wrestlerMap || {};
  const wrestler = map[slug] || (wrestlers || []).find((w) => w.id === slug);

  const [year, setYear] = useState(() => {
    const p = searchParams.get('year');
    if (p === '2025' || p === '2026') return Number(p);
    const y = location.state?.year;
    if (y === 2025 || y === 2026) return y;
    return 2026;
  });

  const matchesForYear = useMemo(
    () => (slug && events ? getMatchesForWrestlerForYear(events, slug, year, map) : []),
    [events, slug, year, map]
  );

  const stats = useMemo(
    () => (slug && events ? getMatchRecordStatsForYear(events, slug, year, map) : null),
    [events, slug, year, map]
  );

  function handleYearChange(e) {
    const y = Number(e.target.value);
    setYear(y);
    if (y === 2026) setSearchParams({});
    else setSearchParams({ year: String(y) });
  }

  if (!wrestler) {
    return (
      <div style={{ padding: 32, color: '#fff', textAlign: 'center' }}>
        <p>Wrestler not found.</p>
        <Link to="/wrestlers" style={{ color: gold }}>
          ← Back to Wrestlers
        </Link>
      </div>
    );
  }

  const isWrestler = (wrestler.person_type || 'Wrestler') === 'Wrestler';
  const metaTitle = `${wrestler.name} — Match record (${year}) | Pro Wrestling Boxscore`;

  return (
    <>
      <Helmet>
        <title>{metaTitle}</title>
        <meta
          name="description"
          content={`Complete ${year} match record for ${wrestler.name}: every match on completed WWE events.`}
        />
        <link rel="canonical" href={`https://prowrestlingboxscore.com/wrestler/${wrestler.id}/matches`} />
      </Helmet>
      <div style={{ background: '#181818', color: '#fff', minHeight: '100vh', padding: '24px 16px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ marginBottom: 24 }}>
            <Link to={`/wrestler/${slug}`} style={{ color: gold, textDecoration: 'none', fontWeight: 600 }}>
              ← Back to {wrestler.name}
            </Link>
          </div>

          <h1 style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 800, color: gold }}>Match record</h1>
          <p style={{ margin: '0 0 24px', color: '#aaa', fontSize: 15 }}>
            All completed matches for {wrestler.name}
            {!isWrestler && ' (non-wrestler profiles may have limited or no match data).'}
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
              marginBottom: 20,
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 14,
                fontWeight: 600,
                color: '#bbb',
              }}
            >
              Year
              <select
                value={year}
                onChange={handleYearChange}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #444',
                  background: '#2a2a2a',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  minWidth: 100,
                }}
              >
                <option value={2026}>2026</option>
                <option value={2025}>2025</option>
              </select>
            </label>
          </div>

          {stats && (
            <div
              style={{
                background: '#232323',
                border: '1px solid #444',
                borderRadius: 12,
                boxShadow: '0 0 12px #C6A04F22',
                padding: '16px 18px',
                marginBottom: 24,
                color: '#e8e8e8',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'nowrap',
                  gap: '10px 18px',
                  alignItems: 'baseline',
                  fontSize: 15,
                  lineHeight: 1.5,
                  overflowX: 'auto',
                  WebkitOverflowScrolling: 'touch',
                  paddingBottom: 4,
                }}
              >
                {[
                  ['MW', stats.mw],
                  ['Win', stats.winTotal],
                  ['W%', stats.winPct],
                  ['Loss', stats.lossTotal],
                  ['L%', stats.lossPct],
                  ['NC', stats.nc],
                  ['DQW', stats.dqWin],
                  ['DQL', stats.dqLoss],
                  ['DQ%', stats.dqPct],
                ].map(([label, val]) => (
                  <span key={label} style={{ flexShrink: 0 }}>
                    <strong style={{ color: gold }}>{label}</strong> {val}
                  </span>
                ))}
              </div>
            </div>
          )}

          {matchesForYear.length === 0 ? (
            <p style={{ color: '#888' }}>No completed matches on record for {year}.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {matchesForYear.map(({ event, match, matchIndex }) => (
                <div key={`${event.id}-${match.order ?? matchIndex}`}>
                  <div style={{ color: '#aaa', fontSize: 13, marginBottom: 8 }}>
                    <Link
                      to={`/events/${getEventSlug(event)}`}
                      style={{ color: gold, textDecoration: 'none', fontWeight: 600 }}
                    >
                      {event.name}
                    </Link>
                    {event.date && ` — ${event.date}`}
                    {event.location && ` — ${event.location}`}
                  </div>
                  <MatchCard
                    match={match}
                    event={event}
                    wrestlerMap={wrestlerMap}
                    isClickable
                    matchIndex={matchIndex}
                    events={events}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
