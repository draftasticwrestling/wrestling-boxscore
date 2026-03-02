import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';

const gold = '#C6A04F';
const cream = '#F5E7D0';

const sectionStyle = {
  color: cream,
  padding: 40,
  maxWidth: 900,
  margin: '0 auto',
};

const linkStyle = {
  color: gold,
  textDecoration: 'none',
  fontWeight: 600,
};

export default function FAQPage() {
  return (
    <>
      <Helmet>
        <title>FAQ – Pro Wrestling Boxscore</title>
        <meta
          name="description"
          content="FAQ: find WWE Raw, SmackDown, and PLE results, wrestler profiles, championships, event pages, and how often we update. Pro Wrestling Boxscore."
        />
        <link rel="canonical" href="https://prowrestlingboxscore.com/faq" />
      </Helmet>
      <div style={sectionStyle}>
        <h2 style={{ color: gold, marginBottom: 24 }}>Frequently Asked Questions</h2>

        <section style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: 18, marginBottom: 8 }}>Where can I see all events?</h3>
          <p style={{ marginBottom: 0 }}>
            Our <Link to="/" style={linkStyle}>events list</Link> shows every Raw, SmackDown, and premium live event. From there you can open any event to see the full match card and results.
          </p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: 18, marginBottom: 8 }}>How do I browse Raw, SmackDown, or PLE results?</h3>
          <p style={{ marginBottom: 0 }}>
            Use the event list filters or go directly to{' '}
            <Link to="/raw" style={linkStyle}>Raw results</Link>,{' '}
            <Link to="/smackdown" style={linkStyle}>SmackDown results</Link>, or{' '}
            <Link to="/ple" style={linkStyle}>PLE results</Link> to see only that show type.
          </p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: 18, marginBottom: 8 }}>Where do I find wrestler profiles and match history?</h3>
          <p style={{ marginBottom: 0 }}>
            Our <Link to="/wrestlers" style={linkStyle}>roster (Wrestlers)</Link> page lists every wrestler. Click a wrestler to open their profile: match history, title reigns, and last five matches with links back to the events and match cards.
          </p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: 18, marginBottom: 8 }}>Where can I see current champions and title history?</h3>
          <p style={{ marginBottom: 0 }}>
            The <Link to="/championships" style={linkStyle}>Championships</Link> page shows every title, current champion(s), and full title history. Click a championship to see its detail page with every reign; champion names link to their wrestler profiles.
          </p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: 18, marginBottom: 8 }}>How do I get to a specific event or match?</h3>
          <p style={{ marginBottom: 0 }}>
            From the <Link to="/" style={linkStyle}>events list</Link>, click an event to open its event page (match card, location, date). Click any match on that page to open the match detail with full results, participants, and method. Event and match URLs are stable so you can bookmark or share them.
          </p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: 18, marginBottom: 8 }}>How often are results updated?</h3>
          <p style={{ marginBottom: 0 }}>
            We update results as shows happen for live events, and we add completed events shortly after they air. Our goal is to give you accurate, up-to-date match cards and outcomes so you can catch up without waiting for long recaps. Bookmark our <Link to="/" style={linkStyle}>events list</Link> or <Link to="/raw" style={linkStyle}>Raw</Link>, <Link to="/smackdown" style={linkStyle}>SmackDown</Link>, and <Link to="/ple" style={linkStyle}>PLE</Link> pages to check back anytime.
          </p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: 18, marginBottom: 8 }}>What’s the difference between Raw, SmackDown, and PLE results?</h3>
          <p style={{ marginBottom: 0 }}>
            <Link to="/raw" style={linkStyle}>Raw results</Link> cover Monday Night Raw; <Link to="/smackdown" style={linkStyle}>SmackDown results</Link> cover Friday Night SmackDown. Both are weekly shows. <Link to="/ple" style={linkStyle}>PLE results</Link> cover Premium Live Events—monthly or special shows like WrestleMania, SummerSlam, Royal Rumble, Elimination Chamber, and Money in the Bank. You can browse all events together on the main <Link to="/" style={linkStyle}>events list</Link> or filter by show type.
          </p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: 18, marginBottom: 8 }}>How can I get in touch or suggest a correction?</h3>
          <p style={{ marginBottom: 0 }}>
            Use our <Link to="/contact" style={linkStyle}>Contact</Link> page for questions, corrections, or collaboration. For more about the site, see <Link to="/about" style={linkStyle}>About</Link>.
          </p>
        </section>
      </div>
    </>
  );
}
