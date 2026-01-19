import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * Smoke Test for ExitOSx API
 *
 * Purpose: Quick sanity check that the API is functioning
 * Run before other load tests to verify basic connectivity
 *
 * Run with: k6 run load-tests/smoke-test.js
 */

const BASE_URL = __ENV.BASE_URL || 'https://staging.exitosx.com';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    // Note: http_req_failed counts 401 as failure, so we track via checks instead
    'checks': ['rate>0.95'],  // 95% of checks must pass
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
  // Test companies endpoint
  const companiesRes = http.get(`${BASE_URL}/api/companies`, {
    headers: getHeaders(),
  });

  check(companiesRes, {
    'companies endpoint responds': (r) => r.status !== 0,
    'companies status is valid': (r) => r.status === 200 || r.status === 401,
    'companies response time OK': (r) => r.timings.duration < 1000,
  });

  sleep(1);

  // Test tasks endpoint
  const tasksRes = http.get(`${BASE_URL}/api/tasks`, {
    headers: getHeaders(),
  });

  check(tasksRes, {
    'tasks endpoint responds': (r) => r.status !== 0,
    'tasks status is valid': (r) => r.status === 200 || r.status === 401 || r.status === 404,
    'tasks response time OK': (r) => r.timings.duration < 1000,
  });

  sleep(1);
}

export function setup() {
  console.log('='.repeat(50));
  console.log('SMOKE TEST');
  console.log('='.repeat(50));
  console.log(`Testing: ${BASE_URL}`);
  console.log(`Auth: ${AUTH_TOKEN ? 'Provided' : 'None'}`);
  console.log('='.repeat(50));
}

export function teardown() {
  console.log('');
  console.log('='.repeat(50));
  console.log('SMOKE TEST COMPLETE');
  console.log('='.repeat(50));
}
