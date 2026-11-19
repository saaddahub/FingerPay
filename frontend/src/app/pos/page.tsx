'use client';

import { BANNERS_EN, type ClientOutcome } from '@fingerpay/contracts';
import { useEffect, useState } from 'react';
import { apiFetch, getStaffSession } from '../../lib/auth-store';
import {
  buildSignedTerminalHeaders,
  generateTerminalKeyPair,
  getActiveTerminal,
  setActiveTerminal,
  type BrowserTerminalIdentity,
} from '../../lib/terminal-keys';

interface FingerPersona {
  customerId: string;
  displayName: string;
  accountType: 'SHOPPER_SALARY' | 'STUDENT_NON_PTA';
  institutionCode: string;
  phoneLast4: string;
  cnicLast4: string;
  thumbLocked: boolean;
  demoToken: string;
}

export default function PosTerminalPage() {
  const [terminal, setTerminal] = useState<BrowserTerminalIdentity | null>(() =>
    getActiveTerminal(),
  );
  const [amountInput, setAmountInput] = useState('180.00');
  const [chargeId, setChargeId] = useState<string | null>(null);
  const [offlineMode, setOfflineMode] = useState(false);
  const [claimInput, setClaimInput] = useState('');
  const [personas, setPersonas] = useState<FingerPersona[]>([]);
  const [bannerOutcome, setBannerOutcome] = useState<ClientOutcome | null>(null);
  const [bannerAmount, setBannerAmount] = useState<string>('180.00');
  const [processingMs, setProcessingMs] = useState<number | null>(null);
  const [receipt, setReceipt] = useState<Record<string, unknown> | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  async function refreshFingerTray() {
    if (!getStaffSession()) return;
    const res = await apiFetch('/api/v1/demo/finger-tray');
    if (res.ok) {
      const data = await res.json();
      setPersonas(data.personas ?? []);
    }
  }

  useEffect(() => {
    void refreshFingerTray();
  }, []);

  async function handlePairTerminal() {
    setStatusMsg('Generating non-extractable WebCrypto ECDSA P-256 keypair...');
    try {
      const { keyPair, spkiBase64 } = await generateTerminalKeyPair();
      const res = await apiFetch('/api/v1/terminals/pair', {
        method: 'POST',
        body: JSON.stringify({
          label: 'Browser Counter POS',
          publicKeySpki: spkiBase64,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusMsg(`Pairing failed (${res.status}): ${data?.error?.message ?? 'Error'}`);
        return;
      }
      const nextTerm: BrowserTerminalIdentity = {
        terminalId: data.terminalId,
        merchantId: data.merchantId,
        label: data.label,
        keyPair,
        spkiBase64,
      };
      setActiveTerminal(nextTerm);
      setTerminal(nextTerm);
      setStatusMsg(`Paired terminal ${data.terminalId} (SHA-256: ${data.keySha256.slice(0, 16)}...)`);
      await refreshFingerTray();
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Pairing error');
    }
  }

  async function handleOpenCharge() {
    if (offlineMode) {
      setBannerOutcome('OFFLINE');
      setReceipt(null);
      return;
    }
    if (!terminal) {
      setStatusMsg('Pair a terminal first (as MERCHANT_OWNER).');
      return;
    }
    const path = '/api/v1/pos/charges';
    const bodyText = JSON.stringify({ amount: amountInput });
    const sigHeaders = await buildSignedTerminalHeaders({
      terminal,
      method: 'POST',
      pathWithQuery: path,
      bodyText,
    });
    const res = await apiFetch(path, {
      method: 'POST',
      headers: sigHeaders,
      body: bodyText,
    });
    const data = await res.json();
    if (!res.ok) {
      setStatusMsg(`Charge error (${res.status}): ${data?.error?.message ?? 'Error'}`);
      return;
    }
    setChargeId(data.chargeId);
    setBannerOutcome(null);
    setReceipt(null);
    setProcessingMs(null);
    setStatusMsg(`WAITING_FOR_THUMB — Charge ${data.chargeId} open for PKR ${data.amount}`);
  }

  async function handleSimulateTap(token: string) {
    if (offlineMode) {
      setBannerOutcome('OFFLINE');
      setReceipt(null);
      return;
    }
    if (!terminal || !chargeId) {
      setStatusMsg('Open a charge session before tapping a thumb.');
      return;
    }
    const path = `/api/v1/pos/charges/${chargeId}/thumb`;
    const bodyObj: { token: string; claim?: string } = { token };
    if (claimInput.trim().length === 4) {
      bodyObj.claim = claimInput.trim();
    }
    const bodyText = JSON.stringify(bodyObj);
    const sigHeaders = await buildSignedTerminalHeaders({
      terminal,
      method: 'POST',
      pathWithQuery: path,
      bodyText,
    });

    const res = await apiFetch(path, {
      method: 'POST',
      headers: sigHeaders,
      body: bodyText,
    });
    const data = await res.json();
    if (!res.ok) {
      setStatusMsg(`Tap failed (${res.status}): ${data?.error?.message ?? 'Error'}`);
      return;
    }
    setBannerOutcome(data.outcome as ClientOutcome);
    setBannerAmount(data.receipt?.gross ?? amountInput);
    setProcessingMs(data.processingMs);
    setReceipt(data.receipt ?? null);
    if (data.outcome === 'SUCCESS') {
      setChargeId(null);
    }
  }

  async function handleToggleOffline() {
    const next = !offlineMode;
    setOfflineMode(next);
    if (next) {
      setBannerOutcome('OFFLINE');
      setChargeId(null);
      setReceipt(null);
    } else {
      setBannerOutcome(null);
      if (terminal && getStaffSession()) {
        const path = '/api/v1/pos/offline-events';
        const bodyText = JSON.stringify({
          occurredAt: new Date().toISOString(),
          amount: amountInput,
        });
        const sigHeaders = await buildSignedTerminalHeaders({
          terminal,
          method: 'POST',
          pathWithQuery: path,
          bodyText,
        });
        await apiFetch(path, { method: 'POST', headers: sigHeaders, body: bodyText });
        setStatusMsg('Reconnected — uploaded informational offline fallback event.');
      }
    }
  }

  return (
    <section>
      <div className="card">
        <h1>View A — Merchant POS Terminal</h1>
        <p>
          Status:{' '}
          <strong style={{ color: offlineMode ? 'var(--warn)' : 'var(--ok)' }}>
            {offlineMode ? 'OFFLINE (FALLBACK)' : 'ONLINE'}
          </strong>{' '}
          | Terminal:{' '}
          <code>{terminal ? `${terminal.label} (${terminal.terminalId.slice(0, 8)}...)` : 'Unpaired'}</code>
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <button type="button" onClick={() => void handlePairTerminal()}>
            Pair Browser Terminal (ECDSA P-256)
          </button>
          <button type="button" onClick={() => void handleToggleOffline()}>
            {offlineMode ? 'Reconnect Internet' : 'Toggle Internet Down / Offline Fallback'}
          </button>
          <button type="button" onClick={() => void refreshFingerTray()}>
            Refresh Finger Tray
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <label>
            Sale Amount (PKR):{' '}
            <input
              type="text"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              style={{ padding: '0.4rem', width: 120 }}
            />
          </label>
          {['80.00', '150.00', '180.00', '500.00'].map((preset) => (
            <button key={preset} type="button" onClick={() => setAmountInput(preset)}>
              PKR {preset}
            </button>
          ))}
          <label>
            Optional 1:1 Claim (last 4):{' '}
            <input
              type="text"
              maxLength={4}
              value={claimInput}
              onChange={(e) => setClaimInput(e.target.value)}
              placeholder="2334"
              style={{ padding: '0.4rem', width: 80 }}
            />
          </label>
          <button type="button" onClick={() => void handleOpenCharge()}>
            Charge / Await Thumb Tap
          </button>
        </div>
      </div>

      {bannerOutcome ? (
        <div
          className="card"
          style={{
            borderColor:
              bannerOutcome === 'SUCCESS'
                ? 'var(--ok)'
                : bannerOutcome === 'OFFLINE'
                  ? 'var(--warn)'
                  : 'var(--err)',
          }}
        >
          <h2>{BANNERS_EN[bannerOutcome]({ amount: bannerAmount })}</h2>
          {processingMs !== null ? <p>Measured processing time: {processingMs} ms</p> : null}
          {receipt ? <pre>{JSON.stringify(receipt, null, 2)}</pre> : null}
        </div>
      ) : null}

      <div className="card">
        <h2>Demo Finger Tray (Every Shopper Enrolled in View C Appears Here)</h2>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {personas.map((p) => (
            <button
              key={p.customerId}
              type="button"
              onClick={() => void handleSimulateTap(p.demoToken)}
            >
              Simulate Thumb Tap: {p.displayName} ({p.accountType}, {p.institutionCode}
              {p.thumbLocked ? ' — LOCKED' : ''})
            </button>
          ))}
          <button
            type="button"
            onClick={() =>
              void handleSimulateTap('unregistered-random-thumb-token-' + Date.now())
            }
          >
            Simulate Thumb Tap: Unregistered Thumb
          </button>
        </div>
        {statusMsg ? <p style={{ marginTop: '0.75rem' }}>{statusMsg}</p> : null}
      </div>
    </section>
  );
}
