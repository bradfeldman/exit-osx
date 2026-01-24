import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

/**
 * API Load Test for ExitOSx
 *
 * Run with: k6 run load-tests/api-load-test.js
 *
 * Environment variables:
 *   BASE_URL - API base URL (default: https://staging.exitosx.com)
 *   AUTH_TOKEN - Authentication token for API requests
 */

// Custom metrics
const errorRate = new Rate('errors');
const apiDuration = new Trend('api_duration');
const successfulRequests = new Counter('successful_requests');
const failedRequests = new Counter('failed_requests');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'https://staging.exitosx.com';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

// Test options - Load test configuration
export const options = {
  // Scenarios for different load patterns
  scenarios: {
    // Smoke test - verify system works under minimal load
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '30s',
      tags: { test_type: 'smoke' },
      exec: 'smokeTest',
    },
    // Load test - normal expected load
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 10 },   // Ramp up to 10 users
        { duration: '3m', target: 10 },   // Stay at 10 users
        { duration: '1m', target: 20 },   // Ramp up to 20 users
        { duration: '3m', target: 20 },   // Stay at 20 users
        { duration: '1m', target: 0 },    // Ramp down to 0
      ],
      tags: { test_type: 'load' },
      exec: 'loadTest',
      startTime: '35s', // Start after smoke test
    },
  },

  // Thresholds - pass/fail criteria
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],  // 95% of requests < 500ms
    http_req_failed: ['rate<0.01'],                   // Error rate < 1%
    errors: ['rate<0.05'],                            // Custom error rate < 5%
    'http_req_duration{name:companies}': ['p(95)<300'],
    'http_req_duration{name:tasks}': ['p(95)<500'],
  },
};

// Headers for authenticated requests
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

// Smoke test - basic functionality verification
export function smokeTest() {
  group('Smoke Test', function() {
    // Test health/status endpoint
    const healthRes = http.get(`${BASE_URL}/api/health`, {
      headers: getHeaders(),
      tags: { name: 'health' },
    });

    check(healthRes, {
      'health check status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    });

    // Test companies endpoint
    const companiesRes = http.get(`${BASE_URL}/api/companies`, {
      headers: getHeaders(),
      tags: { name: 'companies' },
    });

    const companiesOk = check(companiesRes, {
      'companies status is 200 or 401': (r) => r.status === 200 || r.status === 401,
      'companies response time < 500ms': (r) => r.timings.duration < 500,
    });

    if (companiesOk) {
      successfulRequests.add(1);
    } else {
      failedRequests.add(1);
      errorRate.add(1);
    }

    apiDuration.add(companiesRes.timings.duration);

    sleep(1);
  });
}

// Load test - simulate normal traffic patterns
export function loadTest() {
  group('API Endpoints', function() {
    // Companies API
    group('Companies', function() {
      const res = http.get(`${BASE_URL}/api/companies`, {
        headers: getHeaders(),
        tags: { name: 'companies' },
      });

      const success = check(res, {
        'companies status is 200': (r) => r.status === 200,
        'companies response time OK': (r) => r.timings.duration < 500,
        'companies has data': (r) => {
          if (r.status === 200) {
            try {
              const body = JSON.parse(r.body);
              return body.companies !== undefined;
            } catch (e) {
              return false;
            }
          }
          return true; // Skip check if unauthorized
        },
      });

      if (success) {
        successfulRequests.add(1);
      } else {
        failedRequests.add(1);
        errorRate.add(1);
      }

      apiDuration.add(res.timings.duration);
    });

    sleep(0.5);

    // Tasks API (if company ID is available)
    group('Tasks', function() {
      // This would need a valid company ID in a real scenario
      const res = http.get(`${BASE_URL}/api/tasks`, {
        headers: getHeaders(),
        tags: { name: 'tasks' },
      });

      const success = check(res, {
        'tasks status is 200 or 401 or 404': (r) =>
          r.status === 200 || r.status === 401 || r.status === 404,
        'tasks response time OK': (r) => r.timings.duration < 500,
      });

      if (success) {
        successfulRequests.add(1);
      } else {
        failedRequests.add(1);
        errorRate.add(1);
      }

      apiDuration.add(res.timings.duration);
    });

    sleep(0.5);

    // Organizations API
    group('Organizations', function() {
      const res = http.get(`${BASE_URL}/api/organizations`, {
        headers: getHeaders(),
        tags: { name: 'organizations' },
      });

      const success = check(res, {
        'organizations status is valid': (r) =>
          r.status === 200 || r.status === 401 || r.status === 404,
        'organizations response time OK': (r) => r.timings.duration < 500,
      });

      if (success) {
        successfulRequests.add(1);
      } else {
        failedRequests.add(1);
        errorRate.add(1);
      }

      apiDuration.add(res.timings.duration);
    });

    sleep(1);
  });
}

// Default function (runs if no specific scenario is selected)
export default function() {
  loadTest();
}

// Setup function - runs once at the start
export function setup() {
  console.log(`Starting load test against: ${BASE_URL}`);
  console.log(`Auth token provided: ${AUTH_TOKEN ? 'Yes' : 'No'}`);

  // Verify the API is reachable
  const res = http.get(`${BASE_URL}/api/companies`, {
    headers: getHeaders(),
  });

  if (res.status !== 200 && res.status !== 401) {
    console.log(`Warning: Initial API check returned status ${res.status}`);
  }

  return { baseUrl: BASE_URL };
}

// Teardown function - runs once at the end
export function teardown(data) {
  console.log('Load test completed');
  console.log(`Tested against: ${data.baseUrl}`);
}
