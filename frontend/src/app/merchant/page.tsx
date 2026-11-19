'use client';

import type { LedgerRow } from '@fingerpay/contracts';
import { useEffect, useState } from 'react';
import { apiFetch, getStaffSession } from '../../lib/auth-store';

interface SummaryData {
  day: string;
  merchantName: string;
  totalGross: string;
  totalFees: string;
  totalNet: string;
  mdrSavedVsCardPos: string;
  merchantBalance: string;
  screenshotsAvoided: number;
  monthlySettledCount: number;
  rebateEarned: boolean;
}

export default function MerchantLedgerPage() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  async function refreshAll() {
    if (!getStaffSession()) {
      setStatusMsg('Sign in as MERCHANT_OWNER or MERCHANT_CASHIER on the Auth tab first.');
      return;
    }
    const [sRes, lRes] = await Promise.all([
      apiFetch('/api/v1/merchant/summary'),
      apiFetch('/api/v1/merchant/ledger'),
    ]);
    if (sRes.ok) setSummary((await sRes.json()) as SummaryData);
    if (lRes.ok) {
      const lData = await lRes.json();
      setRows(lData.rows ?? []);
      setStatusMsg(null);
    } else {
      const err = await lRes.json();
      setStatusMsg(err?.error?.message ?? 'Failed to load ledger');
    }
  }

  useEffect(() => {
    void refreshAll();
  }, []);

  async function handleVoidSale(attemptId: string) {
    const res = await apiFetch(`/api/v1/merchant/sales/${attemptId}/void`, {
      method: 'POST',
      body: JSON.stringify({ reason: 'Owner same-day counter correction' }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatusMsg(`Void failed (${res.status}): ${data?.error?.message ?? 'Error'}`);
      return;
    }
    setStatusMsg(`Voided sale ${attemptId} (Reversal ${data.reversalId})`);
    await refreshAll();
  }

  async function handleExportCsv() {
    const res = await apiFetch('/api/v1/merchant/ledger.csv');
    if (!res.ok) {
      const data = await res.json();
      setStatusMsg(`CSV export rejected (${res.status}): ${data?.error?.message ?? 'Error'}`);
      return;
    }
    const text = await res.text();
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fingerpay-settlement-${summary?.day ?? 'today'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section>
      <div className="card">
        <h1>View B — Merchant Daily Ledger &amp; Settlement</h1>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button type="button" onClick={() => void refreshAll()}>
            Refresh Ledger
          </button>
          <button type="button" onClick={() => void handleExportCsv()}>
            Export Daily Settlement CSV (Owner)
          </button>
        </div>

        {summary ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
            <div>
              <strong>Store:</strong> {summary.merchantName} ({summary.day})
            </div>
            <div>
              <strong>Gross Sales:</strong> PKR {summary.totalGross}
            </div>
            <div>
              <strong>Net Settled:</strong> PKR {summary.totalNet}
            </div>
            <div>
              <strong>MDR Saved vs 2.5% POS:</strong> PKR {summary.mdrSavedVsCardPos}
            </div>
            <div>
              <strong>Bank Balance:</strong> PKR {summary.merchantBalance}
            </div>
            <div>
              <strong>Screenshots Avoided:</strong> {summary.screenshotsAvoided}
            </div>
            <div>
              <strong>Monthly Tx Count:</strong> {summary.monthlySettledCount}
            </div>
          </div>
        ) : null}
        {statusMsg ? <p style={{ marginTop: '0.75rem' }}>{statusMsg}</p> : null}
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '0.5rem' }}>Time</th>
              <th style={{ padding: '0.5rem' }}>Shopper</th>
              <th style={{ padding: '0.5rem' }}>Routing</th>
              <th style={{ padding: '0.5rem' }}>Gross</th>
              <th style={{ padding: '0.5rem' }}>MDR Fee</th>
              <th style={{ padding: '0.5rem' }}>Net</th>
              <th style={{ padding: '0.5rem' }}>Raast Ref</th>
              <th style={{ padding: '0.5rem' }}>Status</th>
              <th style={{ padding: '0.5rem' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '0.5rem' }}>{r.time.slice(11, 19)}</td>
                <td style={{ padding: '0.5rem' }}>{r.shopper ?? '—'}</td>
                <td style={{ padding: '0.5rem' }}>{r.routing ?? '—'}</td>
                <td style={{ padding: '0.5rem' }}>PKR {r.gross}</td>
                <td style={{ padding: '0.5rem' }}>PKR {r.fee}</td>
                <td style={{ padding: '0.5rem' }}>PKR {r.net}</td>
                <td style={{ padding: '0.5rem' }}>
                  <code>{r.raastRef ?? '—'}</code>
                </td>
                <td style={{ padding: '0.5rem' }}>{r.status}</td>
                <td style={{ padding: '0.5rem' }}>
                  {r.status === 'SETTLED' ? (
                    <button type="button" onClick={() => void handleVoidSale(r.id)}>
                      Void (Owner)
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
