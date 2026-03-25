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
  getMatchRecordStatsForYear,
} from '../utils/matchOutcomes';
import { getEventSlug } from '../utils/eventSlug';

/** Parse YYYY-MM-DD as a local calendar date (avoids UTC off-by-one vs title history). */
function parseCalendarDateMs(dateStr) {
  if (!dateStr) return 0;
  const s = String(dateStr).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, mo, d] = s.split('-').map(Number);
    return new Date(y, mo - 1, d).getTime();
  }
  const dt = new Date(dateStr);
  return Number.isNaN(dt.getTime()) ? 0 : dt.getTime();
}

function formatReignDate(dateStr) {
  if (!dateStr) return '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr).trim())) {
    const [y, mo, d] = String(dateStr).split('-').map(Number);
    const dt = new Date(y, mo - 1, d);
    return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
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

function daysHeldFromDateWon(dateStr) {
  if (!dateStr) return null;
  let start;
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr).trim())) {
    const [y, mo, d] = String(dateStr).split('-').map(Number);
    start = new Date(y, mo - 1, d);
  } else {
    start = new Date(dateStr);
  }
  if (Number.isNaN(start.getTime())) return null;
  const today = new Date();
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.max(0, Math.round((t - s) / 86400000));
}

function formatChampionshipWonDate(dateStr) {
  if (!dateStr) return '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr).trim())) {
    const [y, mo, d] = String(dateStr).split('-').map(Number);
    const dt = new Date(y, mo - 1, d);
    return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: '2-digit' });
  }
  const dt = new Date(dateStr);
  if (Number.isNaN(dt.getTime())) return dateStr;
  return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: '2-digit' });
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
      return parsed && (typeof parsed.fromEvent === 'string' || typeof parsed.fromEventSlug === 'string') ? parsed : null;
    } catch {
      return null;
    }
  }, []);
  const fromEvent = fromState?.fromEvent ?? storedContext?.fromEvent ?? null;
  const fromEventSlug = fromState?.fromEventSlug ?? storedContext?.fromEventSlug ?? null;
  const eventName = fromState?.eventName ?? storedContext?.eventName ?? null;
  const matchOrder = fromState?.matchOrder;
  const user = useUser();
  const canEdit = !!(user && user.email);
  const [showEditModal, setShowEditModal] = useState(false);
  const map = wrestlerMap || {};
  const wrestler = map[slug] || (wrestlers || []).find(w => w.id === slug);

  const lastFiveMatches = useMemo(
    () => (slug && events ? getLastMatchesForWrestler(events, slug, 5, { wrestlerMap: map }) : []),
    [events, slug, map]
  );

  const lastFiveOutcomes = useMemo(
    () => lastFiveMatches.map(({ match }) => getMatchOutcome(match, slug, map)),
    [lastFiveMatches, slug, map]
  );

  const [titleHistory, setTitleHistory] = useState([]);
  const [titleHistoryLoading, setTitleHistoryLoading] = useState(true);
  const [currentChampionships, setCurrentChampionships] = useState([]);
  const [currentChampionshipsLoading, setCurrentChampionshipsLoading] = useState(true);
  const [matchRecordYear, setMatchRecordYear] = useState(2026);

  const matchRecordStats = useMemo(
    () =>
      slug && events
        ? getMatchRecordStatsForYear(events, slug, matchRecordYear, map)
        : null,
    [events, slug, matchRecordYear, map]
  );

  /**
   * Banner "Won" date: prefer the active reign from championship_history (same as Title history).
   * The championships.date_won column can lag or differ from title history after updates.
   */
  const currentChampionshipsWithResolvedDates = useMemo(() => {
    return currentChampionships.map((ch) => {
      const presentReigns = titleHistory.filter(
        (r) =>
          String(r.championship_id) === String(ch.id) &&
          (r.date_lost == null || String(r.date_lost).trim() === '')
      );
      let best = null;
      let bestTs = -1;
      for (const r of presentReigns) {
        const ts = parseCalendarDateMs(r.date_won);
        if (ts >= bestTs) {
          bestTs = ts;
          best = r;
        }
      }
      const resolvedDateWon = best?.date_won ?? ch.date_won;
      return { ...ch, resolvedDateWon };
    });
  }, [currentChampionships, titleHistory]);

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
        // 1) Fetch by champion_slug (primary link from championship title history)
        const { data: bySlugData, error: historyError } = await supabase
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
        let reigns = bySlugData || [];
        const seenIds = new Set((reigns || []).map((r) => r.id).filter(Boolean));

        // 2) Tag team titles: fetch reigns where champion_slug is a tag team this wrestler belongs to
        const { data: teamMembers } = await supabase
          .from('tag_team_members')
          .select('tag_team_id')
          .eq('wrestler_slug', slug);

        if (!cancelled && teamMembers?.length) {
          const teamIds = [...new Set(teamMembers.map((m) => m.tag_team_id).filter(Boolean))];
          if (teamIds.length > 0) {
            const { data: byTagTeamData } = await supabase
              .from('championship_history')
              .select('*')
              .in('champion_slug', teamIds)
              .order('date_won', { ascending: false });

            if (byTagTeamData?.length) {
              for (const r of byTagTeamData) {
                if (r.id && !seenIds.has(r.id)) {
                  seenIds.add(r.id);
                  reigns.push(r);
                }
              }
              reigns = reigns.sort((a, b) => {
                const da = a.date_won ? new Date(a.date_won).getTime() : 0;
                const db = b.date_won ? new Date(b.date_won).getTime() : 0;
                return db - da;
              });
            }
          }
        }

        // 3) If we have a wrestler name, match reigns where champion equals name or champion text contains name (tag teams, etc.)
        const wrestlerName = wrestler?.name || (wrestlers || []).find((w) => w.id === slug)?.name;
        if (wrestlerName && typeof wrestlerName === 'string' && wrestlerName.trim()) {
          const nameTrimmed = wrestlerName.trim();
          const slugLower = slug.toLowerCase();
          // 3a) Exact/ilike match (champion = name, or champion_slug null with name match)
          const { data: byNameData } = await supabase
            .from('championship_history')
            .select('*')
            .ilike('champion', nameTrimmed)
            .order('date_won', { ascending: false });

          if (!cancelled && byNameData?.length) {
            for (const r of byNameData) {
              const slugEmpty = r.champion_slug == null || String(r.champion_slug).trim() === '';
              const slugMatchesCaseInsensitive = r.champion_slug && String(r.champion_slug).toLowerCase() === slugLower;
              if (r.id && !seenIds.has(r.id) && (slugEmpty || slugMatchesCaseInsensitive)) {
                seenIds.add(r.id);
                reigns.push(r);
              }
            }
          }

          // 3b) Champion string contains wrestler name (e.g. "Team (Lash Legend & Nia Jax)" or "A & B" without tag_team_members)
          const escapedName = nameTrimmed.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
          const { data: byNameContainsData } = await supabase
            .from('championship_history')
            .select('*')
            .ilike('champion', `%${escapedName}%`)
            .order('date_won', { ascending: false });

          if (!cancelled && byNameContainsData?.length) {
            const nameLower = nameTrimmed.toLowerCase();
            for (const r of byNameContainsData) {
              const championStr = String(r.champion || '').toLowerCase();
              const containsName = championStr.includes(nameLower);
              if (r.id && !seenIds.has(r.id) && containsName) {
                seenIds.add(r.id);
                reigns.push(r);
              }
            }
            reigns = reigns.sort((a, b) => {
              const da = a.date_won ? new Date(a.date_won).getTime() : 0;
              const db = b.date_won ? new Date(b.date_won).getTime() : 0;
              return db - da;
            });
          }
        }

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
  }, [slug, wrestler?.name, wrestlers]);

  useEffect(() => {
    if (!slug) {
      setCurrentChampionships([]);
      setCurrentChampionshipsLoading(false);
      return;
    }
    let cancelled = false;
    setCurrentChampionshipsLoading(true);
    (async () => {
      try {
        const { data: directRows } = await supabase
          .from('championships')
          .select('id, title_name, date_won, current_champion_slug, type')
          .eq('current_champion_slug', slug);

        const teamIds = [];
        const { data: teamMembers } = await supabase
          .from('tag_team_members')
          .select('tag_team_id')
          .eq('wrestler_slug', slug);
        if (teamMembers?.length) {
          teamIds.push(...new Set(teamMembers.map((m) => m.tag_team_id).filter(Boolean)));
        }

        let teamRows = [];
        if (teamIds.length > 0) {
          const { data: teamChamps } = await supabase
            .from('championships')
            .select('id, title_name, date_won, current_champion_slug, type')
            .in('current_champion_slug', teamIds);
          teamRows = teamChamps || [];
        }

        const byId = new Map();
        for (const r of [...(directRows || []), ...teamRows]) {
          if (!r || !r.id) continue;
          if (!r.current_champion_slug || r.current_champion_slug === 'vacant') continue;
          byId.set(r.id, r);
        }
        const list = Array.from(byId.values());
        if (!cancelled) setCurrentChampionships(list);
      } catch {
        if (!cancelled) setCurrentChampionships([]);
      } finally {
        if (!cancelled) setCurrentChampionshipsLoading(false);
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
  const r26 = wrestler.rating_2k26 ?? wrestler['2K26 rating'];
  const r25 = wrestler.rating_2k25 ?? wrestler['2K25 rating'];
  const rating2KDisplay = (r26 != null && r26 !== '') ? String(r26) : (r25 != null && r25 !== '') ? String(r25) : 'TBD';

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
              {matchOrder != null && (fromEventSlug || fromEvent) && (
                <Link to={fromEventSlug ? `/events/${fromEventSlug}/match/${matchOrder}` : `/event/${fromEvent}/match/${matchOrder}`} style={{ color: gold, textDecoration: 'none' }}>
                  ← Back to match
                </Link>
              )}
              {(fromEventSlug || fromEvent) && (
                <Link to={fromEventSlug ? `/events/${fromEventSlug}` : `/event/${fromEvent}`} style={{ color: gold, textDecoration: 'none' }}>
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
                <div><span style={{ color: '#888', marginRight: 8 }}>2K Rating:</span>{rating2KDisplay}</div>
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

          {/* Current championship — gold banner (sister-site style) */}
          {isWrestler && !currentChampionshipsLoading && currentChampionshipsWithResolvedDates.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              {currentChampionshipsWithResolvedDates.map((ch) => {
                const days = daysHeldFromDateWon(ch.resolvedDateWon);
                return (
                  <Link
                    key={ch.id}
                    to={`/championship/${ch.id}`}
                    style={{
                      display: 'block',
                      textDecoration: 'none',
                      marginBottom: 12,
                      borderRadius: 12,
                      border: '1px solid #4a3d18',
                      background: 'linear-gradient(100deg, #c9a84a 0%, #e6cf7a 35%, #d4b24a 70%, #9a7320 100%)',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), 0 4px 14px rgba(0,0,0,0.35)',
                      padding: '26px 20px',
                      textAlign: 'center',
                      color: '#2d2110',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: 0.5, opacity: 0.92, marginBottom: 8 }}>
                      Current championship
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.25, marginBottom: 10, textShadow: '0 1px 0 rgba(255,255,255,0.25)' }}>
                      {ch.title_name || 'Championship'}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 500 }}>
                      <span style={{ fontWeight: 700 }}>Won</span>{' '}
                      {formatChampionshipWonDate(ch.resolvedDateWon)}
                      {days != null && (
                        <>
                          {' '}
                          <span style={{ fontWeight: 700 }}>Days held</span> {days}
                        </>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Match record by year — MatchCard-style dark card */}
          {isWrestler && matchRecordStats && (
            <section style={{ marginBottom: 32 }}>
              <div
                style={{
                  background: '#232323',
                  border: '1px solid #444',
                  borderRadius: 12,
                  boxShadow: '0 0 12px #C6A04F22',
                  padding: '20px 18px 16px',
                  color: '#ccc',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12,
                    marginBottom: 16,
                    paddingBottom: 12,
                    borderBottom: '1px solid #444',
                  }}
                >
                  <Link
                    to={`/wrestler/${slug}/matches`}
                    state={{ year: matchRecordYear }}
                    style={{
                      margin: 0,
                      fontSize: 18,
                      fontWeight: 800,
                      color: gold,
                      textDecoration: 'none',
                    }}
                  >
                    <h2 style={{ margin: 0, fontSize: 'inherit', fontWeight: 800, color: 'inherit' }}>
                      Match record ({matchRecordYear})
                    </h2>
                  </Link>
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
                      value={matchRecordYear}
                      onChange={(e) => setMatchRecordYear(Number(e.target.value))}
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
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'nowrap',
                    gap: '10px 18px',
                    alignItems: 'baseline',
                    fontSize: 15,
                    lineHeight: 1.5,
                    color: '#e8e8e8',
                    overflowX: 'auto',
                    WebkitOverflowScrolling: 'touch',
                    paddingBottom: 4,
                  }}
                >
                  {[
                    ['MW', matchRecordStats.mw],
                    ['Win', matchRecordStats.winTotal],
                    ['W%', matchRecordStats.winPct],
                    ['Loss', matchRecordStats.lossTotal],
                    ['L%', matchRecordStats.lossPct],
                    ['NC', matchRecordStats.nc],
                    ['DQW', matchRecordStats.dqWin],
                    ['DQL', matchRecordStats.dqLoss],
                    ['DQ%', matchRecordStats.dqPct],
                  ].map(([label, val]) => (
                    <span key={label} style={{ flexShrink: 0 }}>
                      <strong style={{ color: gold }}>{label}</strong> {val}
                    </span>
                  ))}
                </div>
                <p
                  style={{
                    margin: '14px 0 0',
                    paddingTop: 12,
                    borderTop: '1px solid #444',
                    fontSize: 11,
                    color: '#888',
                    lineHeight: 1.45,
                  }}
                >
                  MW = Matches wrestled · Win/Loss = total wins/losses (DQ included) · NC = No contest / draw
                  outcomes · DQW/DQL = subset won/lost via DQ · W%/L% = total wins or losses ÷ MW · DQ% = DQ
                  matches ÷ MW
                </p>
              </div>
            </section>
          )}

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
                      <Link to={`/events/${getEventSlug(event)}`} style={{ color: gold, textDecoration: 'none', fontWeight: 600 }}>
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
