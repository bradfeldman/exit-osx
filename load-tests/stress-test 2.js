import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

/**
 * Stress Test for ExitOSx API
 *
 * Purpose: Find the breaking point of the system
 * Gradually increases load until the system starts to fail
 *
 * Run with: k6 run load-tests/stress-test.js
 */

// Custom metrics
const errorRate = new Rate('errors');
const apiDuration = new Trend('api_duration');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'https://staging.exitosx.com';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

export const options = {
  stages: [
    { duration: '2m', target: 10 },   // Below normal load
    { duration: '5m', target: 10 },   // Stay at normal load
    { duration: '2m', target: 20 },   // Normal load
    { duration: '5m', target: 20 },   // Stay at normal load
    { duration: '2m', target: 30 },   // Around breaking point
    { duration: '5m', target: 30 },   // Stay at breaking point
    { duration: '2m', target: 40 },   // Beyond breaking point
    { duration: '5m', target: 40 },   // Stay beyond breaking point
    { duration: '5m', target: 0 },    // Scale down. Recovery stage
  ],

  thresholds: {
    // More lenient thresholds for stress test
    http_req_duration: ['p(95)<2000'],     // 95% of requests < 2s
    http_req_failed: ['rate<0.10'],         // Error rate < 10%
    errors: ['rate<0.15'],                  // Custom error rate < 15%
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
  group('Stress Test - API Endpoints', function() {
    // Companies API - Primary endpoint
    const companiesRes = http.get(`${BASE_URL}/api/companies`, {
      headers: getHeaders(),
      tags: { name: 'companies' },
    });

    const companiesOk = check(companiesRes, {
      'companies status is 200': (r) => r.status === 200,
      'companies response time < 2s': (r) => r.timings.duration < 2000,
    });

    if (!companiesOk) {
      errorRate.add(1);
    }
    apiDuration.add(companiesRes.timings.duration);

    sleep(0.3);

    // Tasks API
    const tasksRes = http.get(`${BASE_URL}/api/tasks`, {
      headers: getHeaders(),
      tags: { name: 'tasks' },
    });

    const tasksOk = check(tasksRes, {
      'tasks status is valid': (r) => r.status === 200 || r.status === 401 || r.status === 404,
      'tasks response time < 2s': (r) => r.timings.duration < 2000,
    });

    if (!tasksOk) {
      errorRate.add(1);
    }
    apiDuration.add(tasksRes.timings.duration);

    sleep(0.3);

    // Simulate page load with multiple API calls
    const batch = http.batch([
      ['GET', `${BASE_URL}/api/companies`, null, { headers: getHeaders(), tags: { name: 'batch_companies' } }],
      ['GET', `${BASE_URL}/api/organizations`, null, { headers: getHeaders(), tags: { name: 'batch_orgs' } }],
    ]);

    batch.forEach((res, index) => {
      const ok = check(res, {
        [`batch_${index} status OK`]: (r) => r.status === 200 || r.status === 401 || r.status === 404,
      });

      if (!ok) {
        errorRate.add(1);
      }
      apiDuration.add(res.timings.duration);
    });

    sleep(0.5);
  });
}

export function setup() {
  console.log('='.repeat(60));
  console.log('STRESS TEST');
  console.log('='.repeat(60));
  console.log(`Target: ${BASE_URL}`);
  console.log('Purpose: Find system breaking point');
  console.log('');
  console.log('Load pattern:');
  console.log('  - Ramp to 10 VUs, hold 5 min');
  console.log('  - Ramp to 20 VUs, hold 5 min');
  console.log('  - Ramp to 30 VUs, hold 5 min (breaking point)');
  console.log('  - Ramp to 40 VUs, hold 5 min (beyond breaking point)');
  console.log('  - Ramp down to 0 (recovery)');
  console.log('='.repeat(60));

  return { startTime: new Date().toISOString() };
}

export function teardown(data) {
  console.log('');
  console.log('='.repeat(60));
  console.log('STRESS TEST COMPLETED');
  console.log('='.repeat(60));
  console.log(`Started: ${data.startTime}`);
  console.log(`Ended: ${new Date().toISOString()}`);
  console.log('');
  console.log('Check the results to identify:');
  console.log('  - At what point errors started occurring');
  console.log('  - Response time degradation pattern');
  console.log('  - System recovery behavior');
  console.log('='.repeat(60));
}
