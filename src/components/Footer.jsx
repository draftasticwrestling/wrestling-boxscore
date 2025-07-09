import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer style={{
      background: '#181511',
      color: '#bbb',
      fontSize: 14,
      textAlign: 'center',
      padding: '32px 16px 24px 16px',
      borderTop: '1px solid #333',
      marginTop: 48,
      width: '100%',
    }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ marginBottom: 8 }}>
          © 2025 Wrestling Boxscore. All rights reserved.
        </div>
        <div style={{ marginBottom: 8 }}>
          WWE, Raw, SmackDown, and all related logos and trademarks are the property of World Wrestling Entertainment, Inc. This site is not affiliated with or endorsed by WWE.
        </div>
        <div style={{ marginTop: 12 }}>
          <Link to="/contact" style={{ color: '#C6A04F', textDecoration: 'none', marginRight: 18 }}>Contact</Link>
          <span style={{ color: '#444' }}>|</span>
          <Link to="/privacy" style={{ color: '#C6A04F', textDecoration: 'none', marginLeft: 18 }}>Privacy Policy</Link>
        </div>
      </div>
    </footer>
  );
} 