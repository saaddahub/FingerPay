'use client';

import { useEffect, useState } from 'react';
import { apiFetch, getStaffSession } from '../../lib/auth-store';

interface AuditRow {
  id: string;
  occurredAt: string;
  actorType: string;
  actorId: string;
  action: string;
  entity: string;
  entityId: string;
  details: Record<string, unknown>;
  prevHash: string;
  rowHash: string;
}

export default function BankConsolePage() {
  const [integrity, setIntegrity] = useState<Record<string, unknown> | null>(null);
  const [events, setEvents] = useState<AuditRow[]>([]);
  const [terminalIdToRevoke, setTerminalIdToRevoke] = useState('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  async function runIntegrityAndLoadAudit() {
    if (!getStaffSession()) {
      setStatusMsg('Sign in as BANK_ADMIN or AUDITOR (AAL2) on the Auth tab first.');
      return;
    }
    const [iRes, aRes] = await Promise.all([
      apiFetch('/api/v1/bank/integrity'),
      apiFetch('/api/v1/bank/audit'),
    ]);
    if (iRes.ok) {
      setIntegrity((await iRes.json()) as Record<string, unknown>);
    }
    if (aRes.ok) {
      const data = await aRes.json();
      setEvents(data.events ?? []);
      setStatusMsg(null);
    } else {
      const err = await aRes.json();
      setStatusMsg(err?.error?.message ?? 'Requires BANK_ADMIN or AUDITOR with AAL2');
    }
  }

  useEffect(() => {
    void runIntegrityAndLoadAudit();
  }, []);

  async function handleToggleRaast(code: string, available: boolean) {
    const res = await apiFetch('/api/v1/bank/raast-availability', {
      method: 'POST',
      body: JSON.stringify({ institutionCode: code, available }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatusMsg(`Raast toggle failed (${res.status}): ${data?.error?.message ?? 'Error'}`);
      return;
    }
    setStatusMsg(
      `Institution ${data.institutionCode} Raast availability set to ${data.raastAvailable}`,
    );
    await runIntegrityAndLoadAudit();
  }

  async function handleRevokeTerminal() {
    if (!terminalIdToRevoke.trim()) return;
    const res = await apiFetch(`/api/v1/terminals/${terminalIdToRevoke.trim()}/revoke`, {
      method: 'POST',
    });
    const data = await res.json();
    if (!res.ok) {
      setStatusMsg(`Revoke failed (${res.status}): ${data?.error?.message ?? 'Error'}`);
      return;
    }
    setStatusMsg(`Revoked terminal ${data.terminalId} at ${data.revokedAt}`);
    await runIntegrityAndLoadAudit();
  }

  return (
    <section>
      <div className="card">
        <h1>View E — Bank Console (Audit Chain, Ledger Integrity &amp; Controls)</h1>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          <button type="button" onClick={() => void runIntegrityAndLoadAudit()}>
            Run Integrity Check (Audit Hash Chain + Ledger Balances)
          </button>
          <button type="button" onClick={() => void handleToggleRaast('DBB', false)}>
            Simulate DBB Raast Outage (Off-Us Down)
          </button>
          <button type="button" onClick={() => void handleToggleRaast('DBB', true)}>
            Restore DBB Raast Online
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={terminalIdToRevoke}
            onChange={(e) => setTerminalIdToRevoke(e.target.value)}
            placeholder="Terminal UUID to revoke"
            style={{ padding: '0.4rem', width: 300 }}
          />
          <button type="button" onClick={() => void handleRevokeTerminal()}>
            Revoke Terminal Key
          </button>
        </div>

        {statusMsg ? <p style={{ marginTop: '0.75rem' }}>{statusMsg}</p> : null}
        {integrity ? <pre>{JSON.stringify(integrity, null, 2)}</pre> : null}
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <h2>Tamper-Evident SHA-256 Audit Log Tail</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '0.4rem' }}>#</th>
              <th style={{ padding: '0.4rem' }}>Time</th>
              <th style={{ padding: '0.4rem' }}>Actor</th>
              <th style={{ padding: '0.4rem' }}>Action</th>
              <th style={{ padding: '0.4rem' }}>Entity</th>
              <th style={{ padding: '0.4rem' }}>Prev Hash</th>
              <th style={{ padding: '0.4rem' }}>Row Hash</th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev: AuditRow) => (
              <tr key={ev.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '0.4rem' }}>{ev.id}</td>
                <td style={{ padding: '0.4rem' }}>{ev.occurredAt.slice(11, 19)}</td>
                <td style={{ padding: '0.4rem' }}>
                  {ev.actorType}:{ev.actorId.slice(0, 8)}
                </td>
                <td style={{ padding: '0.4rem' }}>
                  <strong>{ev.action}</strong>
                </td>
                <td style={{ padding: '0.4rem' }}>
                  {ev.entity}:{ev.entityId.slice(0, 8)}
                </td>
                <td style={{ padding: '0.4rem' }}>
                  <code>{ev.prevHash.slice(0, 12)}…</code>
                </td>
                <td style={{ padding: '0.4rem' }}>
                  <code>{ev.rowHash.slice(0, 12)}…</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
