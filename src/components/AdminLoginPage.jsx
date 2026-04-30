import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '../supabaseClient';
import { useUser } from '../hooks/useUser';

const gold = '#C6A04F';

const inputStyle = {
  padding: 12,
  borderRadius: 8,
  border: '1px solid #444',
  background: '#232323',
  color: '#fff',
  fontSize: 16,
};

export default function AdminLoginPage() {
  const user = useUser();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState('neutral');
  const [loading, setLoading] = useState(false);

  const handleMagicLinkLogin = async (e) => {
    e.preventDefault();
    setMessage('');
    setMessageTone('neutral');
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/admin`,
      },
    });
    setLoading(false);
    if (error) {
      setMessageTone('error');
      setMessage(error.message);
    } else {
      setMessageTone('success');
      setMessage('Check your email for the sign-in link.');
    }
  };

  const handleGoogleLogin = async () => {
    setMessage('');
    setMessageTone('neutral');
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/admin`,
      },
    });
    // For OAuth success, browser redirects away immediately.
    if (error) {
      setLoading(false);
      setMessageTone('error');
      setMessage(error.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setMessage('');
    setMessageTone('neutral');
  };

  if (user) {
    return (
      <>
        <Helmet>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <div style={{ padding: 40, maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ color: gold, marginBottom: 16 }}>Admin</h2>
          <p style={{ color: '#ccc', marginBottom: 24 }}>Logged in as {user.email}</p>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              background: '#333',
              color: '#fff',
              border: `1px solid ${gold}`,
              borderRadius: 8,
              padding: '10px 24px',
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: 24,
            }}
          >
            Log out
          </button>
          <p>
            <Link to="/" style={{ color: gold, textDecoration: 'none', fontWeight: 600 }}>
              ← Go to site
            </Link>
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div style={{ padding: 40, maxWidth: 480, margin: '0 auto' }}>
        <h2 style={{ color: gold, marginBottom: 8, textAlign: 'center' }}>Admin login</h2>
        <p style={{ color: '#888', fontSize: 14, marginBottom: 24, textAlign: 'center' }}>
          Sign in with Google (recommended) or request a magic link by email.
        </p>
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            width: '100%',
            background: '#fff',
            color: '#111',
            border: '1px solid #ddd',
            borderRadius: 8,
            padding: 12,
            fontWeight: 700,
            fontSize: 15,
            cursor: loading ? 'not-allowed' : 'pointer',
            marginBottom: 12,
          }}
        >
          Continue with Google
        </button>
        <div style={{ color: '#777', fontSize: 12, textAlign: 'center', marginBottom: 12 }}>
          or request a magic link
        </div>
        <form onSubmit={handleMagicLinkLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            autoComplete="email"
            required
            style={inputStyle}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              background: gold,
              color: '#232323',
              border: 'none',
              borderRadius: 8,
              padding: 12,
              fontWeight: 700,
              fontSize: 16,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Sending…' : 'Send magic link'}
          </button>
          {message && (
            <p
              style={{
                color: messageTone === 'error' ? '#e57373' : gold,
                fontSize: 14,
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              {message}
            </p>
          )}
        </form>
        <p style={{ marginTop: 24, textAlign: 'center' }}>
          <Link to="/" style={{ color: '#888', textDecoration: 'none' }}>
            ← Back to site
          </Link>
        </p>
      </div>
    </>
  );
}
