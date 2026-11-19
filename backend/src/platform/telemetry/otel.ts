/**
 * Lightweight in-process telemetry collector (request counts, latency percentiles, and outcome counters)
 * ready to export to OpenTelemetry / Grafana Cloud.
 */
export class TelemetryCollector {
  private readonly checkoutLatenciesMs: number[] = [];
  private readonly outcomeCounts = new Map<string, number>();

  recordCheckout(outcome: string, processingMs: number): void {
    this.outcomeCounts.set(outcome, (this.outcomeCounts.get(outcome) ?? 0) + 1);
    this.checkoutLatenciesMs.push(processingMs);
    if (this.checkoutLatenciesMs.length > 5_000) {
      this.checkoutLatenciesMs.shift();
    }
  }

  snapshot() {
    const sorted = [...this.checkoutLatenciesMs].sort((a, b) => a - b);
    const p = (q: number) =>
      sorted.length === 0 ? 0 : (sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))] ?? 0);

    return {
      sampleCount: sorted.length,
      p50Ms: p(0.5),
      p95Ms: p(0.95),
      p99Ms: p(0.99),
      outcomes: Object.fromEntries(this.outcomeCounts.entries()),
    };
  }
}

export const telemetry = new TelemetryCollector();
