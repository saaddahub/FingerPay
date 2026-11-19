'use client';

import { useState } from 'react';
import { apiFetch } from '../../lib/auth-store';

interface LookupCustomer {
  customerId: string;
  displayName: string;
  accountType: string;
  cnicLast4: string;
  phoneLast4: string;
  status: string;
  thumbLocked: boolean;
  thumbLockedAt: string | null;
  nadraRef: string;
}

export default function BranchPortalPage() {
  const [fullName, setFullName] = useState('Zainab Tariq');
  const [cnic, setCnic] = useState('35202-5566778-9');
  const [accountNumber, setAccountNumber] = useState('ABL-SAL-112233445');
  const [accountType, setAccountType] = useState<'SHOPPER_SALARY' | 'STUDENT_NON_PTA'>(
    'SHOPPER_SALARY',
  );
  const [phone, setPhone] = useState('+923005566778');
  const [openingBalance, setOpeningBalance] = useState('5000.00');
  const [referralCodeUsed, setReferralCodeUsed] = useState('');
  const [consentAccepted, setConsentAccepted] = useState(true);
  const [nadraRef, setNadraRef] = useState<string | null>(null);
  const [enrollResult, setEnrollResult] = useState<Record<string, unknown> | null>(null);

  const [lookupCnic, setLookupCnic] = useState('35202-1122334-6');
  const [foundCustomer, setFoundCustomer] = useState<LookupCustomer | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  async function handleNadraVerify() {
    setStatusMsg('Verifying CNIC with simulated NADRA gateway...');
    const res = await apiFetch('/api/v1/branch/nadra/verify', {
      method: 'POST',
      body: JSON.stringify({ cnic, fullName }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatusMsg(`NADRA error (${res.status}): ${data?.error?.message ?? 'Error'}`);
      return;
    }
    if (!data.verified) {
      setNadraRef(null);
      setStatusMsg(`NADRA Rejected: ${data.reason ?? 'CNIC not verified'}`);
      return;
    }
    setNadraRef(data.nadraRef);
    setStatusMsg(`NADRA Verified: ${data.nadraRef}`);
  }

  async function handleEnroll(e: React.FormEvent) {
    e.preventDefault();
    if (!nadraRef) {
      setStatusMsg('Verify CNIC with NADRA Gateway first.');
      return;
    }
    if (!consentAccepted) {
      setStatusMsg('Biometric consent is mandatory.');
      return;
    }
    const payload: Record<string, unknown> = {
      fullName,
      cnic,
      accountNumber,
      accountType,
      phone,
      openingBalance,
      nadraRef,
      consentAccepted: true,
      consentVersion: 'v1.0-2026',
    };
    if (referralCodeUsed.trim()) {
      payload.referralCodeUsed = referralCodeUsed.trim();
    }
    const res = await apiFetch('/api/v1/branch/enrollments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatusMsg(`Enrollment failed (${res.status}): ${data?.error?.message ?? 'Error'}`);
      return;
    }
    setEnrollResult(data);
    setStatusMsg(
      `Enrolled ${data.displayName} — shopper is immediately available in View A's POS finger tray!`,
    );
  }

  async function handleLookup() {
    const res = await apiFetch('/api/v1/branch/customers/lookup', {
      method: 'POST',
      body: JSON.stringify({ cnic: lookupCnic }),
    });
    const data = await res.json();
    if (!res.ok) {
      setFoundCustomer(null);
      setStatusMsg(`Lookup failed (${res.status}): ${data?.error?.message ?? 'Not found'}`);
      return;
    }
    setFoundCustomer(data as LookupCustomer);
    setStatusMsg(null);
  }

  async function handleToggleThumbLock(locked: boolean) {
    if (!foundCustomer) return;
    const res = await apiFetch(`/api/v1/branch/customers/${foundCustomer.customerId}/thumb-lock`, {
      method: 'POST',
      body: JSON.stringify({
        locked,
        reason: locked ? 'Branch manual security lock' : 'Branch in-person CNIC unlock',
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatusMsg(`Thumb Lock error (${res.status}): ${data?.error?.message ?? 'Error'}`);
      return;
    }
    setFoundCustomer(data as LookupCustomer);
    setStatusMsg(`Thumb Lock updated: ${data.thumbLocked ? 'LOCKED' : 'UNLOCKED'}`);
  }

  return (
    <section>
      <div className="card">
        <h1>View C — Branch Enrollment Portal (Requires BRANCH_OFFICER / BRANCH_MANAGER AAL2)</h1>
        <form onSubmit={(e) => void handleEnroll(e)}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
            <label>
              Full Name
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                style={{ width: '100%', padding: '0.4rem' }}
              />
            </label>
            <label>
              13-Digit CNIC (00000-0000000-0 simulates not found)
              <input
                type="text"
                value={cnic}
                onChange={(e) => setCnic(e.target.value)}
                required
                style={{ width: '100%', padding: '0.4rem' }}
              />
            </label>
            <label>
              Bank Account Number
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                required
                style={{ width: '100%', padding: '0.4rem' }}
              />
            </label>
            <label>
              Account Type
              <select
                value={accountType}
                onChange={(e) =>
                  setAccountType(e.target.value as 'SHOPPER_SALARY' | 'STUDENT_NON_PTA')
                }
                style={{ width: '100%', padding: '0.4rem' }}
              >
                <option value="SHOPPER_SALARY">SHOPPER_SALARY (PKR 5,000/tap)</option>
                <option value="STUDENT_NON_PTA">STUDENT_NON_PTA (PKR 2,000/tap, 2% cashback)</option>
              </select>
            </label>
            <label>
              Mobile Number (for SMS Receipts &amp; LOCK/DISPUTE)
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                style={{ width: '100%', padding: '0.4rem' }}
              />
            </label>
            <label>
              Opening Balance (PKR, Simulated)
              <input
                type="text"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                required
                style={{ width: '100%', padding: '0.4rem' }}
              />
            </label>
            <label>
              Optional Student Referral Code (e.g. BILAL-FP100)
              <input
                type="text"
                value={referralCodeUsed}
                onChange={(e) => setReferralCodeUsed(e.target.value)}
                style={{ width: '100%', padding: '0.4rem' }}
              />
            </label>
          </div>

          <div style={{ marginTop: '0.75rem' }}>
            <label>
              <input
                type="checkbox"
                checked={consentAccepted}
                onChange={(e) => setConsentAccepted(e.target.checked)}
              />{' '}
              Shopper has signed Biometric Consent (v1.0-2026) — only an HMAC of the scan token is
              stored; no fingerprint image is ever saved.
            </label>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => void handleNadraVerify()}>
              1. Verify CNIC with NADRA Gateway
            </button>
            <button type="submit" disabled={!nadraRef}>
              2. Scan &amp; Hash Thumbprint + Activate FingerPay
            </button>
          </div>
        </form>
        {nadraRef ? <p>Verified NADRA Reference: <code>{nadraRef}</code></p> : null}
        {enrollResult ? <pre>{JSON.stringify(enrollResult, null, 2)}</pre> : null}
      </div>

      <div className="card">
        <h2>Customer Lookup &amp; Branch Thumb Lock / Unlock</h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={lookupCnic}
            onChange={(e) => setLookupCnic(e.target.value)}
            placeholder="35202-1122334-6"
            style={{ padding: '0.4rem', width: 200 }}
          />
          <button type="button" onClick={() => void handleLookup()}>
            Look Up Shopper by CNIC
          </button>
        </div>
        {foundCustomer ? (
          <div style={{ marginTop: '0.75rem' }}>
            <p>
              <strong>{foundCustomer.displayName}</strong> ({foundCustomer.accountType}) — CNIC
              ****{foundCustomer.cnicLast4} — Phone ****{foundCustomer.phoneLast4} — Thumb Status:{' '}
              <strong>{foundCustomer.thumbLocked ? 'LOCKED' : 'ACTIVE'}</strong>
            </p>
            <button
              type="button"
              onClick={() => void handleToggleThumbLock(!foundCustomer.thumbLocked)}
            >
              {foundCustomer.thumbLocked
                ? 'Unlock Thumb (In-Branch Verified)'
                : 'Lock Thumb Immediately'}
            </button>
          </div>
        ) : null}
        {statusMsg ? <p style={{ marginTop: '0.75rem' }}>{statusMsg}</p> : null}
      </div>
    </section>
  );
}
