import React from 'react';
import Menu from './Menu';
import { Outlet } from 'react-router-dom';
import Footer from './Footer';
import { useIsDesktop } from '../hooks/useMediaQuery';

export default function Layout() {
  const isDesktop = useIsDesktop();

  return (
    <div style={{ minHeight: '100vh', background: '#181511', color: '#F5E7D0', fontFamily: 'Arial, sans-serif', display: 'flex', flexDirection: 'column' }}>
      {/* Main Banner */}
      <div style={{
        margin: '0 auto',
        maxWidth: isDesktop ? 1200 : 900,
        width: '100%',
        paddingTop: isDesktop ? 40 : 32,
        paddingBottom: isDesktop ? 16 : 12,
      }}>
        <img src="/images/pwb-banner.png" alt="Pro Wrestling Boxscore Banner" style={{
          display: 'block',
          margin: '0 auto 16px auto',
          maxWidth: isDesktop ? 900 : 720,
          width: '100%',
        }} />
      </div>
      <Menu />
      {/* Page Content */}
      <div style={{
        maxWidth: isDesktop ? 1600 : '100%',
        margin: '0 auto',
        padding: isDesktop ? '0 32px 48px' : '0 0 48px 0',
        flex: 1,
        width: '100%',
      }}>
        <Outlet />
      </div>
      <Footer />
    </div>
  );
} 