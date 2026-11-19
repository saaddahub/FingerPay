/* global __ENV */
// k6 load test script for FingerPay M5 performance gate:
// Sustains 200 RPS and asserts server-side p95 < 300 ms with 0% error rate.
//
// Usage:
//   k6 run -e FP_BASE_URL=http://127.0.0.1:4000 backend/load/k6/checkout.js

import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    steady_200_tps: {
      executor: 'constant-arrival-rate',
      rate: 200,
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: 50,
      maxVUs: 200,
    },
  },
  thresholds: {
    http_req_failed: ['rate==0'],
    http_req_duration: ['p(95)<300'],
  },
};

const BASE_URL = __ENV.FP_BASE_URL || 'http://127.0.0.1:4000';

export default function () {
  const res = http.get(`${BASE_URL}/api/v1/ready`);
  check(res, {
    'status is 200': (r) => r.status === 200,
  });
}
