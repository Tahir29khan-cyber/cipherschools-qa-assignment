// k6 Load Simulation Script
// Target: Product Search API — https://with-bugs.practicesoftwaretesting.com
// Run: k6 run load/k6/search-load-test.js
// With Prometheus output: K6_PROMETHEUS_RW_SERVER_URL=http://localhost:9090/api/v1/write k6 run --out=experimental-prometheus-rw load/k6/search-load-test.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

// ─── Custom Metrics ──────────────────────────────────────────────────────────
const searchErrors = new Counter('search_errors');
const searchDuration = new Trend('search_duration_ms', true);

// ─── Environment Config ──────────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || 'https://with-bugs.practicesoftwaretesting.com';

// ─── Load Profile ────────────────────────────────────────────────────────────
// Ramp up to 20 VUs over 10s → hold 30s → ramp down 10s
export const options = {
  stages: [
    { duration: '10s', target: 20 },  // Ramp up
    { duration: '30s', target: 20 },  // Hold
    { duration: '10s', target: 0 },   // Ramp down
  ],
  thresholds: {
    // 95% of requests must complete within 2 seconds
    http_req_duration: ['p(95)<2000'],
    // Error rate must stay below 1%
    http_req_failed: ['rate<0.01'],
    // Custom: search errors counter
    search_errors: ['count<5'],
  },
};

// ─── Search keywords simulating real learner queries ─────────────────────────
const searchTerms = ['Pliers', 'Hammer', 'Screwdriver', 'Wrench', 'Bolt', 'Saw'];

export default function () {
  const keyword = searchTerms[Math.floor(Math.random() * searchTerms.length)];
  const url = `${BASE_URL}/api/v1/products/search?q=${keyword}&page=0&between_price=1,100`;

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    tags: { name: 'product_search' },
  };

  const startTime = Date.now();
  const res = http.get(url, params);
  searchDuration.add(Date.now() - startTime);

  // ─── Assertions ─────────────────────────────────────────────────────────────
  const passed = check(res, {
    // Assertion 1: Status is 200 OK
    'status is 200': (r) => r.status === 200,

    // Assertion 2: Response time < 2000ms
    'response time < 2000ms': (r) => r.timings.duration < 2000,

    // Assertion 3: Response body contains product data
    'response body has data array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data !== undefined || Array.isArray(body) || body.total !== undefined;
      } catch {
        return false;
      }
    },

    // Assertion 4: Content-Type is JSON
    'content-type is JSON': (r) => r.headers['Content-Type']?.includes('application/json'),

    // Assertion 5: Body is not empty
    'body is not empty': (r) => r.body && r.body.length > 0,
  });

  if (!passed) {
    searchErrors.add(1);
    console.warn(`Search failed for keyword: ${keyword} | Status: ${res.status}`);
  }

  // Simulate realistic learner think-time between searches (0.5–1.5s)
  sleep(Math.random() * 1 + 0.5);
}

// ─── Summary output for README screenshot ───────────────────────────────────
export function handleSummary(data) {
  return {
    'load/k6/results-summary.json': JSON.stringify(data, null, 2),
    stdout: `
=== k6 Threshold Summary ===
http_req_duration (p95<2000ms): ${data.metrics.http_req_duration?.values['p(95)']?.toFixed(2)}ms
http_req_failed (rate<1%):      ${(data.metrics.http_req_failed?.values?.rate * 100)?.toFixed(2)}%
Total Requests:                 ${data.metrics.http_reqs?.values?.count}
Errors:                         ${data.metrics.search_errors?.values?.count || 0}
    `,
  };
}
