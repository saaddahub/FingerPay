'use client';

import { useState } from 'react';
import { apiFetch, getStaffSession, setStaffSession, type StaffSession } from '../../../lib/auth-store';

export default function LoginPage() {
  const [email, setEmail] = useState('rasheed@kiryana.pk');
  const [password, setPassword] = useState('');
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [session, setSession] = useState<StaffSession | null>(() => getStaffSession());
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setStatusMsg('Signing in...');
    try {
      const res = await apiFetch('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusMsg(`Error (${res.status}): ${data?.error?.message ?? 'Login failed'}`);
        return;
      }
      if (data.status === 'mfa_required') {
        setChallengeToken(data.mfaChallengeToken);
        setStatusMsg('TOTP MFA step-up required (AAL2) for this account.');
        return;
      }
      const nextSession: StaffSession = {
        accessToken: data.accessToken,
        user: data.user,
      };
      setStaffSession(nextSession);
      setSession(nextSession);
      setStatusMsg(`Signed in as ${data.user.email} (${data.user.role}, AAL${data.user.aal})`);
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Network error');
    }
  }

  async function handleVerifyMfa(e: React.FormEvent) {
    e.preventDefault();
    if (!challengeToken) return;
    setStatusMsg('Verifying TOTP...');
    try {
      const res = await apiFetch('/api/v1/auth/mfa/verify', {
        method: 'POST',
        body: JSON.stringify({ challengeToken, code: totpCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusMsg(`MFA Error (${res.status}): ${data?.error?.message ?? 'Invalid code'}`);
        return;
      }
      const nextSession: StaffSession = {
        accessToken: data.accessToken,
        user: data.user,
      };
      setStaffSession(nextSession);
      setSession(nextSession);
      setChallengeToken(null);
      setTotpCode('');
      setStatusMsg(`Verified AAL2 session for ${data.user.email} (${data.user.role})`);
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Network error');
    }
  }

  async function handleLogout() {
    await apiFetch('/api/v1/auth/logout', { method: 'POST' });
    setStaffSession(null);
    setSession(null);
    setChallengeToken(null);
    setStatusMsg('Logged out and revoked refresh token family.');
  }

  return (
    <section>
      <div className="card">
        <h1>Staff Authentication (Argon2id + EdDSA JWT + TOTP AAL2)</h1>
        {session ? (
          <div>
            <p>
              Active Session: <strong>{session.user.email}</strong> — Role:{' '}
              <code>{session.user.role}</code> — Assurance: <code>AAL{session.user.aal}</code>
            </p>
            <pre>{JSON.stringify(session.user, null, 2)}</pre>
            <button type="button" onClick={() => void handleLogout()}>
              Sign Out
            </button>
          </div>
        ) : challengeToken ? (
          <form onSubmit={(e) => void handleVerifyMfa(e)}>
            <p>Enter 6-digit TOTP authenticator code to complete AAL2 step-up:</p>
            <input
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
              placeholder="123456"
              required
            />
            <button type="submit">Verify TOTP (AAL2)</button>
          </form>
        ) : (
          <form onSubmit={(e) => void handleLogin(e)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 420 }}>
              <label>
                Staff Email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
                />
              </label>
              <button type="submit" style={{ padding: '0.5rem 1rem' }}>
                Sign In
              </button>
            </div>
          </form>
        )}
        {statusMsg ? <p style={{ marginTop: '1rem' }}>{statusMsg}</p> : null}
      </div>
    </section>
  );
}
