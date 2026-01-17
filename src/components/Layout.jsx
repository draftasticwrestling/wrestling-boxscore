import React from 'react';
import Menu from './Menu';
import { Outlet } from 'react-router-dom';
import Footer from './Footer';

export default function Layout() {
  return (
    <div style={{ minHeight: '100vh', background: '#181511', color: '#F5E7D0', fontFamily: 'Arial, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <Menu />
      {/* Main Banner */}
      <div style={{ margin: '0 auto', maxWidth: 900, paddingTop: 32, paddingBottom: 16 }}>
        <img src="/images/pwb-banner.png" alt="Pro Wrestling Boxscore Banner" style={{
          display: 'block',
          margin: '0 auto 16px auto',
          maxWidth: 720,
          width: '100%',
        }} />
      </div>
      {/* Page Content */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 0 48px 0', flex: 1 }}>
        <Outlet />
      </div>
      <Footer />
    </div>
  );
} 