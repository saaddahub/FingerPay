'use client';

import { useEffect, useState } from 'react';
import { apiFetch, getStaffSession } from '../../lib/auth-store';

interface SmsRow {
  id: string;
  direction: 'OUT' | 'IN';
  customerId: string | null;
  phoneLast4: string;
  template: string;
  body: string;
  relatedAttemptId: string | null;
  createdAt: string;
}

interface DisputeRow {
  id: string;
  ticket: string;
  attemptId: string;
  shopperDisplayName: string;
  phoneLast4: string;
  amount: string;
  source: string;
  reason: string;
  status: 'OPEN' | 'REFUND_REQUESTED' | 'REFUNDED' | 'REJECTED';
  reversalId: string | null;
  makerId: string | null;
  checkerId: string | null;
  createdAt: string;
}

export default function SmsAndDisputesPage() {
  const [messages, setMessages] = useState<SmsRow[]>([]);
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  async function refreshAll() {
    if (!getStaffSession()) {
      setStatusMsg('Sign in on the Auth tab first.');
      return;
    }
    const smsRes = await apiFetch('/api/v1/demo/sms-feed');
    if (smsRes.ok) {
      const data = await smsRes.json();
      setMessages(data.messages ?? []);
    }
    const dspRes = await apiFetch('/api/v1/bank/disputes');
    if (dspRes.ok) {
      const data = await dspRes.json();
      setDisputes(data.disputes ?? []);
    }
  }

  useEffect(() => {
    void refreshAll();
  }, []);

  async function handleReplySms(smsId: string, text: 'DISPUTE' | 'LOCK') {
    const res = await apiFetch(`/api/v1/demo/sms/${smsId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatusMsg(`SMS Reply error (${res.status}): ${data?.error?.message ?? 'Error'}`);
      return;
    }
    setStatusMsg(`${data.action}: ${data.replyBody}`);
    await refreshAll();
  }

  async function handleRequestRefund(disputeId: string) {
    const res = await apiFetch(`/api/v1/bank/disputes/${disputeId}/refund-request`, {
      method: 'POST',
      body: JSON.stringify({ reason: 'Maker verified shopper SMS dispute' }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatusMsg(`Refund request failed (${res.status}): ${data?.error?.message ?? 'Error'}`);
      return;
    }
    setStatusMsg(`Refund requested (Reversal ${data.reversalId}) — awaiting a different Checker.`);
    await refreshAll();
  }

  async function handleDecideRefund(reversalId: string, decision: 'APPROVE' | 'REJECT') {
    const res = await apiFetch(`/api/v1/bank/refunds/${reversalId}/decision`, {
      method: 'POST',
      body: JSON.stringify({
        decision,
        reason: `Checker ${decision.toLowerCase()}d dispute refund`,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatusMsg(`Checker decision failed (${res.status}): ${data?.error?.message ?? 'Error'}`);
      return;
    }
    setStatusMsg(`Refund ${data.status} (Reversal ${data.reversalId})`);
    await refreshAll();
  }

  return (
    <section>
      <div className="card">
        <h1>View D — Live SMS Receipts, Reply LOCK / DISPUTE &amp; Maker-Checker Refunds</h1>
        <button type="button" onClick={() => void refreshAll()}>
          Refresh SMS Feed &amp; Disputes
        </button>
        {statusMsg ? <p style={{ marginTop: '0.75rem' }}>{statusMsg}</p> : null}
      </div>

      <div className="card">
        <h2>Bank Disputes Queue (Maker ≠ Checker Enforced)</h2>
        {disputes.length === 0 ? (
          <p>No disputes yet. Click [Reply DISPUTE] on any payment receipt SMS below.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {disputes.map((d) => (
              <div
                key={d.id}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: '0.375rem',
                  padding: '0.75rem',
                }}
              >
                <div>
                  <strong>{d.ticket}</strong> — {d.shopperDisplayName} (****{d.phoneLast4}) — PKR{' '}
                  {d.amount} — Status: <code>{d.status}</code>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {d.status === 'OPEN' ? (
                    <button type="button" onClick={() => void handleRequestRefund(d.id)}>
                      Request Refund (Maker: Officer / Admin)
                    </button>
                  ) : null}
                  {d.status === 'REFUND_REQUESTED' && d.reversalId ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void handleDecideRefund(d.reversalId!, 'APPROVE')}
                      >
                        Approve Refund (Different Checker: Manager / Admin)
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDecideRefund(d.reversalId!, 'REJECT')}
                      >
                        Reject Refund
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2>Live SMS Outbox &amp; Inbound Replies (Phone Masked to Last 4 Digits)</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {messages.map((m) => (
            <div
              key={m.id}
              style={{
                border: '1px solid var(--border)',
                borderRadius: '0.375rem',
                padding: '0.75rem',
              }}
            >
              <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                [{m.direction}] To/From ****{m.phoneLast4} | {m.template} |{' '}
                {m.createdAt.slice(11, 19)}
              </div>
              <p style={{ margin: '0.35rem 0' }}>{m.body}</p>
              {m.direction === 'OUT' ? (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {m.relatedAttemptId && m.template === 'PAYMENT_RECEIPT' ? (
                    <button type="button" onClick={() => void handleReplySms(m.id, 'DISPUTE')}>
                      Reply DISPUTE
                    </button>
                  ) : null}
                  <button type="button" onClick={() => void handleReplySms(m.id, 'LOCK')}>
                    Reply LOCK
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
