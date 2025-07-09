import React from 'react';
import Menu from './Menu';
import { Outlet } from 'react-router-dom';
import Footer from './Footer';

export default function Layout() {
  return (
    <div style={{ minHeight: '100vh', background: '#181511', color: '#F5E7D0', fontFamily: 'Arial, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <Menu />
      {/* Main Banner */}
      <div style={{ margin: '0 auto', maxWidth: 700, paddingTop: 32, paddingBottom: 16 }}>
        <img src="/images/banner.png" alt="Wrestling Boxscore Banner" style={{
          display: 'block',
          margin: '0 auto 24px auto',
          maxWidth: 480,
          width: '100%',
        }} />
        <div style={{ textAlign: 'center', color: '#C6A04F', fontWeight: 800, fontSize: 32, letterSpacing: 1, marginBottom: 0 }}>
          {/* If you want to use text instead of the image, uncomment below: */}
          {/* WRESTLING BOXSCORE.com */}
        </div>
        <div style={{ textAlign: 'center', color: '#C6A04F', fontWeight: 600, fontSize: 18, marginTop: 0, marginBottom: 8 }}>
          EVERY MATCH. EVERY MOMENT. EVERY CHAMPIONSHIP.
        </div>
      </div>
      {/* Page Content */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 0 48px 0', flex: 1 }}>
        <Outlet />
      </div>
      <Footer />
    </div>
  );
} 