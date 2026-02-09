import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useUser } from '../hooks/useUser';

const menuIcon = (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="9" width="20" height="3.5" rx="1.5" fill="#222" />
    <rect x="6" y="14.5" width="20" height="3.5" rx="1.5" fill="#222" />
    <rect x="6" y="20" width="20" height="3.5" rx="1.5" fill="#222" />
  </svg>
);

const menuItems = [
  { label: 'Events', path: '/' },
  { label: 'Wrestlers', path: '/wrestlers' },
  { label: 'Championships', path: '/championships' },
  { label: 'About', path: '/about' },
  { label: 'Contact', path: '/contact' },
];

// Feature flag for admin login. By default the login is enabled unless
// VITE_ENABLE_ADMIN_LOGIN is explicitly set to 'false'.
const ENABLE_ADMIN_LOGIN = import.meta.env.VITE_ENABLE_ADMIN_LOGIN !== 'false';

export default function Menu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef();
  const location = useLocation();
  const user = useUser();
  console.log('Menu user:', user);
  const [email, setEmail] = useState('');
  const [loginMsg, setLoginMsg] = useState('');
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    setOpen(false); // Close menu on route change
  }, [location.pathname]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
        setShowLogin(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginMsg('');
    const { error } = await supabase.auth.signInWithOtp({ email });
    setLoginMsg(error ? error.message : 'Check your email for the login link!');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setShowLogin(false);
    setOpen(false);
  };

  return (
    <div style={{ position: 'fixed', top: 18, left: 18, zIndex: 1000 }} ref={menuRef}>
      <button
        aria-label="Open menu"
        onClick={() => setOpen(o => !o)}
        style={{
          background: '#f5e7d0',
          border: 'none',
          borderRadius: 12,
          padding: 6,
          boxShadow: '0 2px 8px #0002',
          cursor: 'pointer',
          outline: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {menuIcon}
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 48,
            left: 0,
            background: '#232323',
            borderRadius: 10,
            boxShadow: '0 4px 16px #0006',
            minWidth: 180,
            padding: '10px 0',
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
          }}
        >
          {menuItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                color: '#fff',
                textDecoration: 'none',
                padding: '12px 24px',
                fontWeight: 600,
                fontSize: 16,
                background: location.pathname === item.path ? '#333' : 'none',
                border: 'none',
                textAlign: 'left',
                transition: 'background 0.15s',
              }}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <div style={{ borderTop: '1px solid #444', margin: '8px 0 0 0' }} />
          {ENABLE_ADMIN_LOGIN && (
            user ? (
              <div style={{ padding: '12px 24px', color: '#C6A04F', fontWeight: 600, fontSize: 15 }}>
                {user.email}
                <button onClick={handleLogout} style={{ marginLeft: 12, background: '#333', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 12px', cursor: 'pointer' }}>Logout</button>
              </div>
            ) : showLogin ? (
              <form onSubmit={handleLogin} style={{ padding: '12px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Your email"
                  required
                  style={{ padding: 6, borderRadius: 4, border: '1px solid #444', background: '#222', color: '#fff' }}
                />
                <button type="submit" style={{ background: '#C6A04F', color: '#232323', border: 'none', borderRadius: 4, padding: '6px 0', fontWeight: 700, cursor: 'pointer' }}>Send Magic Link</button>
                <button type="button" onClick={() => setShowLogin(false)} style={{ background: 'none', color: '#bbb', border: 'none', marginTop: 2, cursor: 'pointer', textDecoration: 'underline' }}>Cancel</button>
                {loginMsg && <div style={{ color: '#C6A04F', fontSize: 13 }}>{loginMsg}</div>}
              </form>
            ) : (
              <button onClick={() => setShowLogin(true)} style={{ padding: '12px 24px', background: 'none', color: '#C6A04F', border: 'none', fontWeight: 700, fontSize: 15, cursor: 'pointer', textAlign: 'left' }}>Admin Login</button>
            )
          )}
        </div>
      )}
    </div>
  );
} 