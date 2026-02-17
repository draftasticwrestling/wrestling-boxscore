import React, { useMemo, useState, useEffect } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import MatchCard from './MatchCard';
import WrestlerEditModal from './WrestlerEditModal';
import countries from '../data/countries';
import { useUser } from '../hooks/useUser';
import { supabase } from '../supabaseClient';
import {
  getMatchOutcome,
  getLastMatchesForWrestler,
} from '../utils/matchOutcomes';

function formatReignDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getCountryForNationality(nationality) {
  if (!nationality) return null;
  return countries.find(c => c.name === nationality) || null;
}

function calculateAge(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}

const gold = '#C6A04F';

export default function WrestlerProfile({ events, wrestlers, wrestlerMap, onUpdateWrestler }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fromState = location.state && typeof location.state === 'object' ? location.state : null;
  // Fallback to sessionStorage if state was lost (e.g. refresh, or some navigation paths)
  const storedContext = React.useMemo(() => {
    try {
      const raw = sessionStorage.getItem('wrestlerProfileReturnContext');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed.fromEvent === 'string' ? parsed : null;
    } catch {
      return null;
    }
  }, []);
  const fromEvent = fromState?.fromEvent ?? storedContext?.fromEvent ?? null;
  const eventName = fromState?.eventName ?? storedContext?.eventName ?? null;
  const matchOrder = fromState?.matchOrder;
  const user = useUser();
  const canEdit = !!(user && user.email);
  const [showEditModal, setShowEditModal] = useState(false);
  const map = wrestlerMap || {};
  const wrestler = map[slug] || (wrestlers || []).find(w => w.id === slug);

  const lastFiveMatches = useMemo(
    () => (slug && events ? getLastMatchesForWrestler(events, slug, 5) : []),
    [events, slug]
  );

  const lastFiveOutcomes = useMemo(
    () => lastFiveMatches.map(({ match }) => getMatchOutcome(match, slug, map)),
    [lastFiveMatches, slug, map]
  );

  const [titleHistory, setTitleHistory] = useState([]);
  const [titleHistoryLoading, setTitleHistoryLoading] = useState(true);

  useEffect(() => {
    if (!slug) {
      setTitleHistory([]);
      setTitleHistoryLoading(false);
      return;
    }
    let cancelled = false;
    setTitleHistoryLoading(true);
    (async () => {
      try {
        const { data: historyData, error: historyError } = await supabase
          .from('championship_history')
          .select('*')
          .eq('champion_slug', slug)
          .order('date_won', { ascending: false });

        if (cancelled) return;
        if (historyError) {
          setTitleHistory([]);
          setTitleHistoryLoading(false);
          return;
        }
        const reigns = historyData || [];
        if (reigns.length === 0) {
          setTitleHistory([]);
          setTitleHistoryLoading(false);
          return;
        }
        const champIds = [...new Set(reigns.map((r) => r.championship_id).filter(Boolean))];
        const { data: champData, error: champError } = await supabase
          .from('championships')
          .select('id, title_name')
          .in('id', champIds);

        if (cancelled) return;
        const titleByName = (champData || []).reduce((acc, c) => {
          acc[c.id] = c.title_name || c.id;
          return acc;
        }, {});

        setTitleHistory(
          reigns.map((r) => ({
            ...r,
            titleName: titleByName[r.championship_id] || r.championship_id || 'Championship',
          }))
        );
      } catch (_) {
        if (!cancelled) setTitleHistory([]);
      } finally {
        if (!cancelled) setTitleHistoryLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  if (!wrestler) {
    return (
      <div style={{ padding: 32, color: '#fff', textAlign: 'center' }}>
        <p>Wrestler not found.</p>
        <Link to="/wrestlers" style={{ color: gold }}>← Back to Wrestlers</Link>
      </div>
    );
  }

  const country = getCountryForNationality(wrestler.nationality);
  const age = calculateAge(wrestler.dob);
  const accomplishmentsText = (wrestler.accomplishments || '').trim();
  const accomplishmentsList = accomplishmentsText ? accomplishmentsText.split(/\n/).filter(Boolean) : [];
  const isWrestler = (wrestler.person_type || 'Wrestler') === 'Wrestler';

  const metaTitle = `${wrestler.name} — Stats, Results & Profile | Pro Wrestling Boxscore`;
  const metaDescription = [
    wrestler.name,
    wrestler.brand ? `WWE ${wrestler.brand} wrestler.` : 'Wrestler profile.',
    'View match history, last 5 results, and accomplishments.',
  ].join(' ');

  return (
    <>
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={`https://prowrestlingboxscore.com/wrestler/${wrestler.id}`} />
      </Helmet>
      <div style={{ background: '#181818', color: '#fff', minHeight: '100vh', padding: '24px 16px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              {matchOrder != null && fromEvent && (
                <Link to={`/event/${fromEvent}/match/${matchOrder}`} style={{ color: gold, textDecoration: 'none' }}>
                  ← Back to match
                </Link>
              )}
              {fromEvent && (
                <Link to={`/event/${fromEvent}`} style={{ color: gold, textDecoration: 'none' }}>
                  ← Back to event{eventName ? `: ${eventName}` : ''}
                </Link>
              )}
              <Link to="/wrestlers" style={{ color: gold, textDecoration: 'none' }}>
                ← Back to Wrestlers
              </Link>
            </div>
            {canEdit && onUpdateWrestler && (
              <button
                type="button"
                onClick={() => setShowEditModal(true)}
                style={{
                  background: gold,
                  color: '#232323',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 20px',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Edit
              </button>
            )}
          </div>

          {/* Internal links: events & championships (at top of profile) */}
          <p style={{ marginBottom: 20, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 16px', fontSize: 14 }}>
            <Link to="/raw" style={{ color: gold, textDecoration: 'none', fontWeight: 600 }}>Raw results</Link>
            <Link to="/smackdown" style={{ color: gold, textDecoration: 'none', fontWeight: 600 }}>SmackDown results</Link>
            <Link to="/ple" style={{ color: gold, textDecoration: 'none', fontWeight: 600 }}>PLE results</Link>
            <Link to="/wrestlers" style={{ color: gold, textDecoration: 'none', fontWeight: 600 }}>Roster</Link>
            <Link to="/championships" style={{ color: gold, textDecoration: 'none', fontWeight: 600 }}>Championships</Link>
          </p>

          {/* Header: full-body/avatar + name (simplified for GM/Manager/Announcer) */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, marginBottom: 32, alignItems: 'flex-start' }}>
            <div style={{ flex: '0 0 auto' }}>
              {(isWrestler && (wrestler.full_body_image_url || wrestler.image_url)) || (!isWrestler && wrestler.image_url) ? (
                <img
                  src={isWrestler ? (wrestler.full_body_image_url || wrestler.image_url) : wrestler.image_url}
                  alt={wrestler.name}
                  style={{
                    width: isWrestler ? 200 : 120,
                    maxHeight: isWrestler ? 320 : 120,
                    objectFit: isWrestler ? 'contain' : 'cover',
                    borderRadius: 12,
                    border: '1px solid #444',
                    ...(isWrestler ? {} : { borderRadius: '50%' }),
                  }}
                />
              ) : (
                <div
                  style={{
                    width: isWrestler ? 200 : 120,
                    height: isWrestler ? 240 : 120,
                    background: '#232323',
                    borderRadius: isWrestler ? 12 : '50%',
                    border: '1px solid #444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: isWrestler ? 48 : 36,
                    color: '#555',
                  }}
                >
                  &#128100;
                </div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <h1 style={{ color: '#fff', fontSize: 28, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
                {wrestler.name}
              </h1>
              {!isWrestler && wrestler.person_type && (
                <div style={{ display: 'inline-block', background: '#333', color: gold, fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 6, marginBottom: 8 }}>
                  {wrestler.person_type}
                </div>
              )}
              {wrestler.nickname && (
                <div style={{ color: gold, fontSize: 18, fontStyle: 'italic', marginBottom: 12 }}>
                  &ldquo;{wrestler.nickname}&rdquo;
                </div>
              )}
              {(wrestler.tag_team_name || wrestler.stable) && (
                <div style={{ color: '#bbb', fontSize: 14, marginBottom: 16 }}>
                  {wrestler.tag_team_name && <span>Tag team: {wrestler.tag_team_name}</span>}
                  {wrestler.stable && <span style={{ marginLeft: wrestler.tag_team_name ? 12 : 0 }}>Stable: {wrestler.stable}</span>}
                </div>
              )}
              {/* Stacked profile information (simplified for non-wrestlers) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14, color: '#ccc' }}>
                {wrestler.dob && (
                  <div><span style={{ color: '#888', marginRight: 8 }}>Born:</span>{new Date(wrestler.dob).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                )}
                {age != null && <div><span style={{ color: '#888', marginRight: 8 }}>Age:</span>{age}</div>}
                {(wrestler.nationality || country) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#888', marginRight: 8 }}>Nationality:</span>
                    {country?.flagImage && <img src={country.flagImage} alt="" style={{ width: 20, height: 14, borderRadius: 2 }} />}
                    {wrestler.nationality}
                  </div>
                )}
                {isWrestler && wrestler.billed_from && <div><span style={{ color: '#888', marginRight: 8 }}>Billed From:</span>{wrestler.billed_from}</div>}
                {isWrestler && wrestler.height && <div><span style={{ color: '#888', marginRight: 8 }}>Height:</span>{wrestler.height}</div>}
                {isWrestler && wrestler.weight && <div><span style={{ color: '#888', marginRight: 8 }}>Weight:</span>{wrestler.weight}</div>}
                {wrestler.brand && <div><span style={{ color: '#888', marginRight: 8 }}>Brand:</span>{wrestler.brand}</div>}
              </div>
            </div>
          </div>

          {/* Accomplishments - only for wrestlers */}
          {isWrestler && (
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ color: gold, fontSize: 18, marginBottom: 12, borderBottom: '2px solid #C6A04F', paddingBottom: 6 }}>
              Accomplishments
            </h2>
            {accomplishmentsList.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: 20, color: '#ddd', lineHeight: 1.8 }}>
                {accomplishmentsList.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            ) : (
              <p style={{ color: '#888', margin: 0, fontStyle: 'italic' }}>No accomplishments added yet.</p>
            )}
          </section>
          )}

          {/* Title history - from championship_history (wrestlers only) */}
          {isWrestler && (
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ color: gold, fontSize: 18, marginBottom: 12, borderBottom: '2px solid #C6A04F', paddingBottom: 6 }}>
              Title history
            </h2>
            {titleHistoryLoading ? (
              <p style={{ color: '#888', margin: 0 }}>Loading title history…</p>
            ) : titleHistory.length === 0 ? (
              <p style={{ color: '#888', margin: 0, fontStyle: 'italic' }}>No title reigns on record.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 20, color: '#ddd', lineHeight: 1.8 }}>
                {titleHistory.map((reign) => (
                  <li key={reign.id} style={{ marginBottom: 8 }}>
                    <Link to={`/championship/${reign.championship_id}`} style={{ color: gold, textDecoration: 'none', fontWeight: 600 }}>
                      {reign.titleName}
                    </Link>
                    {' — '}
                    Won {formatReignDate(reign.date_won)}
                    {reign.date_lost ? ` · Lost ${formatReignDate(reign.date_lost)}` : ' · Present'}
                    {reign.event_name && ` (${reign.event_name})`}
                    {reign.days_held != null && reign.days_held !== '' && (
                      <span style={{ color: '#888', fontSize: 13 }}> · {reign.days_held} days</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
          )}

          {/* Last 5 Matches */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <h2 style={{ color: gold, fontSize: 18, margin: 0, borderBottom: '2px solid #C6A04F', paddingBottom: 6 }}>
                Last five matches
              </h2>
              {lastFiveOutcomes.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {lastFiveOutcomes.map((outcome, i) => (
                    <div
                      key={i}
                      title={outcome === 'W' ? 'Win' : outcome === 'D' ? 'Draw' : 'Loss'}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 13,
                        fontWeight: 700,
                        color: '#fff',
                        background: outcome === 'W' ? '#2e7d32' : outcome === 'D' ? '#f9a825' : '#c62828',
                      }}
                    >
                      {outcome}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {lastFiveMatches.length === 0 ? (
              <p style={{ color: '#888' }}>No match history yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {lastFiveMatches.map(({ event, match, matchIndex }) => (
                  <div key={`${event.id}-${match.order ?? matchIndex}`}>
                    <div style={{ color: '#aaa', fontSize: 13, marginBottom: 8 }}>
                      <Link to={`/event/${event.id}`} style={{ color: gold, textDecoration: 'none', fontWeight: 600 }}>
                        {event.name}
                      </Link>
                      {event.date && ` — ${event.date}`}
                      {event.location && ` — ${event.location}`}
                    </div>
                    <Link
                      to={`/event/${event.id}/match/${matchIndex + 1}`}
                      style={{ textDecoration: 'none', display: 'block' }}
                    >
                      <MatchCard
                        match={match}
                        event={{ id: event.id }}
                        wrestlerMap={wrestlerMap}
                        isClickable={true}
                        matchIndex={matchIndex}
                        events={events}
                      />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {showEditModal && wrestler && onUpdateWrestler && (
        <WrestlerEditModal
          wrestler={wrestler}
          allWrestlers={wrestlers || []}
          onClose={() => setShowEditModal(false)}
          onSave={(updated) => {
            onUpdateWrestler(updated, wrestler.id);
            setShowEditModal(false);
            if (updated.id !== wrestler.id) navigate(`/wrestler/${updated.id}`, { replace: true });
          }}
        />
      )}
    </>
  );
}
