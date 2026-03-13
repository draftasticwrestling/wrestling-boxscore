import React, { useRef } from 'react';
import { Helmet } from 'react-helmet';

const blue = '#60a5fa';
const DRAFTASTIC_BUCKET = 'https://qvbqxietcmweltxoonvh.supabase.co/storage/v1/object/public/draftastic-screenshots';

function draftasticImage(filename) {
  return `${DRAFTASTIC_BUCKET}/${filename}`;
}

const sectionStyle = { marginBottom: 12, color: '#ccc', lineHeight: 1.7 };
const h2Style = { color: blue, fontSize: 22, fontWeight: 700, marginTop: 40, marginBottom: 16 };
const imgStyle = { width: '100%', maxWidth: 640, height: 'auto', borderRadius: 8, margin: '0 auto 40px', display: 'block' };

export default function DraftasticPage() {
  const howItWorksRef = useRef(null);

  const scrollToHowItWorks = () => {
    howItWorksRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <Helmet>
        <title>Fantasy | Pro Wrestling Boxscore</title>
        <meta
          name="description"
          content="Draftastic Fantasy Pro Wrestling — Draft your roster, track every match, compete with friends. Turn every episode of wrestling into a fantasy battle."
        />
        <link rel="canonical" href="https://prowrestlingboxscore.com/draftastic" />
      </Helmet>

      <div
        style={{
          color: '#fff',
          padding: '24px 20px 48px',
          maxWidth: 800,
          margin: '0 auto',
          fontFamily: 'Arial, sans-serif',
          textAlign: 'center',
        }}
      >
        <img
          src={draftasticImage('draftastic-banner.png')}
          alt="Draftastic Fantasy Pro Wrestling"
          style={{
            width: '100%',
            maxWidth: 800,
            height: 'auto',
            borderRadius: 8,
            marginBottom: 32,
            display: 'block',
          }}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        <p style={{ fontSize: 18, color: '#ddd', marginBottom: 24, lineHeight: 1.5 }}>
          Putting the sport back in sports entertainment.
        </p>
        <p style={{ fontSize: 16, color: '#ccc', marginBottom: 24, lineHeight: 1.6 }}>
          Draft your roster. Track every match. Compete with friends and turn every episode of wrestling into a fantasy battle.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: 48 }}>
          <a
            href="https://lp.constantcontactpages.com/sl/Qe4DAFj"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              padding: '14px 28px',
              background: blue,
              color: '#1a1a1a',
              fontWeight: 700,
              fontSize: 16,
              borderRadius: 8,
              textDecoration: 'none',
            }}
          >
            Join the list — get notified at launch
          </a>
          <button
            type="button"
            onClick={scrollToHowItWorks}
            style={{
              padding: '14px 28px',
              background: 'transparent',
              color: blue,
              fontWeight: 700,
              fontSize: 16,
              borderRadius: 8,
              border: `2px solid ${blue}`,
              cursor: 'pointer',
            }}
          >
            How It Works
          </button>
        </div>

        <h2 style={h2Style}>Why Isn&apos;t Fantasy Pro Wrestling a Huge Thing?</h2>
        <p style={sectionStyle}>
          Millions of fans tune in every week to watch professional wrestling. The drama. The rivalries. The moments that make you jump off the couch.
        </p>
        <p style={sectionStyle}>So we had a question.</p>
        <p style={sectionStyle}>
          <strong style={{ color: '#fff' }}>Why isn&apos;t Fantasy Pro Wrestling bigger?</strong>
        </p>
        <p style={sectionStyle}>
          Fantasy football makes every Sunday game matter. Fantasy baseball turns stats into strategy.
        </p>
        <p style={{ ...sectionStyle, marginBottom: 32 }}>
          With millions watching wrestling every week… shouldn&apos;t fantasy wrestling exist too?
        </p>

        <h2 style={h2Style}>How Draftastic Was Born</h2>
        <p style={sectionStyle}>
          Three longtime wrestling fans attended their first WWE event in over twenty years… and suddenly we were hooked all over again.
        </p>
        <p style={sectionStyle}>The energy. The crowd. The storylines unfolding in the ring.</p>
        <p style={sectionStyle}>
          But when we went looking for a fantasy league to make watching wrestling even more fun…
        </p>
        <p style={sectionStyle}>We discovered something surprising.</p>
        <p style={sectionStyle}>There weren&apos;t many good options.</p>
        <p style={sectionStyle}>So we did what wrestling fans do best.</p>
        <p style={sectionStyle}>We built our own.</p>
        <p style={sectionStyle}>
          Draftastic started as a spreadsheet, a scoring system, and a group of friends who suddenly cared a lot about what happened on RAW, SmackDown, and every Premium Live Event. The more we refined the league, the more invested we became. Soon we weren&apos;t just watching wrestling again.
        </p>
        <p style={sectionStyle}>We were studying it. Debating it. Drafting it. Trash-talking about it.</p>
        <p style={sectionStyle}>Now we&apos;re bringing that experience to fans everywhere.</p>
        <p style={{ ...sectionStyle, color: '#fff', fontWeight: 600 }}>
          Draft your roster. Track every match. Compete with your friends.
        </p>
        <p style={sectionStyle}>Because wrestling isn&apos;t just entertainment.</p>
        <p style={sectionStyle}>It&apos;s competition.</p>
        <p style={{ ...sectionStyle, marginBottom: 32 }}>And now you&apos;re part of the game.</p>

        <h2 style={h2Style}>Turn Wrestling Into a Competition</h2>
        <p style={{ ...sectionStyle, marginBottom: 16 }}>With Draftastic you can:</p>
        <ul style={{ color: '#ccc', lineHeight: 1.8, paddingLeft: 0, marginBottom: 32, listStyle: 'none' }}>
          <li>Prove once and for all who the best wrestling mind is</li>
          <li>Track scores across RAW, SmackDown, and every PLE</li>
          <li>Compete against friends in custom leagues</li>
          <li>Earn points based on match results and performance</li>
          <li>Draft your own roster of superstars</li>
        </ul>

        <div ref={howItWorksRef}>
          <h2 style={h2Style}>How It Works</h2>
          <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 600, marginTop: 24, marginBottom: 8 }}>
            Step 1 — Draft Your Roster
          </h3>
          <p style={sectionStyle}>
            Build your dream roster from the current wrestling landscape. Every superstar you draft becomes part of your fantasy stable, earning points based on their performances each week.
          </p>
          <p style={{ color: '#aaa', fontSize: 14, marginBottom: 24 }}>Manage your roster and build the ultimate lineup.</p>

          <img
            src={draftasticImage('draftastic-roster.png')}
            alt="Draft your roster"
            style={imgStyle}
            onError={(e) => { e.target.style.display = 'none'; }}
          />

          <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 600, marginTop: 24, marginBottom: 8 }}>
            Step 2 — Watch the Action
          </h3>
          <p style={sectionStyle}>
            Every match, victory, and performance earns fantasy points.
          </p>

          <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 600, marginTop: 24, marginBottom: 8 }}>
            Step 3 — Compete for the Championship
          </h3>
          <p style={{ ...sectionStyle, marginBottom: 32 }}>
            Climb the leaderboard and claim bragging rights.
          </p>
        </div>

        <h2 style={h2Style}>Compete for the Championship</h2>
        <p style={sectionStyle}>
          Every match matters. Wins, title changes, and standout performances all impact the leaderboard. Track your progress and see who&apos;s dominating the league.
        </p>
        <p style={{ ...sectionStyle, marginBottom: 32 }}>
          Climb the standings and prove you&apos;re the best booker in the league.
        </p>

        <img
          src={draftasticImage('draftastic-standings.png')}
          alt="Compete for the championship"
          style={imgStyle}
          onError={(e) => { e.target.style.display = 'none'; }}
        />

        <h2 style={h2Style}>Wrestling, But With Stats</h2>
        <p style={sectionStyle}>
          Track the hottest performers across the wrestling landscape. League leaderboards highlight the superstars delivering the most fantasy points, giving you the data you need to make smarter roster moves.
        </p>
        <p style={{ ...sectionStyle, marginBottom: 32 }}>
          Track the top fantasy performers across the entire league.
        </p>

        <img
          src={draftasticImage('draftastic-leaderboard.png')}
          alt="Wrestling with stats"
          style={imgStyle}
          onError={(e) => { e.target.style.display = 'none'; }}
        />

        <h2 style={h2Style}>Dive Into Superstar Performance</h2>
        <p style={sectionStyle}>
          Each wrestler has a detailed profile showing their fantasy production, stats, and performance trends. Study the numbers and build a roster that dominates.
        </p>
        <p style={{ ...sectionStyle, marginBottom: 32 }}>
          Detailed profiles help you scout your next fantasy superstar.
        </p>

        <img
          src={draftasticImage('draftastic-profile.png')}
          alt="Superstar performance"
          style={imgStyle}
          onError={(e) => { e.target.style.display = 'none'; }}
        />

        <h2 style={h2Style}>Wrestling Was Never Meant to Be Passive.</h2>
        <p style={sectionStyle}>It&apos;s drama. It&apos;s strategy. It&apos;s competition.</p>
        <p style={{ ...sectionStyle, marginBottom: 24 }}>
          Draftastic turns every episode of wrestling into a game where every match matters.
        </p>
        <a
          href="https://lp.constantcontactpages.com/sl/Qe4DAFj"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            padding: '14px 28px',
            background: blue,
            color: '#1a1a1a',
            fontWeight: 700,
            fontSize: 16,
            borderRadius: 8,
            textDecoration: 'none',
          }}
        >
          Join the list — get notified at launch
        </a>
      </div>
    </>
  );
}
