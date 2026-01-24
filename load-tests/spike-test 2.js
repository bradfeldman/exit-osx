import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

/**
 * Spike Test for ExitOSx API
 *
 * Purpose: Test system behavior under sudden extreme load
 * Simulates sudden traffic spikes (e.g., viral content, marketing campaign)
 *
 * Run with: k6 run load-tests/spike-test.js
 */

// Custom metrics
const errorRate = new Rate('errors');
const apiDuration = new Trend('api_duration');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'https://staging.exitosx.com';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

export const options = {
  stages: [
    { duration: '1m', target: 5 },    // Warm up
    { duration: '30s', target: 5 },   // Stay at low load
    { duration: '10s', target: 50 },  // SPIKE! Rapid increase to 50 users
    { duration: '1m', target: 50 },   // Stay at spike load
    { duration: '10s', target: 5 },   // Rapid decrease
    { duration: '2m', target: 5 },    // Recovery period
    { duration: '10s', target: 100 }, // SPIKE! Bigger spike
    { duration: '1m', target: 100 },  // Stay at extreme load
    { duration: '30s', target: 0 },   // Scale down
  ],

  thresholds: {
    // Spike test has more lenient thresholds
    http_req_duration: ['p(95)<3000'],     // 95% of requests < 3s
    http_req_failed: ['rate<0.15'],         // Error rate < 15%
    errors: ['rate<0.20'],                  // Custom error rate < 20%
  },
};

function getHeaders() {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (AUTH_TOKEN) {
    headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
  }

  return headers;
}

export default function() {
  group('Spike Test - Critical Endpoints', function() {
    // Focus on most critical endpoints during spike

    // Companies API
    const companiesRes = http.get(`${BASE_URL}/api/companies`, {
      headers: getHeaders(),
      tags: { name: 'companies_spike' },
    });

    const ok = check(companiesRes, {
      'companies returns valid status': (r) =>
        r.status === 200 || r.status === 401 || r.status === 429 || r.status === 503,
      'companies responds within timeout': (r) => r.timings.duration < 5000,
    });

    if (!ok || companiesRes.status >= 500) {
      errorRate.add(1);
    }
    apiDuration.add(companiesRes.timings.duration);

    // Small sleep to simulate realistic user behavior
    sleep(Math.random() * 0.5 + 0.1); // 0.1-0.6 seconds
  });
}

export function setup() {
  console.log('='.repeat(60));
  console.log('SPIKE TEST');
  console.log('='.repeat(60));
  console.log(`Target: ${BASE_URL}`);
  console.log('Purpose: Test sudden traffic spikes');
  console.log('');
  console.log('Load pattern:');
  console.log('  - Warm up at 5 VUs');
  console.log('  - SPIKE to 50 VUs (10x increase)');
  console.log('  - Hold and observe');
  console.log('  - Recovery at 5 VUs');
  console.log('  - SPIKE to 100 VUs (20x increase)');
  console.log('  - Scale down');
  console.log('='.repeat(60));

  return { startTime: new Date().toISOString() };
}

export function teardown(data) {
  console.log('');
  console.log('='.repeat(60));
  console.log('SPIKE TEST COMPLETED');
  console.log('='.repeat(60));
  console.log(`Started: ${data.startTime}`);
  console.log(`Ended: ${new Date().toISOString()}`);
  console.log('');
  console.log('Key observations to check:');
  console.log('  - Did the system handle the spike without crashing?');
  console.log('  - How quickly did response times recover?');
  console.log('  - Were any requests dropped or timed out?');
  console.log('  - Did rate limiting kick in? (429 responses)');
  console.log('='.repeat(60));
}
