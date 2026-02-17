import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

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

export default function Menu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef();
  const location = useLocation();

  useEffect(() => {
    setOpen(false); // Close menu on route change
  }, [location.pathname]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

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
        </div>
      )}
    </div>
  );
} 