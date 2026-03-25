import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import countries from '../data/countries';
import {
  getLastMatchesForWrestler,
  getMatchOutcome,
  getMatchRecordStatsForYear,
  getYearFromEventDate,
} from '../utils/matchOutcomes';
import { getWinnerSideIndex, parseTeamStringForPage, getVersusTeamStrings } from '../utils/matchPageLayout';

const gold = '#C6A04F';

function getCountryForNationality(nationality) {
  if (!nationality) return null;
  return countries.find((c) => c.name === nationality) || null;
}

function calculateAgeFromDob(dob) {
  if (!dob) return null;
  const date = new Date(dob);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) age--;
  return age;
}

const OUTCOME_COLORS = { W: '#2e7d32', D: '#f9a825', L: '#c62828' };

function LastFiveBoxes({ outcomes, size = 22 }) {
  if (!outcomes || outcomes.length === 0) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 6 }}>
      {outcomes.map((outcome, i) => (
        <div
          key={i}
          title={outcome === 'W' ? 'Win' : outcome === 'D' ? 'Draw' : 'Loss'}
          style={{
            width: size,
            height: size,
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: size * 0.45,
            fontWeight: 700,
            color: '#fff',
            background: OUTCOME_COLORS[outcome] || '#555',
          }}
        >
          {outcome}
        </div>
      ))}
    </div>
  );
}

/** Sizes so multiple teammates fit in one horizontal row without wrapping. */
function teammateSizing(teammateCount) {
  if (teammateCount <= 1) {
    return { cardMax: 200, imgMax: 180, imgMaxH: 320, nameSize: 15 };
  }
  if (teammateCount === 2) {
    return { cardMax: 168, imgMax: 155, imgMaxH: 260, nameSize: 14 };
  }
  return { cardMax: 118, imgMax: 108, imgMaxH: 200, nameSize: 12 };
}

function WrestlerDetailBlock({ slug, wrestlerMap, events, match, event, isWinner, wrestlerTo, teammateCount = 1, matchIndex }) {
  const w = wrestlerMap[slug];
  const country = w ? getCountryForNationality(w.nationality) : null;
  const age = w ? calculateAgeFromDob(w.dob) : null;
  const sz = teammateSizing(teammateCount);

  const lastFive = useMemo(() => {
    if (!events || !match || !wrestlerMap) return [];
    const priorToMatch =
      event?.id != null && (matchIndex != null || match?.order != null)
        ? { eventId: event.id, matchIndex, matchOrder: match?.order }
        : undefined;
    const list = getLastMatchesForWrestler(events, slug, 5, { wrestlerMap, priorToMatch });
    return list.map(({ match: m }) => getMatchOutcome(m, slug, wrestlerMap));
  }, [events, match, slug, wrestlerMap, event?.id, matchIndex, match?.order]);

  const ytd = useMemo(() => {
    if (!events || !slug || !event?.date) return null;
    const y = getYearFromEventDate(event.date);
    if (y == null) return null;
    return getMatchRecordStatsForYear(events, slug, y, wrestlerMap);
  }, [events, slug, event?.date, wrestlerMap]);

  const img = w?.full_body_image_url || w?.image_url || '/images/placeholder.png';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        flex: teammateCount > 1 ? '1 1 0' : undefined,
        minWidth: teammateCount > 1 ? 0 : undefined,
        maxWidth: sz.cardMax,
        padding: '8px 10px',
        borderRadius: 10,
        border: isWinner ? `2px solid ${gold}` : '1px solid #444',
        background: isWinner ? '#2a2618' : '#1e1e1e',
      }}
    >
      <Link to={wrestlerTo(slug)} style={{ lineHeight: 0, textDecoration: 'none', width: '100%' }}>
        <img
          src={img}
          alt={w?.name || slug}
          style={{
            width: '100%',
            maxWidth: sz.imgMax,
            height: 'auto',
            maxHeight: sz.imgMaxH,
            objectFit: 'contain',
            objectPosition: 'center top',
            display: 'block',
            margin: '0 auto',
            borderRadius: 8,
            background: '#111',
          }}
        />
      </Link>
      <div style={{ marginTop: 10, textAlign: 'center', width: '100%' }}>
        <Link
          to={wrestlerTo(slug)}
          style={{ color: isWinner ? gold : '#fff', fontWeight: 800, fontSize: sz.nameSize, textDecoration: 'none' }}
        >
          {w?.name || slug}
        </Link>
        {w?.brand && (
          <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>
            <span style={{ color: '#888' }}>Brand</span> {w.brand}
          </div>
        )}
        {(w?.height || w?.weight) && (
          <div style={{ fontSize: 11, color: '#bbb', marginTop: 2 }}>
            {[w.height, w.weight].filter(Boolean).join(' · ')}
          </div>
        )}
        {w?.billed_from && (
          <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
            From {w.billed_from}
          </div>
        )}
        <div style={{ fontSize: 11, color: '#bbb', marginTop: 4 }}>
          {(country || w?.nationality) && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'center', flexWrap: 'wrap' }}>
              {country?.flagImage && (
                <img
                  src={country.flagImage}
                  alt=""
                  style={{ width: 18, height: 13, objectFit: 'cover', borderRadius: 2 }}
                />
              )}
              {!country?.flagImage && country?.flag && <span>{country.flag}</span>}
              {w?.nationality}
            </span>
          )}
          {age != null && <span style={{ marginLeft: w?.nationality ? 8 : 0 }}>{w?.nationality ? ' · ' : ''}Age {age}</span>}
        </div>
        {ytd && ytd.mw > 0 && (
          <div style={{ fontSize: 11, color: '#9a9a9a', marginTop: 8, lineHeight: 1.4 }}>
            <span style={{ color: gold }}>{getYearFromEventDate(event.date)} record</span>
            <br />
            {ytd.mw} MW · {ytd.winTotal}-{ytd.lossTotal}-{ytd.nc} (W-L-NC) · {ytd.winPct}% wins
          </div>
        )}
        {lastFive.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>Last {lastFive.length} (before this event)</div>
            <LastFiveBoxes outcomes={lastFive} size={22} />
          </div>
        )}
      </div>
    </div>
  );
}

