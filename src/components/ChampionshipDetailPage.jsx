import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useUser } from '../hooks/useUser';

const gold = '#C6A04F';

const BELT_IMAGE_MAP = {
  'wwe-championship': 'undisputed-wwe-championship.png',
  'world-heavyweight-championship': 'world-heavyweight-championship.png',
  'mens-ic-championship': 'mens-intercontinental-championship1.png',
  'mens-us-championship': 'mens-united-states-championship.png',
  'raw-tag-team-championship': 'raw-tag-team-championship.png',
  'smackdown-tag-team-championship': 'smackdown-tag-team-championship.png',
  'wwe-womens-championship': 'wwe-womens-championship.png',
  'womens-world-championship': 'womens-world-championship.png',
  'womens-ic-championship': 'womens-intercontinental-championship.png',
  'womens-us-championship': 'womens-united-states-championship.png',
  'womens-tag-team-championship': 'womens-tag-team-championship.png',
};

const BRAND_COLORS = {
  RAW: '#e10600',
  SmackDown: '#0066a1',
  NXT: '#ffc20e',
  Unassigned: '#888',
};

function getBeltImageUrl(championshipId) {
  const filename = BELT_IMAGE_MAP[championshipId];
  if (!filename) return null;
  return `https://qvbqxietcmweltxoonvh.supabase.co/storage/v1/object/public/belts/${filename}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function ChampionshipDetailPage({ wrestlers = [] }) {
  const { id } = useParams();
  const user = useUser();
  const isAuthorized = !!user;

  // Fallback: resolve slug from champion/previous_champion name when row has no slug (e.g. older data)
  const nameToSlug = useMemo(() => {
    const map = {};
    (wrestlers || []).forEach((w) => {
      if (w?.name && w?.id) {
        const key = String(w.name).trim().toLowerCase();
        if (!map[key]) map[key] = w.id;
      }
    });
    return map;
  }, [wrestlers]);
  const getSlugForName = (name) => {
    if (!name || typeof name !== 'string') return null;
    return nameToSlug[name.trim().toLowerCase()] || null;
  };

  const [championship, setChampionship] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [titleFactsList, setTitleFactsList] = useState([]);
  const [newFactInput, setNewFactInput] = useState('');
  const [savingFacts, setSavingFacts] = useState(false);
  const [factsSaved, setFactsSaved] = useState(false);

  const [showAddReign, setShowAddReign] = useState(false);
  const [editingRowId, setEditingRowId] = useState(null);
  const [reignForm, setReignForm] = useState({
    champion: '',
    champion_slug: '',
    previous_champion: '',
    previous_champion_slug: '',
    date_won: '',
    date_lost: '',
    event_name: '',
  });
  const [savingReign, setSavingReign] = useState(false);
  const [reignError, setReignError] = useState('');

  const refetchHistory = async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from('championship_history')
      .select('*')
      .eq('championship_id', id)
      .order('date_won', { ascending: false });
    if (!error) setHistory(data || []);
  };

  // Always show title history in chronological order: most recent at top
  const sortedHistory = useMemo(() => {
    return [...history].sort((a, b) => {
      const dateA = a.date_won ? new Date(a.date_won).getTime() : 0;
      const dateB = b.date_won ? new Date(b.date_won).getTime() : 0;
      return dateB - dateA;
    });
  }, [history]);

  // Current reign from title history (most recent row with no date_lost) so header matches the table
  const currentReignFromHistory = useMemo(() => {
    if (!sortedHistory.length) return null;
    const mostRecent = sortedHistory[0];
    if (mostRecent.date_lost != null && mostRecent.date_lost !== '') return null;
    return mostRecent;
  }, [sortedHistory]);

  useEffect(() => {
    if (!id) return;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data: champData, error: champError } = await supabase
          .from('championships')
          .select('*')
          .eq('id', id)
          .single();

        if (champError) throw champError;
        if (!champData) {
          setError('Championship not found.');
          setLoading(false);
          return;
        }

        setChampionship(champData);
        const raw = champData.title_facts;
        if (raw && typeof raw === 'string') {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) setTitleFactsList(parsed.filter((x) => x != null && String(x).trim()));
            else setTitleFactsList([raw].filter(Boolean));
          } catch {
            setTitleFactsList(raw.trim() ? [raw.trim()] : []);
          }
        } else {
          setTitleFactsList([]);
        }

        const { data: historyData, error: historyError } = await supabase
          .from('championship_history')
          .select('*')
          .eq('championship_id', id)
          .order('date_won', { ascending: false });

        if (historyError) {
          if (historyError.code === '42P01' || historyError.message?.includes('does not exist')) {
            setHistory([]);
          } else {
            throw historyError;
          }
        } else {
          setHistory(historyData || []);
        }
      } catch (err) {
        console.error(err);
        setError(err.message || 'Failed to load championship.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const persistFactsList = async (list) => {
    if (!championship || !isAuthorized) return;
    setSavingFacts(true);
    setFactsSaved(false);
    try {
      const value = list.length ? JSON.stringify(list) : null;
      const { error: updateError } = await supabase
        .from('championships')
        .update({ title_facts: value })
        .eq('id', championship.id);

      if (updateError) throw updateError;
      setChampionship((prev) => (prev ? { ...prev, title_facts: value } : null));
      setTitleFactsList(list);
      setFactsSaved(true);
      setTimeout(() => setFactsSaved(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingFacts(false);
    }
  };

  const handleAddFact = async () => {
    const text = newFactInput.trim();
    if (!text || !championship || !isAuthorized) return;
    const next = [...titleFactsList, text];
    setNewFactInput('');
    await persistFactsList(next);
  };

  const handleMoveFact = async (index, direction) => {
    if (index < 0 || index >= titleFactsList.length) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= titleFactsList.length) return;
    const next = [...titleFactsList];
    [next[index], next[newIndex]] = [next[newIndex], next[index]];
    await persistFactsList(next);
  };

  const handleDeleteFact = async (index) => {
    const next = titleFactsList.filter((_, i) => i !== index);
    await persistFactsList(next);
  };

  const openAddReign = () => {
    setEditingRowId(null);
    setReignForm({
      champion: '',
      champion_slug: '',
      previous_champion: '',
      previous_champion_slug: '',
      date_won: '',
      date_lost: '',
      event_name: '',
    });
    setReignError('');
    setShowAddReign(true);
  };

  const openEditReign = (row) => {
    setShowAddReign(false);
    setEditingRowId(row.id);
    setReignForm({
      champion: row.champion || '',
      champion_slug: row.champion_slug || '',
      previous_champion: row.previous_champion || '',
      previous_champion_slug: row.previous_champion_slug || '',
      date_won: row.date_won || '',
      date_lost: row.date_lost || '',
      event_name: row.event_name || '',
    });
    setReignError('');
  };

  const cancelReignForm = () => {
    setShowAddReign(false);
    setEditingRowId(null);
    setReignError('');
  };

  const computeDaysHeld = (dateWon, dateLost) => {
    if (!dateWon || !dateLost) return null;
    const start = new Date(dateWon);
    const end = new Date(dateLost);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
    const diff = Math.round((end - start) / (1000 * 60 * 60 * 24));
    return diff >= 0 ? diff : null;
  };

  const handleSaveReign = async () => {
    if (!championship || !reignForm.champion?.trim() || !reignForm.date_won?.trim()) {
      setReignError('Champion and Date won are required.');
      return;
    }
    setSavingReign(true);
    setReignError('');
    try {
      const daysHeld = computeDaysHeld(reignForm.date_won, reignForm.date_lost || null);
      const payload = {
        championship_id: championship.id,
        champion: reignForm.champion.trim(),
        champion_slug: reignForm.champion_slug?.trim() || null,
        previous_champion: reignForm.previous_champion?.trim() || null,
        previous_champion_slug: reignForm.previous_champion_slug?.trim() || null,
        date_won: reignForm.date_won.trim(),
        date_lost: reignForm.date_lost?.trim() || null,
        event_name: reignForm.event_name?.trim() || null,
        days_held: daysHeld,
      };
      if (editingRowId) {
        const { error: updateError } = await supabase
          .from('championship_history')
          .update(payload)
          .eq('id', editingRowId);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('championship_history')
          .insert(payload);
        if (insertError) throw insertError;
      }
      await refetchHistory();
      cancelReignForm();
    } catch (err) {
      console.error(err);
      setReignError(err.message || 'Failed to save reign.');
    } finally {
      setSavingReign(false);
    }
  };

  const handleDeleteReign = async (rowId) => {
    if (!window.confirm('Remove this reign from title history?')) return;
    try {
      const { error } = await supabase
        .from('championship_history')
        .delete()
        .eq('id', rowId);
      if (error) throw error;
      await refetchHistory();
    } catch (err) {
      console.error(err);
      setReignError(err.message || 'Failed to delete reign.');
    }
  };

  const inputStyle = {
    padding: '8px 10px',
    borderRadius: 6,
    border: '1px solid #444',
    background: '#222',
    color: '#fff',
    fontSize: 14,
    width: '100%',
    boxSizing: 'border-box',
  };

  if (loading) {
    return (
      <div style={{ color: '#fff', padding: 40, textAlign: 'center' }}>
        Loading...
      </div>
    );
  }

  if (error || !championship) {
    return (
      <div style={{ color: '#fff', padding: 40, maxWidth: 800, margin: '0 auto' }}>
        <Link to="/championships" style={{ color: gold }}>← Back to Championships</Link>
        <p style={{ marginTop: 24 }}>{error || 'Championship not found.'}</p>
      </div>
    );
  }

  const brandColor = BRAND_COLORS[championship.brand] || BRAND_COLORS.Unassigned;
  const beltUrl = getBeltImageUrl(championship.id);

  return (
    <>
      <Helmet>
        <title>{championship.title_name} - Title History | Pro Wrestling Boxscore</title>
        <meta name="description" content={`${championship.title_name} history, current champion ${currentReignFromHistory?.champion ?? championship.current_champion}, past champions, and title facts.`} />
        <link rel="canonical" href={`https://prowrestlingboxscore.com/championship/${championship.id}`} />
      </Helmet>

      <div style={{ color: '#fff', padding: 40, maxWidth: 900, margin: '0 auto' }}>
        <Link to="/championships" style={{ color: gold, marginBottom: 12, display: 'inline-block' }}>
          ← Back to Championships
        </Link>
        <p style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', fontSize: 14, marginBottom: 24 }}>
          <Link to="/raw" style={{ color: gold, textDecoration: 'none', fontWeight: 600 }}>Raw results</Link>
          <Link to="/smackdown" style={{ color: gold, textDecoration: 'none', fontWeight: 600 }}>SmackDown results</Link>
          <Link to="/ple" style={{ color: gold, textDecoration: 'none', fontWeight: 600 }}>PLE results</Link>
          <Link to="/wrestlers" style={{ color: gold, textDecoration: 'none', fontWeight: 600 }}>Roster</Link>
          <Link to="/championships" style={{ color: gold, textDecoration: 'none', fontWeight: 600 }}>Championships</Link>
        </p>

        {/* Header: belt, title, current champion, brand */}
        <div
          style={{
            background: '#181818',
            padding: 24,
            borderRadius: 12,
            border: `2px solid ${brandColor}`,
            marginBottom: 24,
            textAlign: 'center',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              background: brandColor,
              color: '#fff',
              padding: '4px 12px',
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 12,
            }}
          >
            {championship.brand || 'Unassigned'}
          </span>
          <h1 style={{ color: gold, fontSize: 26, fontWeight: 800, margin: '12px 0 16px' }}>
            {championship.title_name}
          </h1>
          {beltUrl && (
            <div style={{ marginBottom: 16 }}>
              <img
                src={beltUrl}
                alt={`${championship.title_name} belt`}
                style={{ maxWidth: 280, height: 'auto', objectFit: 'contain' }}
              />
            </div>
          )}
          <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>
            Current Champion:{' '}
            {(() => {
              const champ = currentReignFromHistory ?? championship;
              const name = champ?.champion ?? championship?.current_champion;
              let slug = champ?.champion_slug ?? championship?.current_champion_slug;
              if (!slug && name) slug = getSlugForName(name);
              const isVacant = name === 'VACANT' || slug === 'vacant';
              if (isVacant || !slug) return name || 'VACANT';
              return <Link to={`/wrestler/${slug}`} style={{ color: '#fff', textDecoration: 'none' }}>{name}</Link>;
            })()}
          </div>
          {(currentReignFromHistory?.date_won ?? championship.date_won) && (
            <div style={{ fontSize: 14, color: '#aaa', marginTop: 4 }}>
              Won {formatDate(currentReignFromHistory?.date_won ?? championship.date_won)}
              {(currentReignFromHistory?.event_name ?? championship.event_name) && ` at ${currentReignFromHistory?.event_name ?? championship.event_name}`}
            </div>
          )}
        </div>

        {/* Title History */}
        <section style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
            <h2 style={{ color: gold, fontSize: 18, borderBottom: `2px solid ${gold}`, paddingBottom: 8, margin: 0 }}>
              Title History
            </h2>
            {isAuthorized && !showAddReign && !editingRowId && (
              <button
                type="button"
                onClick={openAddReign}
                style={{
                  padding: '8px 16px',
                  background: gold,
                  color: '#232323',
                  border: 'none',
                  borderRadius: 6,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                + Add reign
              </button>
            )}
          </div>
          <p style={{ color: '#888', fontSize: 13, margin: '0 0 16px' }}>Most recent champion at top, chronological order.</p>

          {(showAddReign || editingRowId) && isAuthorized && (
            <div style={{ background: '#222', padding: 16, borderRadius: 8, border: '1px solid #444', marginBottom: 16 }}>
              <h3 style={{ color: gold, fontSize: 14, margin: '0 0 12px' }}>{editingRowId ? 'Edit reign' : 'Add reign'}</h3>
              {reignError && <p style={{ color: '#e57373', fontSize: 13, marginBottom: 12 }}>{reignError}</p>}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#aaa', marginBottom: 4 }}>Champion *</label>
                  <input
                    type="text"
                    value={reignForm.champion}
                    onChange={(e) => setReignForm((f) => ({ ...f, champion: e.target.value }))}
                    placeholder="Name"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#aaa', marginBottom: 4 }}>Defeated</label>
                  <input
                    type="text"
                    value={reignForm.previous_champion}
                    onChange={(e) => setReignForm((f) => ({ ...f, previous_champion: e.target.value }))}
                    placeholder="Previous champion"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#aaa', marginBottom: 4 }}>Date won *</label>
                  <input
                    type="date"
                    value={reignForm.date_won}
                    onChange={(e) => setReignForm((f) => ({ ...f, date_won: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#aaa', marginBottom: 4 }}>Date lost</label>
                  <input
                    type="date"
                    value={reignForm.date_lost}
                    onChange={(e) => setReignForm((f) => ({ ...f, date_lost: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#aaa', marginBottom: 4 }}>Event</label>
                  <input
                    type="text"
                    value={reignForm.event_name}
                    onChange={(e) => setReignForm((f) => ({ ...f, event_name: e.target.value }))}
                    placeholder="e.g. WrestleMania 40"
                    style={inputStyle}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={handleSaveReign}
                  disabled={savingReign}
                  style={{
                    padding: '8px 16px',
                    background: gold,
                    color: '#232323',
                    border: 'none',
                    borderRadius: 6,
                    fontWeight: 600,
                    cursor: savingReign ? 'not-allowed' : 'pointer',
                  }}
                >
                  {savingReign ? 'Saving...' : editingRowId ? 'Update' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={cancelReignForm}
                  style={{
                    padding: '8px 16px',
                    background: 'transparent',
                    color: '#ccc',
                    border: '1px solid #555',
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {history.length === 0 && !showAddReign && !editingRowId ? (
            <p style={{ color: '#888' }}>No title history recorded yet. History is updated automatically when champions change. Authorized users can add historical reigns.</p>
          ) : (
            <div style={{ background: '#181818', borderRadius: 8, border: '1px solid #333', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: '#222', color: gold }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Champion</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Defeated</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Date Won</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Date Lost</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Days</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Event</th>
                    {isAuthorized && <th style={{ padding: '10px 12px', width: 100 }} />}
                  </tr>
                </thead>
                <tbody>
                  {sortedHistory.map((row) => {
                    const championSlug = (row.champion_slug && row.champion_slug !== 'vacant')
                      ? row.champion_slug
                      : getSlugForName(row.champion);
                    const defeatedSlug = (row.previous_champion_slug && row.previous_champion_slug !== 'vacant')
                      ? row.previous_champion_slug
                      : getSlugForName(row.previous_champion);
                    return (
                    <tr key={row.id} style={{ borderTop: '1px solid #333' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                        {championSlug ? (
                          <Link to={`/wrestler/${championSlug}`} style={{ color: '#fff', textDecoration: 'none' }}>{row.champion}</Link>
                        ) : (
                          row.champion
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#bbb' }}>
                        {defeatedSlug ? (
                          <Link to={`/wrestler/${defeatedSlug}`} style={{ color: gold, textDecoration: 'none' }}>{row.previous_champion || '—'}</Link>
                        ) : (
                          row.previous_champion || '—'
                        )}
                      </td>
                      <td style={{ padding: '10px 12px' }}>{formatDate(row.date_won)}</td>
                      <td style={{ padding: '10px 12px' }}>{formatDate(row.date_lost)}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>{row.days_held != null ? row.days_held : '—'}</td>
                      <td style={{ padding: '10px 12px', color: '#aaa', fontSize: 13 }}>{row.event_name || '—'}</td>
                      {isAuthorized && (
                        <td style={{ padding: '10px 12px' }}>
                          <button
                            type="button"
                            onClick={() => openEditReign(row)}
                            style={{
                              marginRight: 8,
                              padding: '4px 8px',
                              fontSize: 12,
                              background: 'transparent',
                              color: gold,
                              border: `1px solid ${gold}`,
                              borderRadius: 4,
                              cursor: 'pointer',
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteReign(row.id)}
                            style={{
                              padding: '4px 8px',
                              fontSize: 12,
                              background: 'transparent',
                              color: '#e57373',
                              border: '1px solid #e57373',
                              borderRadius: 4,
                              cursor: 'pointer',
                            }}
                          >
                            Delete
                          </button>
                        </td>
                      )}
                    </tr>
                  ); })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Title Facts */}
        <section>
          <h2 style={{ color: gold, fontSize: 18, borderBottom: `2px solid ${gold}`, paddingBottom: 8, marginBottom: 16 }}>
            Title Facts &amp; Trivia
          </h2>
          {isAuthorized ? (
            <>
              {titleFactsList.length > 0 && (
                <ul style={{ listStyle: 'disc', paddingLeft: 24, margin: '0 0 16px', color: '#ccc', lineHeight: 1.7 }}>
                  {titleFactsList.map((fact, index) => (
                    <li key={index} style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ flex: 1 }}>{fact}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <button
                          type="button"
                          onClick={() => handleMoveFact(index, 'up')}
                          disabled={savingFacts || index === 0}
                          title="Move up"
                          style={{
                            padding: '2px 6px',
                            fontSize: 12,
                            background: 'transparent',
                            color: gold,
                            border: `1px solid ${gold}`,
                            borderRadius: 4,
                            cursor: savingFacts || index === 0 ? 'not-allowed' : 'pointer',
                            opacity: index === 0 ? 0.5 : 1,
                          }}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveFact(index, 'down')}
                          disabled={savingFacts || index === titleFactsList.length - 1}
                          title="Move down"
                          style={{
                            padding: '2px 6px',
                            fontSize: 12,
                            background: 'transparent',
                            color: gold,
                            border: `1px solid ${gold}`,
                            borderRadius: 4,
                            cursor: savingFacts || index === titleFactsList.length - 1 ? 'not-allowed' : 'pointer',
                            opacity: index === titleFactsList.length - 1 ? 0.5 : 1,
                          }}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteFact(index)}
                          disabled={savingFacts}
                          title="Remove"
                          style={{
                            padding: '2px 6px',
                            fontSize: 12,
                            background: 'transparent',
                            color: '#e57373',
                            border: '1px solid #e57373',
                            borderRadius: 4,
                            cursor: savingFacts ? 'not-allowed' : 'pointer',
                          }}
                        >
                          Remove
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  value={newFactInput}
                  onChange={(e) => setNewFactInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddFact()}
                  placeholder="Add a fact or trivia..."
                  style={{
                    flex: 1,
                    minWidth: 200,
                    padding: '8px 12px',
                    background: '#222',
                    border: '1px solid #444',
                    borderRadius: 6,
                    color: '#fff',
                    fontSize: 14,
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddFact}
                  disabled={savingFacts || !newFactInput.trim()}
                  style={{
                    padding: '8px 16px',
                    background: gold,
                    color: '#232323',
                    border: 'none',
                    borderRadius: 6,
                    fontWeight: 600,
                    cursor: savingFacts || !newFactInput.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  {savingFacts ? 'Saving...' : 'Add'}
                </button>
                {factsSaved && <span style={{ color: '#4caf50', fontSize: 14 }}>Saved.</span>}
              </div>
            </>
          ) : (
            <div style={{ background: '#181818', padding: 16, borderRadius: 8, border: '1px solid #333', color: '#ccc' }}>
              {titleFactsList.length > 0 ? (
                <ul style={{ listStyle: 'disc', paddingLeft: 24, margin: 0, lineHeight: 1.7 }}>
                  {titleFactsList.map((fact, index) => (
                    <li key={index}>{fact}</li>
                  ))}
                </ul>
              ) : (
                <span>No facts added yet.</span>
              )}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
