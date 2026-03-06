/* ─── Auth Page (React) ───────────────────────────────── */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE || '';

export default function GameAuth() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('linked_user');
    if (saved) {
      try {
        const user = JSON.parse(saved);
        if (user?.username) setUsername(user.username);
      } catch {}
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmed = username.trim();
    if (!trimmed) {
      setError('Please enter a username.');
      return;
    }

    setLoading(true);

    try {
      const body = { username: trimmed };
      if (password.trim()) body.password = password.trim();
      if (email.trim()) body.email = email.trim();

      const res = await fetch(`${API_BASE}/api/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong.');
        setLoading(false);
        return;
      }

      localStorage.setItem('linked_user', JSON.stringify(data.user));
      navigate('/lobby');
    } catch (err) {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="logo">♟🔗♟</div>
      <h1>Linked</h1>
      <p className="subtitle">A 4-player strategy board game</p>
      <form id="auth-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Username (required)"
          maxLength={20}
          autoFocus
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password (optional - for account security)"
          maxLength={50}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <input
          type="email"
          placeholder="Email (optional)"
          maxLength={100}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Enter Game'}
        </button>
        {error && <p className="error-msg">{error}</p>}
      </form>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '8px' }}>
        New users will be created automatically. Existing users with passwords must enter their password.
      </p>
      <a
        href="/how-to-play"
        className="rules-link"
        onClick={(e) => { e.preventDefault(); navigate('/how-to-play'); }}
      >
        How to Play →
      </a>
    </div>
  );
}