function TeammateRow({ slugs, winnerIndex, sideIdx, wrestlerMap, events, match, event, wrestlerTo, matchIndex }) {
  const n = slugs.length;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        flexWrap: n > 1 ? 'nowrap' : 'wrap',
        justifyContent: 'center',
        alignItems: 'flex-start',
        gap: 10,
        width: '100%',
        minWidth: 0,
        ...(n > 2 ? { overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 4 } : {}),
      }}
    >
      {slugs.map((slug) => (
        <WrestlerDetailBlock
          key={slug}
          slug={slug}
          wrestlerMap={wrestlerMap}
          events={events}
          match={match}
          event={event}
          isWinner={winnerIndex === sideIdx}
          wrestlerTo={wrestlerTo}
          teammateCount={n}
          matchIndex={matchIndex}
        />
      ))}
    </div>
  );
}

/**
 * Full-image match header for singles, tag, triple threat, fatal four-way, and 6-person tag — used on the dedicated match page only.
 */
export default function MatchPageHero({ match, event, wrestlerMap, events, matchIndex, wrestlerTo }) {
  const teamStrings = getVersusTeamStrings(match) || [];
  const winnerIndex = getWinnerSideIndex(teamStrings, match, wrestlerMap);
  const displayStipulation =
    match.stipulation === 'Custom/Other' && (match.customStipulation || '').trim()
      ? match.customStipulation.trim()
      : match.stipulation || '';
  const isTitleMatch = match.title && match.title !== 'None' && match.stipulation !== 'No. 1 Contender Match';
  const isMatchInProgress = event?.status === 'live' && match?.isLive;

  const sides = teamStrings.map((ts) => parseTeamStringForPage(ts, wrestlerMap));

  const isMultiWay = match.matchType === 'Triple Threat match' || match.matchType === 'Fatal Four-way match';

  return (
    <div
      style={{
        background: '#232323',
        borderRadius: 12,
        border: match.cardType === 'Main Event' ? `2px solid ${gold}` : '1px solid #444',
        boxShadow: '0 0 12px #C6A04F22',
        padding: '20px 16px 24px',
        marginBottom: 20,
      }}
    >
      {match.cardType === 'Main Event' && (
        <div
          style={{
            textAlign: 'center',
            marginBottom: 12,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 1,
            color: '#232323',
            background: gold,
            padding: '4px 12px',
            borderRadius: 8,
            display: 'inline-block',
            marginLeft: '50%',
            transform: 'translateX(-50%)',
          }}
        >
          MAIN EVENT
        </div>
      )}

      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: gold, fontWeight: 700, marginBottom: 6 }}>
          {[match.matchType, displayStipulation && displayStipulation !== 'None' ? displayStipulation : null, match.title && match.title !== 'None' ? match.title : null]
            .filter(Boolean)
            .join(' — ')}
        </div>
        <div style={{ fontSize: 14, color: gold, marginBottom: 4 }}>
          {match.cardType}
          {isTitleMatch ? ' — Title match' : ' — Non-title match'}
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>
          {isMatchInProgress ? <span style={{ color: '#27ae60' }}>MATCH IN PROGRESS</span> : match.result && match.result !== 'No winner' ? 'Final' : match.result || '—'}
        </div>
        <div style={{ color: '#bbb', fontSize: 15, marginTop: 4 }}>{match.method}</div>
        <div style={{ color: '#bbb', fontSize: 15 }}>{match.time}</div>
      </div>

      {isMultiWay ? (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 8,
            alignItems: 'flex-end',
            width: '100%',
          }}
        >
          {sides.map((side, sideIdx) => (
            <React.Fragment key={sideIdx}>
              {sideIdx > 0 && (
                <div style={{ fontSize: 16, fontWeight: 800, color: gold, alignSelf: 'center', padding: '0 6px' }}>
                  VS
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                {side.teamName ? (
                  <div style={{ fontWeight: 800, color: winnerIndex === sideIdx ? gold : '#fff', fontSize: 15, textAlign: 'center' }}>{side.teamName}</div>
                ) : null}
                <TeammateRow
                  slugs={side.slugs}
                  winnerIndex={winnerIndex}
                  sideIdx={sideIdx}
                  wrestlerMap={wrestlerMap}
                  events={events}
                  match={match}
                  event={event}
                  wrestlerTo={wrestlerTo}
                  matchIndex={matchIndex}
                />
              </div>
            </React.Fragment>
          ))}
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'center',
            gap: 16,
            flexWrap: 'wrap',
            width: '100%',
          }}
        >
          <div style={{ flex: 1, minWidth: 0, maxWidth: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            {sides[0]?.teamName && (
              <div style={{ fontWeight: 800, color: winnerIndex === 0 ? gold : '#fff', fontSize: 17, textAlign: 'center' }}>{sides[0].teamName}</div>
            )}
            <TeammateRow
              slugs={sides[0]?.slugs || []}
              winnerIndex={winnerIndex}
              sideIdx={0}
              wrestlerMap={wrestlerMap}
              events={events}
              match={match}
              event={event}
              wrestlerTo={wrestlerTo}
              matchIndex={matchIndex}
            />
          </div>
          <div style={{ alignSelf: 'center', fontSize: 18, fontWeight: 800, color: gold, padding: '0 8px', flexShrink: 0 }}>VS</div>
          <div style={{ flex: 1, minWidth: 0, maxWidth: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            {sides[1]?.teamName && (
              <div style={{ fontWeight: 800, color: winnerIndex === 1 ? gold : '#fff', fontSize: 17, textAlign: 'center' }}>{sides[1].teamName}</div>
            )}
            <TeammateRow
              slugs={sides[1]?.slugs || []}
              winnerIndex={winnerIndex}
              sideIdx={1}
              wrestlerMap={wrestlerMap}
              events={events}
              match={match}
              event={event}
              wrestlerTo={wrestlerTo}
              matchIndex={matchIndex}
            />
          </div>
        </div>
      )}
    </div>
  );
}
