import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

/**
 * Soak Test (Endurance Test) for ExitOSx API
 *
 * Purpose: Test system stability under sustained load over extended period
 * Identifies memory leaks, resource exhaustion, and degradation over time
 *
 * Run with: k6 run load-tests/soak-test.js
 * Note: This test runs for a long time (30+ minutes by default)
 */

// Custom metrics
const errorRate = new Rate('errors');
const apiDuration = new Trend('api_duration');
const requestsPerMinute = new Counter('requests_per_minute');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'https://staging.exitosx.com';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

// Soak test duration (can be overridden with --duration flag)
const SOAK_DURATION = __ENV.SOAK_DURATION || '30m';

export const options = {
  stages: [
    { duration: '2m', target: 15 },              // Ramp up
    { duration: SOAK_DURATION, target: 15 },     // Stay at steady load
    { duration: '2m', target: 0 },               // Ramp down
  ],

  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],  // Consistent performance
    http_req_failed: ['rate<0.02'],                    // Error rate < 2%
    errors: ['rate<0.05'],                             // Custom error rate < 5%
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
  group('Soak Test - Sustained Load', function() {
    // Simulate typical user workflow

    // 1. Get companies list
    const companiesRes = http.get(`${BASE_URL}/api/companies`, {
      headers: getHeaders(),
      tags: { name: 'companies' },
    });

    check(companiesRes, {
      'companies status OK': (r) => r.status === 200 || r.status === 401,
      'companies response time OK': (r) => r.timings.duration < 1000,
    }) || errorRate.add(1);

    apiDuration.add(companiesRes.timings.duration);
    requestsPerMinute.add(1);

    sleep(1);

    // 2. Get tasks
    const tasksRes = http.get(`${BASE_URL}/api/tasks`, {
      headers: getHeaders(),
      tags: { name: 'tasks' },
    });

    check(tasksRes, {
      'tasks status OK': (r) => r.status === 200 || r.status === 401 || r.status === 404,
      'tasks response time OK': (r) => r.timings.duration < 1000,
    }) || errorRate.add(1);

    apiDuration.add(tasksRes.timings.duration);
    requestsPerMinute.add(1);

    sleep(1);

    // 3. Get organizations
    const orgsRes = http.get(`${BASE_URL}/api/organizations`, {
      headers: getHeaders(),
      tags: { name: 'organizations' },
    });

    check(orgsRes, {
      'organizations status OK': (r) => r.status === 200 || r.status === 401 || r.status === 404,
      'organizations response time OK': (r) => r.timings.duration < 1000,
    }) || errorRate.add(1);

    apiDuration.add(orgsRes.timings.duration);
    requestsPerMinute.add(1);

    // Simulate user think time
    sleep(2 + Math.random() * 3); // 2-5 seconds
  });
}

export function setup() {
  console.log('='.repeat(60));
  console.log('SOAK TEST (ENDURANCE TEST)');
  console.log('='.repeat(60));
  console.log(`Target: ${BASE_URL}`);
  console.log(`Duration: ${SOAK_DURATION}`);
  console.log('Purpose: Test long-term stability');
  console.log('');
  console.log('What to monitor during this test:');
  console.log('  - Memory usage on the server');
  console.log('  - Database connection pool');
  console.log('  - Response time trends over time');
  console.log('  - Error rate stability');
  console.log('='.repeat(60));

  return { startTime: new Date().toISOString() };
}

export function teardown(data) {
  console.log('');
  console.log('='.repeat(60));
  console.log('SOAK TEST COMPLETED');
  console.log('='.repeat(60));
  console.log(`Started: ${data.startTime}`);
  console.log(`Ended: ${new Date().toISOString()}`);
  console.log('');
  console.log('Post-test analysis:');
  console.log('  - Compare start vs end response times');
  console.log('  - Check for memory leaks in server logs');
  console.log('  - Review error patterns over time');
  console.log('  - Verify no degradation in response times');
  console.log('='.repeat(60));
}
