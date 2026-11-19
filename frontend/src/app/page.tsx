'use client';

import type { HealthResponse, ReadyResponse } from '@fingerpay/contracts';
import { useEffect, useState } from 'react';

export default function SystemStatusPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [ready, setReady] = useState<ReadyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function probe() {
      try {
        const [hRes, rRes] = await Promise.all([
          fetch('/api/v1/health'),
          fetch('/api/v1/ready'),
        ]);
        if (!active) return;
        setHealth((await hRes.json()) as HealthResponse);
        setReady((await rRes.json()) as ReadyResponse);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Backend unreachable');
      }
    }
    void probe();
    return () => {
      active = false;
    };
  }, []);

  return (
    <section>
      <div className="card">
        <h1>M0 Foundation — System Status</h1>
        <p>
          Same-origin proxy <code>/api/v1/*</code> → Fastify modular monolith → PostgreSQL (`fp`
          private schema).
        </p>
        {error ? <p>Error: {error}</p> : null}
        <pre>{JSON.stringify({ health, ready }, null, 2)}</pre>
      </div>
    </section>
  );
}
